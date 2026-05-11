import { getEngine } from '@/lib/engine';
import { ok, badRequest, handleRoute } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

/**
 * POST /api/observations/merge — Merge observations
 */
export async function POST(request: Request) {
  return handleRoute(async () => {
    const body = await request.json();
    const engine = getEngine();

    if (!body.strategy || !body.projectId) {
      return badRequest('strategy and projectId are required');
    }

    const result = await engine.mergeObservations({
      strategy: body.strategy,
      projectId: body.projectId,
      topicKey: body.topicKey ?? body.topic_key ?? undefined,
      observationIds: body.observationIds ?? body.observation_ids ?? undefined,
      dryRun: body.dryRun ?? false,
    });

    return ok(result);
  });
}
