'use client';

import { useState, useCallback, useEffect } from 'react';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { MementoCard } from '@/components/mementos/MementoCard';
import { useT } from '@/i18n/translation-context';
import type { Observation, Session } from '@slorenzot/memento-core';
import type { Locale } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { enUS } from 'date-fns/locale/en-US';

const TIMELINE_PAGE_SIZE = 100;

const SCOPES = ['project', 'personal'] as const;

interface TimelineClientProps {
  initialObservations: Observation[];
  initialTotal: number;
  initialScope: string;
  initialProject: string;
  initialSessions: Record<number, Session>;
  projects: string[];
}

const dateFnsLocales: Record<string, Locale> = { en: enUS, es: es };

function groupByDay(observations: Observation[]): Map<string, Observation[]> {
  const groups = new Map<string, Observation[]>();
  for (const obs of observations) {
    const date = new Date(obs.createdAt);
    const key = date.toISOString().split('T')[0];
    const group = groups.get(key) ?? [];
    group.push(obs);
    groups.set(key, group);
  }
  return groups;
}

function formatDayHeader(dateStr: string, t: ReturnType<typeof useT>, locale: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (dateStr === today.toISOString().split('T')[0]) return t.common.today;
  if (dateStr === yesterday.toISOString().split('T')[0]) return t.common.yesterday;

  const dateFnsLocale = dateFnsLocales[locale] ?? dateFnsLocales.en;
  return date.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function TimelineClient({
  initialObservations,
  initialTotal,
  initialScope,
  initialProject,
  initialSessions,
  projects,
}: TimelineClientProps) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const urlParams = useParams<{ lang?: string }>();
  const locale = urlParams.lang ?? 'en';

  const [observations, setObservations] = useState<Observation[]>(initialObservations);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const [activeScope, setActiveScope] = useState(initialScope);
  const [activeProject, setActiveProject] = useState(initialProject);
  const [sessions, setSessions] = useState<Record<number, Session>>(initialSessions);

  const hasMore = observations.length < total;

  const updateURL = useCallback((scope: string, projectId: string) => {
    const params = new URLSearchParams();
    if (scope) params.set('scope', scope);
    if (projectId) params.set('projectId', projectId);
    const search = params.toString();
    router.replace(search ? `${pathname}?${search}` : pathname);
  }, [router, pathname]);

  const fetchTimeline = useCallback(async (scope: string, projectId: string, offset = 0) => {
    const isLoadMore = offset > 0;
    setLoading(true);

    try {
      const params = new URLSearchParams({
        limit: String(TIMELINE_PAGE_SIZE),
        offset: String(offset),
      });
      if (scope) params.set('scope', scope);
      if (projectId) params.set('projectId', projectId);

      const res = await fetch(`/api/mementos/timeline?${params}`);
      const data = await res.json() as {
        observations: Observation[];
        total: number;
        sessions: Record<number, Session>;
      };

      if (isLoadMore) {
        setObservations((prev) => {
          const existingIds = new Set(prev.map((o) => o.id));
          const newObs = data.observations.filter((o) => !existingIds.has(o.id));
          return [...prev, ...newObs];
        });
        // Merge new sessions into existing map
        setSessions((prev) => ({ ...prev, ...data.sessions }));
      } else {
        setObservations(data.observations);
        setTotal(data.total);
        setSessions(data.sessions);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const handleFilterChange = useCallback((scope: string, projectId: string) => {
    setActiveScope(scope);
    setActiveProject(projectId);
    updateURL(scope, projectId);
    fetchTimeline(scope, projectId, 0);
  }, [updateURL, fetchTimeline]);

  const handleScopeChange = useCallback((value: string) => {
    handleFilterChange(value, activeProject);
  }, [activeProject, handleFilterChange]);

  const handleProjectChange = useCallback((value: string) => {
    handleFilterChange(activeScope, value);
  }, [activeScope, handleFilterChange]);

  const handleLoadEarlier = useCallback(async () => {
    await fetchTimeline(activeScope, activeProject, observations.length);
  }, [fetchTimeline, activeScope, activeProject, observations.length]);

  const groups = groupByDay(observations);

  return (
    <div className="space-y-6">
      <h1 className="text-[20px] font-medium text-[var(--color-text-primary)]">
        {t.timeline.title}
        <span className="ml-2 text-[14px] font-normal text-[var(--color-tertiary)]">
          ({total})
        </span>
      </h1>

      {/* Scope + Project filters */}
      <div className="flex items-center gap-3">
        <select
          value={activeScope}
          onChange={(e) => handleScopeChange(e.target.value)}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-[13px] text-[var(--color-text-primary)]"
        >
          <option value="">{t.common.allScopes}</option>
          {SCOPES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {projects.length > 0 && (
          <select
            value={activeProject}
            onChange={(e) => handleProjectChange(e.target.value)}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-[13px] text-[var(--color-text-primary)]"
          >
            <option value="">{t.common.allProjects}</option>
            {projects.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        )}
      </div>

      <div className="space-y-8">
        {Array.from(groups.entries()).map(([dateStr, dayObservations]) => (
          <div key={dateStr}>
            <h2 className="mb-3 text-[13px] font-medium uppercase tracking-wide text-[var(--color-tertiary)]">
              {formatDayHeader(dateStr, t, locale)}
            </h2>
            <div className="grid gap-3">
              {dayObservations.map((obs) => (
                <MementoCard
                  key={obs.id}
                  observation={obs}
                  session={sessions[obs.sessionId]}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {observations.length === 0 && (
        <p className="py-8 text-center text-[14px] text-[var(--color-tertiary)]">
          {t.timeline.noObservations}
        </p>
      )}

      {hasMore && (
        <div className="flex justify-center pt-6">
          <button
            onClick={handleLoadEarlier}
            disabled={loading}
            className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-[13px] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] disabled:opacity-50 transition-colors"
          >
            {loading ? t.common.loading : t.timeline.loadEarlier}
          </button>
        </div>
      )}
    </div>
  );
}
