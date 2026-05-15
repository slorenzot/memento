import type { SyncObservation, SyncConflictResult } from './types.js';

/**
 * Conflict resolution for sync — last-write-wins strategy.
 *
 * A conflict occurs when the same UUID exists on both local and remote
 * AND both have been modified since the last sync.
 * Resolution: the observation with the latest `updatedAt` wins.
 */
export function resolveConflict(
  local: SyncObservation,
  remote: SyncObservation,
): SyncConflictResult {
  if (local.updatedAt >= remote.updatedAt) {
    return {
      uuid: local.uuid,
      resolution: 'local-wins',
      localUpdatedAt: local.updatedAt,
      remoteUpdatedAt: remote.updatedAt,
    };
  }

  return {
    uuid: remote.uuid,
    resolution: 'remote-wins',
    localUpdatedAt: local.updatedAt,
    remoteUpdatedAt: remote.updatedAt,
  };
}

/**
 * Detect which remote observations conflict with local ones.
 * A conflict means the same UUID exists on both sides with different content.
 *
 * Returns: arrays of conflicts and non-conflicting remote observations.
 */
export function detectConflicts(
  remoteObservations: SyncObservation[],
  localByUuid: Map<string, SyncObservation>,
): {
  conflicts: Array<{ local: SyncObservation; remote: SyncObservation }>;
  newRemote: SyncObservation[];
  unchanged: SyncObservation[];
} {
  const conflicts: Array<{ local: SyncObservation; remote: SyncObservation }> = [];
  const newRemote: SyncObservation[] = [];
  const unchanged: SyncObservation[] = [];

  for (const remote of remoteObservations) {
    const local = localByUuid.get(remote.uuid);

    if (!local) {
      // Not present locally → new from remote, no conflict
      newRemote.push(remote);
      continue;
    }

    // Same UUID exists locally — check if content differs
    if (
      local.title === remote.title &&
      local.content === remote.content &&
      local.type === remote.type &&
      local.topicKey === remote.topicKey &&
      local.projectId === remote.projectId &&
      local.scope === remote.scope &&
      local.pinned === remote.pinned &&
      local.readOnly === remote.readOnly &&
      local.deletedAt === remote.deletedAt
    ) {
      // Content is identical — no conflict, skip
      unchanged.push(remote);
      continue;
    }

    // Content differs — conflict
    conflicts.push({ local, remote });
  }

  return { conflicts, newRemote, unchanged };
}

/**
 * Resolve all conflicts and return the winning observation for each.
 */
export function resolveAllConflicts(
  conflicts: Array<{ local: SyncObservation; remote: SyncObservation }>,
): { resolutions: SyncConflictResult; winner: SyncObservation }[] {
  return conflicts.map(({ local, remote }) => {
    const resolution = resolveConflict(local, remote);
    const winner = resolution.resolution === 'local-wins' ? local : remote;
    return { resolutions: resolution, winner };
  });
}
