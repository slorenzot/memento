import type { SyncMemento, SyncConflict } from './types.js';

/**
 * Conflict resolution for sync — last-write-wins strategy.
 *
 * Compares localUpdatedAt timestamps to determine winner.
 */
export function resolveConflict(
  local: SyncMemento,
  remote: SyncMemento,
): SyncConflict {
  const localTime = new Date(local.localUpdatedAt).getTime();
  const remoteTime = new Date(remote.localUpdatedAt).getTime();

  if (localTime >= remoteTime) {
    return {
      uuid: local.uuid,
      localVersion: local.version,
      serverVersion: remote.version,
      resolution: 'client_wins',
    };
  }

  return {
    uuid: remote.uuid,
    localVersion: local.version,
    serverVersion: remote.version,
    resolution: 'server_wins',
    serverData: remote,
  };
}

/**
 * Detect which remote mementos conflict with local ones.
 */
export function detectConflicts(
  remoteMementos: SyncMemento[],
  localByUuid: Map<string, SyncMemento>,
): {
  conflicts: Array<{ local: SyncMemento; remote: SyncMemento }>;
  newRemote: SyncMemento[];
  unchanged: SyncMemento[];
} {
  const conflicts: Array<{ local: SyncMemento; remote: SyncMemento }> = [];
  const newRemote: SyncMemento[] = [];
  const unchanged: SyncMemento[] = [];

  for (const remote of remoteMementos) {
    const local = localByUuid.get(remote.uuid);

    if (!local) {
      newRemote.push(remote);
      continue;
    }

    // Check if content is identical
    if (
      local.title === remote.title &&
      local.content === remote.content &&
      local.type === remote.type &&
      local.topicKey === remote.topicKey &&
      local.pinned === remote.pinned &&
      local.readOnly === remote.readOnly &&
      local.version === remote.version
    ) {
      unchanged.push(remote);
      continue;
    }

    conflicts.push({ local, remote });
  }

  return { conflicts, newRemote, unchanged };
}

/**
 * Resolve all conflicts and return results.
 */
export function resolveAllConflicts(
  conflicts: Array<{ local: SyncMemento; remote: SyncMemento }>,
): SyncConflict[] {
  return conflicts.map(({ local, remote }) => resolveConflict(local, remote));
}
