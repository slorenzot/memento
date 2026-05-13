import { getEngine } from '@/lib/engine';
import { badRequest, handleRoute } from '@/lib/api-helpers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/projects/export — Export all project data as JSON
 */
export async function POST(request: Request) {
  return handleRoute(async () => {
    const body = await request.json();
    const engine = getEngine();

    const projectId = body.projectId ?? body.project_id;
    if (!projectId || typeof projectId !== 'string') {
      return badRequest('projectId is required');
    }

    const data = await engine.exportProject(projectId);

    const filename = `memento-${projectId}-${new Date().toISOString().slice(0, 10)}.json`;
    const json = JSON.stringify(data, null, 2);

    return new NextResponse(json, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  });
}
