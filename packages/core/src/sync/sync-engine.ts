import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { MemoryEngine } from '../MemoryEngine.js';
import type { Observation } from '../types.js';
import type {
  SyncConfig,
  SyncMeta,
  SyncResult,
  SyncObservation,
  SyncConflictResult,
  SyncPullResponse,
} from './types.js';
import { SyncClient } from './sync-client.js';
import { detectConflicts, resolveAllConflicts } from './conflict-resolution.js';
import { TokenStore } from '../auth/token-store.js';

const DEFAULT_META_PATH = path.join(os.homedir(), '.memento', 'sync-meta.json');

/**
 * SyncEngine — orchestrates bidirectional sync between local DB and remote server.
 *
 * Flow:
 * 1. Load sync meta (last sync timestamp)
 * 2. Pull: fetch remote observations modified since last sync
 * 3. Merge: resolve conflicts (last-write-wins)
 * 4. Push: send local observations modified since last sync
 * 5. Save updated sync meta
 */
export class SyncEngine {
  private config: SyncConfig;
  private metaPath: string;
  private client: SyncClient;
  private tokenStore: TokenStore;

  constructor(config: SyncConfig) {
    this.config = config;
    this.metaPath = config.metaFilePath || DEFAULT_META_PATH;
    this.tokenStore = new TokenStore();

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

    // Pull first, then push
    const pullResult = await this.doPull(engine, meta.lastSyncServerTime);
    const pushResult = await this.doPush(engine, meta.lastSyncServerTime);

    // Save updated meta
    const newMeta: SyncMeta = {
      lastSyncAt: Date.now(),
      lastSyncDirection: 'bidirectional',
      lastSyncServerTime: pullResult.serverTime,
      lastPullCount: pullResult.applied,
      lastPushCount: pushResult.accepted,
      lastConflictCount: pullResult.conflicts.length + pushResult.conflicts.length,
      serverUrl: this.config.serverUrl,
      updatedAt: Date.now(),
    };
    this.saveMeta(newMeta);

    const allConflicts = [...pullResult.conflicts, ...pushResult.conflicts];
    const allErrors = [...pullResult.errors, ...pushResult.errors];

    return {
      direction: 'bidirectional',
      pulled: pullResult.applied,
      pushed: pushResult.accepted,
      conflicts: allConflicts,
      errors: allErrors,
      durationMs: Date.now() - start,
    };
  }

  /**
   * Pull-only: download remote observations to local DB.
   */
  async pull(engine: MemoryEngine): Promise<SyncResult> {
    const start = Date.now();
    const meta = this.loadMeta();
    const result = await this.doPull(engine, meta.lastSyncServerTime);

    this.saveMeta({
      lastSyncAt: Date.now(),
      lastSyncDirection: 'pull',
      lastSyncServerTime: result.serverTime,
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
   * Push-only: upload local observations to remote server.
   */
  async push(engine: MemoryEngine): Promise<SyncResult> {
    const start = Date.now();
    const meta = this.loadMeta();
    const result = await this.doPush(engine, meta.lastSyncServerTime);

    this.saveMeta({
      lastSyncAt: Date.now(),
      lastSyncDirection: 'push',
      lastSyncServerTime: meta.lastSyncServerTime,
      lastPullCount: 0,
      lastPushCount: result.accepted,
      lastConflictCount: result.conflicts.length,
      serverUrl: this.config.serverUrl,
      updatedAt: Date.now(),
    });

    return {
      direction: 'push',
      pulled: 0,
      pushed: result.accepted,
      conflicts: result.conflicts,
      errors: result.errors,
      durationMs: Date.now() - start,
    };
  }

  /**
   * Get sync status — local meta + remote status.
   */
  async getStatus(engine: MemoryEngine): Promise<{
    meta: SyncMeta | null;
    remote?: { totalObservations: number; activeObservations: number };
    local: { totalObservations: number; activeObservations: number };
    authenticated: boolean;
  }> {
    const meta = this.loadMeta();
    const token = await this.tokenStore.getToken();
    const authenticated = !!token;

    // Local stats
    const localActiveResult = await engine.search({
      projectId: this.config.projectId,
      limit: 0,
    });
    const localActive = localActiveResult.total;

    const localDeletedResult = await engine.listDeleted({ limit: 0 });
    const localDeleted = localDeletedResult.total;
    const localTotal = localActive + localDeleted;

    let remote: { totalObservations: number; activeObservations: number } | undefined;

    if (authenticated) {
      try {
        const remoteStatus = await this.client.status(this.config.projectId);
        remote = {
          totalObservations: remoteStatus.totalObservations,
          activeObservations: remoteStatus.activeObservations,
        };
      } catch {
        // Remote unreachable — still return local info
      }
    }

    return {
      meta: meta.lastSyncAt ? meta : null,
      remote,
      local: { totalObservations: localTotal, activeObservations: localActive },
      authenticated,
    };
  }

  // ── Internal Methods ────────────────────────────────────────

  private async doPull(
    engine: MemoryEngine,
    since: number | null,
  ): Promise<{
    applied: number;
    conflicts: SyncConflictResult[];
    errors: string[];
    serverTime: number;
  }> {
    const errors: string[] = [];
    const conflicts: SyncConflictResult[] = [];

    // Fetch remote observations
    const response = await this.client.pull(since, this.config.projectId);

    // Build local UUID map for conflict detection
    const localByUuid = await this.buildLocalUuidMap(engine);

    // Detect conflicts
    const { conflicts: detectedConflicts, newRemote } = detectConflicts(
      response.observations,
      localByUuid,
    );

    // Resolve conflicts
    const resolved = resolveAllConflicts(detectedConflicts);
    for (const { resolutions, winner } of resolved) {
      conflicts.push(resolutions);
      try {
        await this.applyToLocal(engine, winner);
      } catch (err) {
        errors.push(`Conflict resolution failed for ${winner.uuid}: ${err}`);
      }
    }

    // Apply new remote observations
    let applied = resolved.length; // Conflicts resolved count as applied
    for (const obs of newRemote) {
      try {
        await this.applyToLocal(engine, obs);
        applied++;
      } catch (err) {
        errors.push(`Failed to pull ${obs.uuid}: ${err}`);
      }
    }

    return { applied, conflicts, errors, serverTime: response.serverTime };
  }

  private async doPush(
    engine: MemoryEngine,
    since: number | null,
  ): Promise<{ accepted: number; conflicts: SyncConflictResult[]; errors: string[] }> {
    const localObs = await this.getLocalModifiedSince(engine, since);

    if (localObs.length === 0) {
      return { accepted: 0, conflicts: [], errors: [] };
    }

    const syncObs = localObs.map(obs => this.observationToSync(obs));

    const result = await this.client.push({ observations: syncObs });
    return {
      accepted: result.accepted,
      conflicts: result.conflicts,
      errors: result.errors,
    };
  }

  /**
   * Build a Map of local observations keyed by UUID for conflict detection.
   */
  private async buildLocalUuidMap(engine: MemoryEngine): Promise<Map<string, SyncObservation>> {
    const map = new Map<string, SyncObservation>();

    // Get all observations (including deleted for sync)
    const active = await engine.search({
      projectId: this.config.projectId,
      limit: 100000,
    });

    for (const obs of active.observations) {
      map.set(obs.uuid, this.observationToSync(obs));
    }

    // Include soft-deleted
    const deleted = await engine.listDeleted({
      projectId: this.config.projectId,
      limit: 100000,
    });

    for (const obs of deleted.observations) {
      map.set(obs.uuid, this.observationToSync(obs));
    }

    return map;
  }

  /**
   * Get local observations modified since a given timestamp.
   */
  private async getLocalModifiedSince(engine: MemoryEngine, since: number | null): Promise<Observation[]> {
    const active = await engine.search({
      projectId: this.config.projectId,
      limit: 100000,
    });

    const deleted = await engine.listDeleted({
      projectId: this.config.projectId,
      limit: 100000,
    });

    const all = [...active.observations, ...deleted.observations];

    if (since === null) {
      return all;
    }

    // Filter by updatedAt
    return all.filter(obs => obs.updatedAt.getTime() > since);
  }

  /**
   * Apply a sync observation to the local DB.
   * If UUID exists → update. If not → insert.
   */
  private async applyToLocal(engine: MemoryEngine, sync: SyncObservation): Promise<void> {
    const existing = engine.getObservationByUuid(sync.uuid);

    if (existing) {
      // Update existing observation (skip if read-only)
      if (existing.readOnly) return;
      await engine.updateObservation(existing.id, {
        title: sync.title,
        content: sync.content,
        type: sync.type as Observation['type'],
        topicKey: sync.topicKey,
        metadata: sync.metadata,
        pinned: sync.pinned,
        readOnly: sync.readOnly,
      });
    } else {
      // Insert new observation — find or create a session
      const sessions = await engine.listSessions({
        projectId: sync.projectId,
        limit: 1,
        activeOnly: false,
      });

      let sessionId: number;
      if (sessions.sessions.length > 0) {
        sessionId = sessions.sessions[0].id;
      } else {
        const session = await engine.createSession({
          projectId: sync.projectId,
          endedAt: null,
          metadata: { source: 'sync', syncedAt: Date.now() },
        });
        sessionId = session.id;
      }

      await engine.createObservation({
        sessionId,
        title: sync.title,
        content: sync.content,
        type: sync.type as Observation['type'],
        topicKey: sync.topicKey,
        projectId: sync.projectId,
        scope: sync.scope,
        pinned: sync.pinned,
        readOnly: sync.readOnly,
        metadata: { ...sync.metadata, syncedFrom: sync.uuid },
      });
    }
  }

  /**
   * Convert an Observation to a SyncObservation.
   */
  private observationToSync(obs: Observation): SyncObservation {
    return {
      uuid: obs.uuid,
      title: obs.title,
      content: obs.content,
      type: obs.type,
      topicKey: obs.topicKey,
      projectId: obs.projectId,
      scope: obs.scope,
      pinned: obs.pinned,
      readOnly: obs.readOnly,
      revisionCount: obs.revisionCount,
      createdAt: obs.createdAt.getTime(),
      updatedAt: obs.updatedAt.getTime(),
      deletedAt: obs.deletedAt ? obs.deletedAt.getTime() : null,
      metadata: obs.metadata,
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
      // Corrupted meta — start fresh
    }

    return {
      lastSyncAt: null,
      lastSyncDirection: null,
      lastSyncServerTime: null,
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
