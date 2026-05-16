import { getEngine } from '@/lib/engine';
import { ok, badRequest, handleRoute } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

/**
 * POST /api/observations/export — Export observations
 */
export async function POST(request: Request) {
  return handleRoute(async () => {
    const body = await request.json();
    const engine = getEngine();

    const result = await engine.exportObservations({
      format: body.format ?? 'json',
      projectId: body.projectId ?? body.project_id ?? undefined,
      type: body.type ?? undefined,
      topicKey: body.topicKey ?? body.topic_key ?? undefined,
      dateFrom: body.dateFrom ? new Date(body.dateFrom) : undefined,
      dateTo: body.dateTo ? new Date(body.dateTo) : undefined,
      includeDeleted: body.includeDeleted ?? body.include_deleted ?? false,
    });

    return ok(result);
  });
}
