import { getEngine } from '@/lib/engine';
import { TIMELINE_PAGE_SIZE } from '@/lib/constants';
import { TimelineClient } from '@/components/timeline/TimelineClient';
import { EmptyState } from '@/components/shared/EmptyState';
import { getDictionary } from '@/i18n/get-dictionary';
import type { Locale } from '@/i18n/config';
import type { Session } from '@slorenzot/memento-core';

export const dynamic = 'force-dynamic';

interface LangTimelineProps {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ scope?: string; projectId?: string }>;
}

export default async function LangTimelinePage({ params, searchParams }: LangTimelineProps) {
  const { lang } = await params;
  const filters = await searchParams;
  const engine = getEngine();
  const t = getDictionary(lang as Locale);

  const result = await engine.getTimeline({
    scope: filters.scope,
    projectId: filters.projectId,
    limit: TIMELINE_PAGE_SIZE,
  });

  // Batch-fetch unique sessions (no N+1)
  const sessionIds = [...new Set(result.observations.map((o) => o.sessionId))];
  const sessions: Record<number, Session> = {};
  await Promise.all(
    sessionIds.map(async (id) => {
      const session = await engine.getSession(id);
      if (session) sessions[id] = session;
    }),
  );

  // Load projects list for filter dropdown
  let projects: string[] = [];
  try {
    const projectRows = await engine.listProjects();
    projects = projectRows.map((p: { name: string }) => p.name);
  } catch {
    // Silently fail — project filter just won't show options
  }

  if (result.observations.length === 0 && !filters.scope && !filters.projectId) {
    return (
      <div className="space-y-6">
        <h1 className="text-[20px] font-medium text-[var(--color-text-primary)]">
          {t.timeline.title}
        </h1>
        <EmptyState
          title={t.timeline.noObservations}
          description={t.timeline.noObservationsDescription}
        />
      </div>
    );
  }

  return (
    <TimelineClient
      initialObservations={result.observations}
      initialTotal={result.total}
      initialScope={filters.scope ?? ''}
      initialProject={filters.projectId ?? ''}
      initialSessions={sessions}
      projects={projects}
    />
  );
}
