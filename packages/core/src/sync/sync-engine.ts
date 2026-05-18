import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import type { MemoryEngine } from '../MemoryEngine.js';
import type { Observation } from '../types.js';
import type {
  SyncConfig,
  SyncMeta,
  SyncResult,
  SyncMemento,
  SyncStatusResponse,
} from './types.js';
import { SyncClient } from './sync-client.js';
import { resolveAllConflicts } from './conflict-resolution.js';
import { TokenStore } from '../auth/token-store.js';

const DEFAULT_META_PATH = path.join(os.homedir(), '.memento', 'sync-meta.json');

/**
 * SyncEngine — orchestrates bidirectional sync between local DB and memento-web.
 *
 * Protocol: cursor-based, version-tracked, last-write-wins
 *
 * Flow:
 * 1. Pull: fetch remote changes since cursor
 * 2. Apply remote changes locally
 * 3. Push: send local changes since last sync (scope=project only)
 * 4. Save new cursor
 */
export class SyncEngine {
  private config: SyncConfig;
  private metaPath: string;
  private client: SyncClient;
  private tokenStore: TokenStore;
  private deviceFingerprint: string;

  constructor(config: SyncConfig) {
    this.config = config;
    this.metaPath = config.metaFilePath || DEFAULT_META_PATH;
    this.tokenStore = new TokenStore();
    this.deviceFingerprint = generateDeviceFingerprint();

    this.client = new SyncClient({
      serverUrl: config.serverUrl,
      getToken: () => {
        const t = this.tokenStore.getToken();
        return Promise.resolve(t?.accessToken ?? null);
      },
      fetchFunction: config.fetchFunction,
    });
  }

  /**
   * Full bidirectional sync.
   */
  async sync(engine: MemoryEngine): Promise<SyncResult> {
    const start = Date.now();
    const meta = this.loadMeta();

    // Pull first
    const pullResult = await this.doPull(engine, meta.lastCursor);

    // Then push
    const pushResult = await this.doPush(engine, meta.lastCursor);

    // Save meta with new cursor
    const newCursor = pullResult.newCursor || pushResult.newCursor || meta.lastCursor;
    this.saveMeta({
      lastSyncAt: Date.now(),
      lastSyncDirection: 'bidirectional',
      lastCursor: newCursor,
      lastPullCount: pullResult.applied,
      lastPushCount: pushResult.pushed,
      lastConflictCount: pullResult.conflicts.length + pushResult.conflicts.length,
      serverUrl: this.config.serverUrl,
      updatedAt: Date.now(),
    });

    return {
      direction: 'bidirectional',
      pulled: pullResult.applied,
      pushed: pushResult.pushed,
      conflicts: [...pullResult.conflicts, ...pushResult.conflicts],
      errors: [...pullResult.errors, ...pushResult.errors],
      durationMs: Date.now() - start,
    };
  }

  /**
   * Pull-only: download remote changes to local DB.
   */
  async pull(engine: MemoryEngine): Promise<SyncResult> {
    const start = Date.now();
    const meta = this.loadMeta();
    const result = await this.doPull(engine, meta.lastCursor);

    this.saveMeta({
      lastSyncAt: Date.now(),
      lastSyncDirection: 'pull',
      lastCursor: result.newCursor || meta.lastCursor,
      lastPullCount: result.applied,
      lastPushCount: 0,
      lastConflictCount: result.conflicts.length,
      serverUrl: this.config.serverUrl,
      updatedAt: Date.now(),
    });

    return {
      direction: 'pull',
      pulled: result.applied,
      pushed: 0,
      conflicts: result.conflicts,
      errors: result.errors,
      durationMs: Date.now() - start,
    };
  }

  /**
   * Push-only: upload local changes to server.
   */
  async push(engine: MemoryEngine): Promise<SyncResult> {
    const start = Date.now();
    const meta = this.loadMeta();
    const result = await this.doPush(engine, meta.lastCursor);

    this.saveMeta({
      lastSyncAt: Date.now(),
      lastSyncDirection: 'push',
      lastCursor: result.newCursor || meta.lastCursor,
      lastPullCount: 0,
      lastPushCount: result.pushed,
      lastConflictCount: result.conflicts.length,
      serverUrl: this.config.serverUrl,
      updatedAt: Date.now(),
    });

    return {
      direction: 'push',
      pulled: 0,
      pushed: result.pushed,
      conflicts: result.conflicts,
      errors: result.errors,
      durationMs: Date.now() - start,
    };
  }

  /**
   * Get sync status.
   */
  async getStatus(engine: MemoryEngine): Promise<{
    meta: SyncMeta | null;
    remote?: SyncStatusResponse;
    local: { totalObservations: number; activeObservations: number };
    authenticated: boolean;
  }> {
    const meta = this.loadMeta();
    const token = this.tokenStore.getToken();
    const authenticated = !!token;

    // Local stats
    const localActive = (await engine.search({ projectId: this.config.projectId, limit: 0 })).total;
    const localDeleted = (await engine.listDeleted({ limit: 0 })).total;

    let remote: SyncStatusResponse | undefined;

    if (authenticated) {
      try {
        remote = await this.client.status(this.config.projectId);
      } catch {
        // Remote unreachable
      }
    }

    return {
      meta: meta.lastSyncAt ? meta : null,
      remote,
      local: { totalObservations: localActive + localDeleted, activeObservations: localActive },
      authenticated,
    };
  }

  // ── Internal ────────────────────────────────────────────────

  private async doPull(
    engine: MemoryEngine,
    cursor: string | null,
  ): Promise<{ applied: number; conflicts: any[]; errors: string[]; newCursor: string }> {
    const errors: string[] = [];
    const conflicts: any[] = [];

    let hasMore = true;
    let totalApplied = 0;
    let latestCursor = cursor;

    // Paginated pull
    while (hasMore) {
      const response = await this.client.pull({
        projectId: this.config.projectId,
        cursor: latestCursor,
        limit: 100,
      });

      for (const change of response.changes) {
        try {
          await this.applyToLocal(engine, change);
          totalApplied++;
        } catch (err) {
          errors.push(`Failed to apply ${change.uuid}: ${err}`);
        }
      }

      latestCursor = response.newCursor;
      hasMore = response.hasMore;
    }

    return { applied: totalApplied, conflicts, errors, newCursor: latestCursor || '' };
  }

  private async doPush(
    engine: MemoryEngine,
    cursor: string | null,
  ): Promise<{ pushed: number; conflicts: any[]; errors: string[]; newCursor: string }> {
    // Get local observations with scope=project (personal stays local)
    const active = await engine.search({
      projectId: this.config.projectId,
      limit: 100000,
    });

    const deleted = await engine.listDeleted({
      projectId: this.config.projectId,
      limit: 100000,
    });

    const all = [...active.observations, ...deleted.observations];

    // All items (project + personal scope) get pushed
    // Filter: only items modified since cursor
    let itemsToSync = all;
    if (cursor) {
      const cursorDate = new Date(cursor);
      itemsToSync = all.filter(obs => obs.updatedAt > cursorDate);
    }

    if (itemsToSync.length === 0) {
      return { pushed: 0, conflicts: [], errors: [], newCursor: cursor || '' };
    }

    // Convert to SyncMemento wire format
    const items = itemsToSync.map(obs => this.observationToMemento(obs));

    const result = await this.client.push({
      projectId: this.config.projectId,
      cursor,
      deviceFingerprint: this.deviceFingerprint,
      clientVersion: '1.0.0',
      items,
    });

    // Handle conflicts — apply server data for server_wins
    for (const conflict of result.conflicts) {
      if (conflict.resolution === 'server_wins' && conflict.serverData) {
        try {
          await this.applyToLocal(engine, conflict.serverData);
        } catch (err) {
          // Best effort
        }
      }
    }

    return {
      pushed: result.synced,
      conflicts: result.conflicts,
      errors: [],
      newCursor: result.newCursor,
    };
  }

  /**
   * Apply a SyncMemento to the local DB.
   */
  private async applyToLocal(engine: MemoryEngine, memento: SyncMemento): Promise<void> {
    const existing = engine.getObservationByUuid(memento.uuid);

    if (existing) {
      if (existing.readOnly) return;
      await engine.updateObservation(existing.id, {
        title: memento.title,
        content: memento.content,
        type: memento.type as Observation['type'],
        topicKey: memento.topicKey,
        metadata: memento.metadata,
        pinned: memento.pinned,
        readOnly: memento.readOnly,
      });
    } else {
      // Find or create session
      const sessions = await engine.listSessions({
        projectId: memento.projectId,
        limit: 1,
        activeOnly: false,
      });

      let sessionId: number;
      if (sessions.sessions.length > 0) {
        sessionId = sessions.sessions[0].id;
      } else {
        const session = await engine.createSession({
          projectId: memento.projectId,
          endedAt: null,
          metadata: { source: 'sync', syncedAt: Date.now() },
        });
        sessionId = session.id;
      }

      await engine.createObservation({
        sessionId,
        title: memento.title,
        content: memento.content,
        type: memento.type as Observation['type'],
        topicKey: memento.topicKey,
        projectId: memento.projectId,
        scope: memento.scope,
        pinned: memento.pinned,
        readOnly: memento.readOnly,
        metadata: { ...memento.metadata, syncedUuid: memento.uuid },
      });
    }
  }

  /**
   * Convert a local Observation to a SyncMemento for the wire.
   */
  private observationToMemento(obs: Observation): SyncMemento {
    return {
      uuid: obs.uuid,
      title: obs.title,
      content: obs.content,
      type: obs.type,
      topicKey: obs.topicKey,
      scope: obs.scope,
      pinned: obs.pinned,
      readOnly: obs.readOnly,
      revisionCount: obs.revisionCount,
      projectId: obs.projectId,
      metadata: obs.metadata,
      localCreatedAt: obs.createdAt.toISOString(),
      localUpdatedAt: obs.updatedAt.toISOString(),
      version: obs.revisionCount + 1, // Version = revisionCount + 1 (first version is 1)
      deletedAt: obs.deletedAt ? obs.deletedAt.toISOString() : null,
    };
  }

  // ── Sync Meta Persistence ────────────────────────────────────

  loadMeta(): SyncMeta {
    try {
      if (fs.existsSync(this.metaPath)) {
        const raw = fs.readFileSync(this.metaPath, 'utf-8');
        return JSON.parse(raw) as SyncMeta;
      }
    } catch {
      // Corrupted — start fresh
    }

    return {
      lastSyncAt: null,
      lastSyncDirection: null,
      lastCursor: null,
      lastPullCount: 0,
      lastPushCount: 0,
      lastConflictCount: 0,
      serverUrl: this.config.serverUrl,
      updatedAt: Date.now(),
    };
  }

  saveMeta(meta: SyncMeta): void {
    const dir = path.dirname(this.metaPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.metaPath, JSON.stringify(meta, null, 2), 'utf-8');
  }
}

/** Generate a stable device fingerprint based on hostname + username */
function generateDeviceFingerprint(): string {
  const hostname = os.hostname();
  const username = os.userInfo().username;
  return crypto.createHash('sha256').update(`${hostname}:${username}`).digest('hex').slice(0, 16);
}
