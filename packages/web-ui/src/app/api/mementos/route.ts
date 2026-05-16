import { getEngine } from '@/lib/engine';
import { ok, created, badRequest, handleRoute } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/observations — List observations with optional filters
 */
export async function GET(request: Request) {
  return handleRoute(async () => {
    const engine = getEngine();
    const { searchParams } = new URL(request.url);

    const result = await engine.search({
      query: searchParams.get('query') ?? undefined,
      type: searchParams.get('type') as any ?? undefined,
      projectId: searchParams.get('projectId') ?? undefined,
      scope: searchParams.get('scope') as 'project' | 'personal' | undefined ?? undefined,
      limit: Number(searchParams.get('limit')) || 50,
      offset: Number(searchParams.get('offset')) || 0,
    });

    return ok(result);
  });
}

/**
 * POST /api/observations — Create a new observation
 */
export async function POST(request: Request) {
  return handleRoute(async () => {
    const body = await request.json();

    if (!body.title || !body.content) {
      return badRequest('title and content are required');
    }

    const engine = getEngine();
    const projectId = body.projectId ?? body.project_id ?? 'default';
    let sessionId = body.sessionId ?? body.session_id;

    // Auto-create a session if none provided (session_id is NOT NULL in schema)
    if (!sessionId) {
      const session = await engine.createSession({
        projectId,
        endedAt: null,
        metadata: { source: 'rest-api', autoCreated: true },
      });
      sessionId = session.id;
    }

    const observation = await engine.createObservation({
      title: body.title,
      content: body.content,
      type: body.type ?? 'note',
      topicKey: body.topicKey ?? body.topic_key ?? undefined,
      projectId,
      scope: body.scope ?? 'project',
      sessionId,
      pinned: body.pinned ?? false,
      readOnly: body.readOnly ?? body.read_only ?? false,
      metadata: body.metadata ?? undefined,
    });

    return created(observation);
  });
}
