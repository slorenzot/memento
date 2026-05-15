// ─── Sync Types ─────────────────────────────────────────────────

/** Sync direction */
export type SyncDirection = 'pull' | 'push' | 'bidirectional';

/** Observation data for sync transport (DB-agnostic) */
export interface SyncObservation {
  uuid: string;
  title: string;
  content: string;
  type: string;
  topicKey: string | null;
  projectId: string;
  scope: 'project' | 'personal';
  pinned: boolean;
  readOnly: boolean;
  revisionCount: number;
  createdAt: number;   // Unix epoch ms
  updatedAt: number;   // Unix epoch ms
  deletedAt: number | null; // Unix epoch ms
  metadata: Record<string, unknown>;
}

/** Response from GET /api/sync/pull */
export interface SyncPullResponse {
  observations: SyncObservation[];
  serverTime: number; // Server's current time (for next sync)
}

/** Request body for POST /api/sync/push */
export interface SyncPushRequest {
  observations: SyncObservation[];
}

/** Response from POST /api/sync/push */
export interface SyncPushResponse {
  accepted: number;
  conflicts: SyncConflictResult[];
  errors: string[];
}

/** Result of a single conflict resolution */
export interface SyncConflictResult {
  uuid: string;
  resolution: 'local-wins' | 'remote-wins';
  localUpdatedAt: number;
  remoteUpdatedAt: number;
}

/** Response from GET /api/sync/status */
export interface SyncStatusResponse {
  totalObservations: number;
  activeObservations: number;
  deletedObservations: number;
  lastModifiedAt: number | null;
}

/** Sync metadata persisted locally */
export interface SyncMeta {
  lastSyncAt: number | null;     // Unix epoch ms — timestamp of last successful sync
  lastSyncDirection: SyncDirection | null;
  lastSyncServerTime: number | null; // Server time at last sync
  lastPullCount: number;
  lastPushCount: number;
  lastConflictCount: number;
  serverUrl: string;
  updatedAt: number; // When this meta was last saved
}

/** Result of a sync operation */
export interface SyncResult {
  direction: SyncDirection;
  pulled: number;
  pushed: number;
  conflicts: SyncConflictResult[];
  errors: string[];
  durationMs: number;
}

/** Configuration for the sync engine */
export interface SyncConfig {
  /** Server URL (e.g. 'https://memento.example.com') */
  serverUrl: string;
  /** Optional project filter — only sync observations for this project */
  projectId?: string;
  /** Custom fetch function for testing */
  fetchFunction?: typeof fetch;
  /** Path to sync metadata file (default: ~/.memento/sync-meta.json) */
  metaFilePath?: string;
}

/** HTTP error from sync API */
export class SyncApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: string,
  ) {
    super(message);
    this.name = 'SyncApiError';
  }
}
