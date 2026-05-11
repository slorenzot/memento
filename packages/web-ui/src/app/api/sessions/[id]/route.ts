import { getEngine } from '@/lib/engine';
import { ok, notFound, handleRoute } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/sessions/[id] — Get session detail
 * PATCH /api/sessions/[id] — End session
 */

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handleRoute(async () => {
    const { id } = await params;
    const engine = getEngine();
    const session = await engine.getSession(Number(id));

    if (!session) {
      return notFound(`Session ${id} not found`);
    }

    return ok(session);
  });
}

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handleRoute(async () => {
    const { id } = await params;
    const engine = getEngine();

    const session = await engine.endSession(Number(id));
    return ok(session);
  });
}
