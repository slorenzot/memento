'use client';

import { useState, useCallback } from 'react';
import { ObservationCard } from '@/components/observations/ObservationCard';
import type { Observation } from '@slorenzot/memento-core';

const TIMELINE_PAGE_SIZE = 100;

interface TimelineClientProps {
  initialObservations: Observation[];
  initialTotal: number;
}

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

function formatDayHeader(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (dateStr === today.toISOString().split('T')[0]) return 'Today';
  if (dateStr === yesterday.toISOString().split('T')[0]) return 'Yesterday';

  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function TimelineClient({ initialObservations, initialTotal }: TimelineClientProps) {
  const [observations, setObservations] = useState<Observation[]>(initialObservations);
  const [total] = useState(initialTotal);
  const [loading, setLoading] = useState(false);

  const hasMore = observations.length < total;

  const handleLoadEarlier = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/observations/timeline?limit=${TIMELINE_PAGE_SIZE}&offset=${observations.length}`
      );
      const data = await res.json();

      if (data.observations && data.observations.length > 0) {
        setObservations((prev) => {
          const existingIds = new Set(prev.map((o) => o.id));
          const newObs = data.observations.filter((o: Observation) => !existingIds.has(o.id));
          return [...prev, ...newObs];
        });
      }
    } finally {
      setLoading(false);
    }
  }, [observations.length]);

  const groups = groupByDay(observations);

  return (
    <div className="space-y-6">
      <h1 className="text-[20px] font-medium text-[var(--color-text-primary)]">
        Timeline
        <span className="ml-2 text-[14px] font-normal text-[var(--color-tertiary)]">
          ({total})
        </span>
      </h1>

      <div className="space-y-8">
        {Array.from(groups.entries()).map(([dateStr, dayObservations]) => (
          <div key={dateStr}>
            <h2 className="mb-3 text-[13px] font-medium uppercase tracking-wide text-[var(--color-tertiary)]">
              {formatDayHeader(dateStr)}
            </h2>
            <div className="grid gap-3">
              {dayObservations.map((obs) => (
                <ObservationCard key={obs.id} observation={obs} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center pt-6">
          <button
            onClick={handleLoadEarlier}
            disabled={loading}
            className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-[13px] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] disabled:opacity-50 transition-colors"
          >
            {loading ? 'Loading...' : 'Load earlier'}
          </button>
        </div>
      )}
    </div>
  );
}
