import { getEngine } from '@/lib/engine';
import { ok, badRequest, handleRoute } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

/**
 * POST /api/observations/purge — Permanently delete soft-deleted observations
 */
export async function POST(request: Request) {
  return handleRoute(async () => {
    const body = await request.json();
    const engine = getEngine();

    if (!body.projectId) {
      return badRequest('projectId is required');
    }

    const result = await engine.purgeObservations({
      projectId: body.projectId,
      observationIds: body.observationIds ?? body.observation_ids ?? undefined,
    });

    return ok(result);
  });
}
