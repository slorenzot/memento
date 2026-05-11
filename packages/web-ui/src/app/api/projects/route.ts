import { getEngine } from '@/lib/engine';
import { ok, handleRoute } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/projects — List projects with stats
 */
export async function GET() {
  return handleRoute(async () => {
    const engine = getEngine();
    const projects = await engine.listProjects();
    return ok(projects);
  });
}
