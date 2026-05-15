// ─── Sync Types — Memento v1 Protocol ──────────────────────────
// Matches memento-web/src/types/sync.ts

/** Sync direction */
export type SyncDirection = 'pull' | 'push' | 'bidirectional';

/**
 * A memento item as transferred over the wire.
 * Matches memento-web SyncMemento exactly.
 */
export interface SyncMemento {
  uuid: string;
  title: string;
  content: string;
  type: string;
  topicKey: string | null;
  scope: 'project' | 'personal';
  pinned: boolean;
  readOnly: boolean;
  revisionCount: number;
  projectId: string;
  metadata: Record<string, unknown>;
  localCreatedAt: string; // ISO string
  localUpdatedAt: string; // ISO string
  version: number;
  deletedAt: string | null; // ISO string
}

/** Push request body — matches memento-web SyncPushRequest */
export interface SyncPushRequest {
  projectId: string;
  cursor: string | null;
  deviceFingerprint?: string;
  clientVersion?: string;
  items: SyncMemento[];
}

/** Push response from memento-web */
export interface SyncPushResponse {
  synced: number;
  created: number;
  updated: number;
  conflicts: SyncConflict[];
  newCursor: string;
}

/** Pull response from memento-web */
export interface SyncPullResponse {
  changes: SyncMemento[];
  hasMore: boolean;
  totalChanges: number;
  newCursor: string;
}

/** Pull query params */
export interface SyncPullParams {
  projectId: string;
  cursor: string | null;
  limit?: number;
}

/** Conflict during push */
export interface SyncConflict {
  uuid: string;
  localVersion: number;
  serverVersion: number;
  resolution: 'client_wins' | 'server_wins';
  serverData?: SyncMemento;
}

/** Status response from memento-web */
export interface SyncStatusResponse {
  projectId: string;
  lastSyncAt: string | null;
  totalMementos: number;
  pendingChanges: number | null;
  conflicts: number;
  device: {
    fingerprint: string;
    lastSyncAt: string | null;
  } | null;
}

/** Sync metadata persisted locally */
export interface SyncMeta {
  lastSyncAt: number | null;        // Unix epoch ms
  lastSyncDirection: SyncDirection | null;
  lastCursor: string | null;        // Server cursor for incremental sync
  lastPullCount: number;
  lastPushCount: number;
  lastConflictCount: number;
  serverUrl: string;
  updatedAt: number;
}

/** Result of a sync operation */
export interface SyncResult {
  direction: SyncDirection;
  pulled: number;
  pushed: number;
  conflicts: SyncConflict[];
  errors: string[];
  durationMs: number;
}

/** Configuration for the sync engine */
export interface SyncConfig {
  serverUrl: string;
  projectId: string;
  fetchFunction?: typeof fetch;
  metaFilePath?: string;
}

/** HTTP error from sync API */
export class SyncApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public body?: string,
  ) {
    super(message);
    this.name = 'SyncApiError';
  }
}
