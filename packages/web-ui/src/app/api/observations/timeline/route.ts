import { getEngine } from '@/lib/engine';
import { ok, handleRoute } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/observations/timeline — Chronological timeline
 */
export async function GET(request: Request) {
  return handleRoute(async () => {
    const engine = getEngine();
    const { searchParams } = new URL(request.url);

    const scope = searchParams.get('scope') ?? undefined;
    const result = await engine.getTimeline({
      projectId: searchParams.get('projectId') ?? undefined,
      scope: scope && (scope === 'project' || scope === 'personal') ? scope : undefined,
      limit: Number(searchParams.get('limit')) || 50,
      offset: Number(searchParams.get('offset')) || 0,
    });

    return ok(result);
  });
}
