import { getEngine } from '@/lib/engine';
import { withAuth } from '@/lib/with-auth';
import { ok } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/sync/status — Get sync status (observation counts, last modified).
 *
 * Query params:
 *   projectId — Optional project filter.
 */
export async function GET(request: Request) {
  return withAuth(request, async (auth) => {
    const engine = getEngine();
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId') ?? undefined;

    // Get counts
    const activeResult = await engine.search({
      projectId,
      limit: 1, // We just need the total count
    });

    const deletedResult = await engine.listDeleted({
      projectId,
      limit: 1, // We just need the total count
    });

    // Get last modified by searching sorted by updated_at desc
    // Use search to get the most recently updated observation
    const recentResult = await engine.search({
      projectId,
      limit: 1,
    });

    let lastModifiedAt: number | null = null;
    if (recentResult.observations.length > 0) {
      lastModifiedAt = recentResult.observations[0].updatedAt.getTime();
    }

    return ok({
      totalObservations: activeResult.total + deletedResult.total,
      activeObservations: activeResult.total,
      deletedObservations: deletedResult.total,
      lastModifiedAt,
    });
  });
}
