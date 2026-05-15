import { getEngine } from '@/lib/engine';
import { withAuth } from '@/lib/with-auth';
import { ok } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/sync/pull — Get observations modified since a timestamp.
 *
 * Query params:
 *   since     — Unix epoch ms. If omitted, returns all observations.
 *   projectId — Optional project filter.
 *
 * Returns observations (including soft-deleted) with server time for next sync.
 */
export async function GET(request: Request) {
  return withAuth(request, async (auth) => {
    const engine = getEngine();
    const { searchParams } = new URL(request.url);

    const since = searchParams.has('since')
      ? parseInt(searchParams.get('since')!)
      : null;
    const projectId = searchParams.get('projectId') ?? undefined;

    // Get active observations
    const activeResult = await engine.search({
      projectId,
      limit: 100000,
    });

    // Get soft-deleted observations
    const deletedResult = await engine.listDeleted({
      projectId,
      limit: 100000,
    });

    const allObservations = [...activeResult.observations, ...deletedResult.observations];

    // Filter by updatedAt > since
    const filtered = since !== null
      ? allObservations.filter(obs => obs.updatedAt.getTime() > since)
      : allObservations;

    // Convert to sync format
    const observations = filtered.map(obs => ({
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
    }));

    return ok({
      observations,
      serverTime: Date.now(),
    });
  });
}
