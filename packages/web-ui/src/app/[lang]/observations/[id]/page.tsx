import { getEngine } from '@/lib/engine';
import { notFound } from 'next/navigation';
import ObservationDetailClient from '@/components/observations/ObservationDetail';
import type { Session } from '@slorenzot/memento-core';

export const dynamic = 'force-dynamic';

export default async function LangObservationPage({
  params,
}: {
  params: Promise<{ id: string; lang: string }>;
}) {
  const { id } = await params;
  const engine = getEngine();
  const observation = await engine.getObservation(Number(id));

  if (!observation) {
    notFound();
  }

  // Fetch session for status badge (graceful fallback if not found)
  const session: Session | null = await engine.getSession(observation.sessionId);

  return <ObservationDetailClient observation={observation} session={session} />;
}
