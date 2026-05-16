import { getEngine } from '@/lib/engine';
import { notFound } from 'next/navigation';
import { EditMementoContent } from '@/components/mementos/EditMementoContent';

export const dynamic = 'force-dynamic';

export default async function LangEditMementoPage({
  params,
}: {
  params: Promise<{ id: string; lang: string }>;
}) {
  const { id } = await params;
  const engine = getEngine();
  const observation = await engine.getObservation(Number(id));

  if (!observation || observation.deletedAt) {
    notFound();
  }

  return <EditMementoContent observation={observation} />;
}
