import { getEngine } from '@/lib/engine';
import { ok, handleRoute } from '@/lib/api-helpers';
import type { Session } from '@slorenzot/memento-core';

export const dynamic = 'force-dynamic';

/**
 * GET /api/observations/timeline — Chronological timeline with session data.
 * Returns { observations, total, sessions } where sessions is a Record<sessionId, Session>.
 */
export async function GET(request: Request) {
  return handleRoute(async () => {
    const engine = getEngine();
    const { searchParams } = new URL(request.url);

    const scope = searchParams.get('scope') ?? undefined;
    const result = await engine.getTimeline({
      projectId: searchParams.get('projectId') ?? undefined,
      scope: scope && (scope === 'project' || scope === 'personal') ? scope : undefined,
      limit: Number(searchParams.get('limit')) || 50,
      offset: Number(searchParams.get('offset')) || 0,
    });

    // Batch-fetch unique sessions for all observations (no N+1)
    const sessionIds = [...new Set(result.observations.map((o) => o.sessionId))];
    const sessions: Record<number, Session> = {};
    await Promise.all(
      sessionIds.map(async (id) => {
        const session = await engine.getSession(id);
        if (session) sessions[id] = session;
      }),
    );

    return ok({ observations: result.observations, total: result.total, sessions });
  });
}
