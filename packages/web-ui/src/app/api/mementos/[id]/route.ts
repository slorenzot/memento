import { getEngine } from '@/lib/engine';
import { ok, notFound, handleRoute } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/observations/[id] — Get single observation
 * PATCH /api/observations/[id] — Update observation
 * DELETE /api/observations/[id] — Soft delete observation
 */

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handleRoute(async () => {
    const { id } = await params;
    const engine = getEngine();
    const observation = await engine.getObservation(Number(id));

    if (!observation) {
      return notFound(`Observation ${id} not found`);
    }

    return ok(observation);
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handleRoute(async () => {
    const { id } = await params;
    const body = await request.json();
    const engine = getEngine();

    const observation = await engine.updateObservation(Number(id), {
      title: body.title,
      content: body.content,
      type: body.type,
      topicKey: body.topicKey ?? body.topic_key,
      metadata: body.metadata,
      pinned: body.pinned,
      readOnly: body.readOnly ?? body.read_only,
    });

    return ok(observation);
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handleRoute(async () => {
    const { id } = await params;
    const engine = getEngine();

    const body = await request.json().catch(() => ({}));
    await engine.deleteObservation(Number(id), body.reason);

    return ok({ deleted: true, id: Number(id) });
  });
}
