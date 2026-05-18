import { getEngine } from '@/lib/engine';
import { ok, badRequest, handleRoute } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

/**
 * POST /api/projects/merge — Merge all data from source to target project
 */
export async function POST(request: Request) {
  return handleRoute(async () => {
    const body = await request.json();
    const engine = getEngine();

    const source = body.source;
    const target = body.target;

    if (!source || typeof source !== 'string') {
      return badRequest('source is required');
    }
    if (!target || typeof target !== 'string') {
      return badRequest('target is required');
    }
    if (source === target) {
      return badRequest('source and target must be different');
    }

    const result = engine.mergeProject(source, target);

    return ok(result);
  });
}
