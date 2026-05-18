import { getEngine } from '@/lib/engine';
import { created, badRequest, handleRoute } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

/**
 * POST /api/projects/register — Register a new project
 */
export async function POST(request: Request) {
  return handleRoute(async () => {
    const body = await request.json();
    const engine = getEngine();

    const name = body.name;
    if (!name || typeof name !== 'string') {
      return badRequest('name is required');
    }

    const workingDir =
      body.workingDir && typeof body.workingDir === 'string'
        ? body.workingDir
        : undefined;

    const result = engine.registerProject(name, workingDir);

    return created({ name: result });
  });
}
