import { getEngine } from '@/lib/engine';
import { ok, badRequest, handleRoute } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return handleRoute(async () => {
    const engine = getEngine();
    const { searchParams } = new URL(request.url);

    const projectId = searchParams.get('projectId') ?? undefined;
    const limit = Number(searchParams.get('limit')) || 20;

    const context = await engine.getRecentContext({ projectId, limit });
    return ok(context);
  });
}
