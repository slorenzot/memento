import { getEngine } from '@/lib/engine';
import { notFound } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { RelativeTime } from '@/components/shared/RelativeTime';
import { MementoCard } from '@/components/mementos/MementoCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { getDictionary } from '@/i18n/get-dictionary';
import type { Locale } from '@/i18n/config';
import { ClockIcon, FolderIcon, LayersIcon, PlayIcon, StopCircleIcon } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function LangSessionDetailPage({
  params,
}: {
  params: Promise<{ id: string; lang: string }>;
}) {
  const { id, lang } = await params;
  const engine = getEngine();
  const t = getDictionary(lang as Locale);
  const session = await engine.getSession(Number(id));

  if (!session) {
    notFound();
  }

  const result = await engine.search({
    sessionId: session.id,
    limit: 100,
  });
  const sessionObs = result.observations;

  const isActive = !session.endedAt;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            {isActive ? (
              <PlayIcon className="size-5 text-green-500" />
            ) : (
              <StopCircleIcon className="size-5 text-[var(--color-tertiary)]" />
            )}
            <h1 className="text-[20px] font-medium text-[var(--color-text-primary)]">
              {t.sessionDetail.session.replace('{id}', String(session.id))}
            </h1>
            <span className={`rounded-full px-2 py-0.5 text-[12px] font-medium ${isActive ? 'bg-green-100 text-green-700' : 'bg-[var(--color-surface-hover)] text-[var(--color-secondary)]'}`}>
              {isActive ? t.common.active : t.common.ended}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-3 text-[13px] text-[var(--color-tertiary)]">
            {session.projectId && (
              <div className="flex items-center gap-1.5">
                <FolderIcon className="size-4" />
                <span>{session.projectId}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <ClockIcon className="size-4" />
              <span>{t.sessionDetail.started}: <RelativeTime date={session.startedAt} /></span>
            </div>
            {session.endedAt && (
              <div className="flex items-center gap-1.5">
                <StopCircleIcon className="size-4" />
                <span>{t.sessionDetail.endedAt}: <RelativeTime date={session.endedAt} /></span>
              </div>
            )}
          </div>
        </div>

        {isActive && (
          <form action={async () => {
            'use server';
            const e = (await import('@/lib/engine')).getEngine();
            await e.endSession(session.id);
            revalidatePath(`/[lang]/sessions/${session.id}`, 'page');
          }}>
            <button
              type="submit"
              className="rounded-full border border-[var(--color-border)] px-4 py-1.5 text-[13px] text-[var(--color-secondary)] hover:bg-[var(--color-surface-hover)] transition-colors"
            >
              {t.sessionDetail.endSession}
            </button>
          </form>
        )}
      </div>

      {session.metadata && Object.keys(session.metadata).length > 0 && (
        <details className="rounded-lg border border-[var(--color-border)] p-4">
          <summary className="cursor-pointer text-[13px] font-medium text-[var(--color-secondary)]">
            {t.common.metadata}
          </summary>
          <pre className="mt-2 text-[12px] text-[var(--color-tertiary)]">
            {JSON.stringify(session.metadata, null, 2)}
          </pre>
        </details>
      )}

      <div>
        <h2 className="mb-3 flex items-center gap-2 text-[14px] font-medium text-[var(--color-secondary)]">
          <LayersIcon className="size-4" />
          {t.sessionDetail.observations.replace('{count}', String(sessionObs.length))}
        </h2>
        {sessionObs.length === 0 ? (
          <p className="py-4 text-[13px] text-[var(--color-tertiary)]">{t.sessionDetail.noObservations}</p>
        ) : (
          <div className="grid gap-3">
            {sessionObs.map((obs) => (
              <MementoCard key={obs.id} observation={obs} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
