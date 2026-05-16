import { getEngine } from '@/lib/engine';
import { ok, handleRoute } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

/**
 * POST /api/observations/search — Full-text search
 */
export async function POST(request: Request) {
  return handleRoute(async () => {
    const body = await request.json();
    const engine = getEngine();

    const result = await engine.search({
      query: body.query ?? '',
      type: body.type ?? undefined,
      projectId: body.projectId ?? body.project_id ?? undefined,
      scope: body.scope ?? undefined,
      limit: body.limit ?? 20,
      offset: body.offset ?? 0,
      mode: body.mode ?? 'keyword',
      topicKey: body.topicKey ?? body.topic_key ?? undefined,
    });

    return ok(result);
  });
}
