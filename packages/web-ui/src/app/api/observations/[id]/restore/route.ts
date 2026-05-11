import { getEngine } from '@/lib/engine';
import { ok, notFound, handleRoute } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

/**
 * POST /api/observations/[id]/restore — Restore soft-deleted observation
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handleRoute(async () => {
    const { id } = await params;
    const engine = getEngine();

    try {
      const observation = await engine.restoreObservation(Number(id));
      return ok(observation);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Restore failed';
      return notFound(message);
    }
  });
}
