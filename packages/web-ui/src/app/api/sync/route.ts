import { getEngine } from '@/lib/engine';
import { ok, badRequest, error, handleRoute } from '@/lib/api-helpers';
import { SyncClient } from '@slorenzot/memento-core';

export const dynamic = 'force-dynamic';

const DEFAULT_HUB_URL = 'https://memento-hub.vercel.app';

/**
 * POST /api/sync — Trigger bidirectional sync with memento-hub.
 *
 * Body: { accessToken: string; serverUrl?: string }
 * Returns: SyncResult summary { direction, pulled, pushed, conflicts, errors, durationMs }
 */
export async function POST(request: Request) {
  return handleRoute(async () => {
    const body = await request.json();
    const { accessToken, serverUrl } = body as {
      accessToken?: string;
      serverUrl?: string;
    };

    if (!accessToken) {
      return badRequest('accessToken is required');
    }

    const engine = getEngine();

    const client = new SyncClient({
      serverUrl: serverUrl || DEFAULT_HUB_URL,
      getToken: async () => accessToken,
    });

    const start = Date.now();
    const errors: string[] = [];
    let totalPulled = 0;
    let totalPushed = 0;
    let pullFailed = false;
    let pushFailed = false;

    // Collect all project IDs to sync — include every local project plus "default"
    const projects = await engine.listProjects();
    const projectIds = [...new Set([...projects.map(p => p.name), 'default'])];

    // Phase 1: Pull remote changes for ALL projects
    try {
      for (const projectId of projectIds) {
        let hasMore = true;
        let cursor: string | null = null;

        while (hasMore) {
          const response = await client.pull({
            projectId,
            cursor,
            limit: 100,
          });

          for (const change of response.changes) {
            try {
              // Try to find existing by uuid
              const existing = engine.getObservationByUuid(change.uuid);
              if (existing) {
                if (!existing.readOnly) {
                  await engine.updateObservation(existing.id, {
                    title: change.title,
                    content: change.content,
                    type: change.type as 'decision' | 'bug' | 'discovery' | 'note' | 'summary' | 'learning' | 'pattern' | 'architecture' | 'config' | 'preference',
                    topicKey: change.topicKey,
                    pinned: change.pinned,
                    readOnly: change.readOnly,
                  });
                }
              } else {
                // Find or create session
                const sessions = await engine.listSessions({
                  projectId: change.projectId,
                  limit: 1,
                  activeOnly: false,
                });

                let sessionId: number;
                if (sessions.sessions.length > 0) {
                  sessionId = sessions.sessions[0].id;
                } else {
                  const session = await engine.createSession({
                    projectId: change.projectId,
                    endedAt: null,
                    metadata: { source: 'sync', syncedAt: Date.now() },
                  });
                  sessionId = session.id;
                }

                await engine.createObservation({
                  sessionId,
                  title: change.title,
                  content: change.content,
                  type: change.type as 'decision' | 'bug' | 'discovery' | 'note' | 'summary' | 'learning' | 'pattern' | 'architecture' | 'config' | 'preference',
                  topicKey: change.topicKey,
                  projectId: change.projectId,
                  scope: change.scope,
                  pinned: change.pinned,
                  readOnly: change.readOnly,
                  metadata: { ...change.metadata, syncedUuid: change.uuid },
                });
              }
              totalPulled++;
            } catch (err) {
              errors.push(`Failed to apply ${change.uuid}: ${err}`);
            }
          }

          cursor = response.newCursor;
          hasMore = response.hasMore;
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[Sync] Pull phase failed:', msg);
      errors.push(`Pull failed: ${msg}`);
      pullFailed = true;
    }

    // Phase 2: Push local changes
    // Group observations by projectId and push each group separately.
    // The hub resolves the request-level projectId to determine which project
    // to store mementos under — sending all items with projectId='default'
    // would incorrectly store everything under "default" (#264).
    const HUB_PUSH_MAX_ITEMS = 500;
    try {
      const active = await engine.search({
        limit: 100000,
      });

      // Filter: scope=project, non-empty title and content (hub Zod validation)
      const projectItems = active.observations.filter(obs =>
        obs.scope === 'project' && obs.title && obs.title.trim() && obs.content,
      );

      if (projectItems.length > 0) {
        // Group by projectId so each push request targets the correct project
        const grouped = new Map<string, typeof projectItems>();
        for (const obs of projectItems) {
          const items = grouped.get(obs.projectId) ?? [];
          items.push(obs);
          grouped.set(obs.projectId, items);
        }

        for (const [projectId, items] of grouped) {
          const syncItems = items.map(obs => ({
            uuid: obs.uuid,
            title: obs.title,
            content: obs.content,
            type: obs.type,
            topicKey: obs.topicKey,
            scope: obs.scope as 'project' | 'personal',
            pinned: obs.pinned,
            readOnly: obs.readOnly,
            revisionCount: obs.revisionCount,
            projectId: obs.projectId,
            metadata: obs.metadata,
            localCreatedAt: obs.createdAt.toISOString(),
            localUpdatedAt: obs.updatedAt.toISOString(),
            version: obs.revisionCount + 1,
            deletedAt: obs.deletedAt ? obs.deletedAt.toISOString() : null,
          }));

          // Push in batches — hub limits to HUB_PUSH_MAX_ITEMS per request
          for (let i = 0; i < syncItems.length; i += HUB_PUSH_MAX_ITEMS) {
            const batch = syncItems.slice(i, i + HUB_PUSH_MAX_ITEMS);
            const result = await client.push({
              projectId,
              cursor: null,
              deviceFingerprint: 'web-ui',
              clientVersion: '1.0.0',
              items: batch,
            });
            totalPushed += result.synced;
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[Sync] Push phase failed:', msg);
      errors.push(`Push failed: ${msg}`);
      pushFailed = true;
    }

    // If BOTH phases failed completely (0 pulled, 0 pushed), return error
    // so the frontend can show a meaningful error message
    if (pullFailed && pushFailed && totalPulled === 0 && totalPushed === 0) {
      return error(errors.join('; ') || 'Sync failed: could not connect to hub', 502);
    }

    return ok({
      direction: 'bidirectional',
      pulled: totalPulled,
      pushed: totalPushed,
      conflicts: 0,
      errors,
      durationMs: Date.now() - start,
    });
  });
}
