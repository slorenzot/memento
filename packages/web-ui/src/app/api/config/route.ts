import { getEngine } from '@/lib/engine';
import { ok, handleRoute } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

export async function GET() {
  return handleRoute(async () => {
    const engine = getEngine();
    const dbPath = engine.getDatabasePath();
    const healthy = engine.isHealthy();

    return ok({
      database: dbPath,
      healthy,
    });
  });
}
