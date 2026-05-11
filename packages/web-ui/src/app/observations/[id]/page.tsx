import { getEngine } from '@/lib/engine';
import { notFound } from 'next/navigation';
import ObservationDetailClient from '@/components/observations/ObservationDetail';

export const dynamic = 'force-dynamic';

export default async function ObservationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const engine = getEngine();
  const observation = await engine.getObservation(Number(id));

  if (!observation) {
    notFound();
  }

  return <ObservationDetailClient observation={observation} />;
}
