import { getEngine } from '@/lib/engine';
import { ok, handleRoute } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/observations/deleted — List soft-deleted observations
 */
export async function GET(request: Request) {
  return handleRoute(async () => {
    const engine = getEngine();
    const { searchParams } = new URL(request.url);

    const result = await engine.listDeleted({
      projectId: searchParams.get('projectId') ?? undefined,
      limit: Number(searchParams.get('limit')) || 50,
    });

    return ok(result);
  });
}
