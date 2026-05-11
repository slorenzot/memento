import { getEngine } from '@/lib/engine';
import { ok, handleRoute } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

export async function GET() {
  return handleRoute(async () => {
    const engine = getEngine();
    const stats = await engine.getDashboardStats();
    return ok(stats);
  });
}
