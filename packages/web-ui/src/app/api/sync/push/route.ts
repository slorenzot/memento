import { getEngine } from '@/lib/engine';
import { withAuth } from '@/lib/with-auth';
import { ok, badRequest } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

interface SyncObservationInput {
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
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
  metadata: Record<string, unknown>;
}

/**
 * POST /api/sync/push — Upload local observations to the server.
 *
 * Accepts an array of observations. For each:
 * - If UUID doesn't exist → insert
 * - If UUID exists and remote is older → update (remote-wins in conflict)
 * - If UUID exists and remote is newer → skip (local-wins in conflict)
 *
 * Returns accepted count, conflicts, and errors.
 */
export async function POST(request: Request) {
  return withAuth(request, async (auth) => {
    let body: { observations?: SyncObservationInput[] };
    try {
      body = await request.json();
    } catch {
      return badRequest('Invalid JSON body');
    }

    if (!body.observations || !Array.isArray(body.observations)) {
      return badRequest('observations array is required');
    }

    const engine = getEngine();
    let accepted = 0;
    const conflicts: Array<{
      uuid: string;
      resolution: 'local-wins' | 'remote-wins';
      localUpdatedAt: number;
      remoteUpdatedAt: number;
    }> = [];
    const errors: string[] = [];

    for (const obs of body.observations) {
      try {
        const existing = engine.getObservationByUuid(obs.uuid);

        if (existing) {
          // Check conflict: compare updatedAt
          const localUpdatedAt = existing.updatedAt.getTime();

          if (obs.updatedAt <= localUpdatedAt) {
            // Remote (server) is newer or equal → local wins, skip
            conflicts.push({
              uuid: obs.uuid,
              resolution: 'local-wins',
              localUpdatedAt,
              remoteUpdatedAt: obs.updatedAt,
            });
            continue;
          }

          // Remote observation is newer → update (remote wins)
          if (!existing.readOnly) {
            await engine.updateObservation(existing.id, {
              title: obs.title,
              content: obs.content,
              type: obs.type as any,
              topicKey: obs.topicKey,
              metadata: obs.metadata,
              pinned: obs.pinned,
              readOnly: obs.readOnly,
            });
          }

          conflicts.push({
            uuid: obs.uuid,
            resolution: 'remote-wins',
            localUpdatedAt,
            remoteUpdatedAt: obs.updatedAt,
          });
          accepted++;
        } else {
          // New observation → insert
          // Find or create session
          const sessions = await engine.listSessions({
            projectId: obs.projectId,
            limit: 1,
            activeOnly: false,
          });

          let sessionId: number;
          if (sessions.sessions.length > 0) {
            sessionId = sessions.sessions[0].id;
          } else {
            const session = await engine.createSession({
              projectId: obs.projectId,
              endedAt: null,
              metadata: { source: 'sync-push', syncedAt: Date.now() },
            });
            sessionId = session.id;
          }

          await engine.createObservation({
            sessionId,
            title: obs.title,
            content: obs.content,
            type: obs.type as any,
            topicKey: obs.topicKey,
            projectId: obs.projectId,
            scope: obs.scope,
            pinned: obs.pinned,
            readOnly: obs.readOnly,
            metadata: { ...obs.metadata, syncedFrom: obs.uuid },
          });

          accepted++;
        }
      } catch (err) {
        errors.push(`Failed to push ${obs.uuid}: ${err}`);
      }
    }

    return ok({
      accepted,
      conflicts,
      errors,
    });
  });
}
