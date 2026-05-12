import { getEngine } from '@/lib/engine';
import { notFound } from 'next/navigation';
import { RelativeTime } from '@/components/shared/RelativeTime';
import { ObservationCard } from '@/components/observations/ObservationCard';
import { EmptyState } from '@/components/shared/EmptyState';

export const dynamic = 'force-dynamic';

export default async function LangSessionDetailPage({
  params,
}: {
  params: Promise<{ id: string; lang: string }>;
}) {
  const { id } = await params;
  const engine = getEngine();
  const session = await engine.getSession(Number(id));

  if (!session) {
    notFound();
  }

  const result = await engine.search({
    query: '',
    limit: 100,
  });
  const sessionObs = result.observations.filter((obs) => obs.sessionId === session.id);

  const isActive = !session.endedAt;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[20px] font-medium text-[var(--color-text-primary)]">
              Session #{session.id}
            </h1>
            <span className={`rounded-full px-2 py-0.5 text-[12px] font-medium ${isActive ? 'bg-green-100 text-green-700' : 'bg-[var(--color-surface-hover)] text-[var(--color-secondary)]'}`}>
              {isActive ? 'Active' : 'Ended'}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-3 text-[13px] text-[var(--color-tertiary)]">
            <span>Project: {session.projectId}</span>
            <span>Started: <RelativeTime date={session.startedAt} /></span>
            {session.endedAt && <span>Ended: <RelativeTime date={session.endedAt} /></span>}
          </div>
        </div>

        {isActive && (
          <form action={async () => {
            'use server';
            const e = (await import('@/lib/engine')).getEngine();
            await e.endSession(session.id);
          }}>
            <button
              type="submit"
              className="rounded-full border border-[var(--color-border)] px-4 py-1.5 text-[13px] text-[var(--color-secondary)] hover:bg-[var(--color-surface-hover)] transition-colors"
            >
              End session
            </button>
          </form>
        )}
      </div>

      {session.metadata && Object.keys(session.metadata).length > 0 && (
        <details className="rounded-lg border border-[var(--color-border)] p-4">
          <summary className="cursor-pointer text-[13px] font-medium text-[var(--color-secondary)]">
            Metadata
          </summary>
          <pre className="mt-2 text-[12px] text-[var(--color-tertiary)]">
            {JSON.stringify(session.metadata, null, 2)}
          </pre>
        </details>
      )}

      <div>
        <h2 className="mb-3 text-[14px] font-medium text-[var(--color-secondary)]">
          Observations ({sessionObs.length})
        </h2>
        {sessionObs.length === 0 ? (
          <p className="py-4 text-[13px] text-[var(--color-tertiary)]">No observations in this session.</p>
        ) : (
          <div className="grid gap-3">
            {sessionObs.map((obs) => (
              <ObservationCard key={obs.id} observation={obs} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
