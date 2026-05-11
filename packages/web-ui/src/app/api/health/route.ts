import { getEngine } from '@/lib/engine';
import { ok, handleRoute } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

export async function GET() {
  return handleRoute(async () => {
    const engine = getEngine();
    const healthy = engine.isHealthy();
    const dbPath = engine.getDatabasePath();
    const initError = engine.getInitError();

    return ok({
      status: healthy ? 'healthy' : 'unhealthy',
      database: dbPath,
      ...(initError && { error: initError.message }),
    });
  });
}
