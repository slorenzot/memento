import { getEngine } from '@/lib/engine';
import { ok, notFound, handleRoute } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/projects/[name] — Project detail with stats, recent observations, sessions, aliases
 * Query param: ?preview=true → returns deletion preview counts
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  return handleRoute(async () => {
    const { name } = await params;
    const engine = getEngine();
    const decodedName = decodeURIComponent(name);

    // Preview mode: return deletion counts
    const { searchParams } = new URL(request.url);
    if (searchParams.get('preview') === 'true') {
      const preview = engine.getProjectDeletionPreview(decodedName);
      if (preview.observations === 0 && preview.sessions === 0 && preview.prompts === 0 && preview.journalEntries === 0 && !preview.hasRegistration) {
        return notFound('Project not found');
      }
      return ok(preview);
    }

    // Get project stats (async)
    const projects = await engine.listProjects();
    const project = projects.find((p) => p.name === decodedName);
    if (!project) return notFound('Project not found');

    // Get registration info (sync)
    const registered = engine
      .listRegisteredProjects()
      .find((p) => p.name === decodedName);

    // Get recent observations (async)
    const recentObs = await engine.search({
      projectId: decodedName,
      limit: 10,
    });

    // Get sessions (async)
    const sessionsResult = await engine.listSessions({
      projectId: decodedName,
      limit: 10,
    });

    return ok({
      name: project.name,
      activeCount: project.activeCount,
      deletedCount: project.deletedCount,
      lastActivity: project.lastActivity,
      byType: project.byType,
      workingDir: registered?.workingDir ?? null,
      aliases: registered?.aliases ?? [],
      recentObservations: recentObs.observations,
      sessions: sessionsResult.sessions,
      sessionsTotal: sessionsResult.total,
    });
  });
}

/**
 * DELETE /api/projects/[name] — Permanently delete all project data
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  return handleRoute(async () => {
    const { name } = await params;
    const engine = getEngine();
    const decodedName = decodeURIComponent(name);

    const result = engine.deleteProject(decodedName);

    return ok(result);
  });
}
