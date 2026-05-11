import { getEngine } from '@/lib/engine';
import { ok, created, handleRoute } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/sessions — List sessions
 */
export async function GET(request: Request) {
  return handleRoute(async () => {
    const engine = getEngine();
    const { searchParams } = new URL(request.url);

    const result = await engine.listSessions({
      projectId: searchParams.get('projectId') ?? undefined,
      limit: Number(searchParams.get('limit')) || 50,
      offset: Number(searchParams.get('offset')) || 0,
    });

    return ok(result);
  });
}

/**
 * POST /api/sessions — Create a new session
 */
export async function POST(request: Request) {
  return handleRoute(async () => {
    const body = await request.json();
    const engine = getEngine();

    const session = await engine.createSession({
      projectId: body.projectId ?? body.project_id ?? 'default',
      endedAt: null,
      metadata: body.metadata ?? {},
    });

    return created(session);
  });
}
