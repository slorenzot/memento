import { getEngine } from '@/lib/engine';
import { ObservationCard } from '@/components/observations/ObservationCard';
import { EmptyState } from '@/components/shared/EmptyState';
import type { Observation } from '@slorenzot/memento-core';

export const dynamic = 'force-dynamic';

function groupByDay(observations: Observation[]): Map<string, Observation[]> {
  const groups = new Map<string, Observation[]>();
  for (const obs of observations) {
    const date = new Date(obs.createdAt);
    const key = date.toISOString().split('T')[0]; // YYYY-MM-DD
    const group = groups.get(key) ?? [];
    group.push(obs);
    groups.set(key, group);
  }
  return groups;
}

function formatDayHeader(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00'); // noon to avoid timezone issues
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

export default async function TimelinePage() {
  const engine = getEngine();
  const result = await engine.getTimeline({ limit: 100 });

  if (result.observations.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-[20px] font-medium text-[var(--color-text-primary)]">Timeline</h1>
        <EmptyState
          title="No observations yet"
          description="Your timeline will appear here once you create observations."
        />
      </div>
    );
  }

  const groups = groupByDay(result.observations);

  return (
    <div className="space-y-6">
      <h1 className="text-[20px] font-medium text-[var(--color-text-primary)]">
        Timeline
        <span className="ml-2 text-[14px] font-normal text-[var(--color-tertiary)]">
          ({result.total})
        </span>
      </h1>

      <div className="space-y-8">
        {Array.from(groups.entries()).map(([dateStr, observations]) => (
          <div key={dateStr}>
            <h2 className="mb-3 text-[13px] font-medium uppercase tracking-wide text-[var(--color-tertiary)]">
              {formatDayHeader(dateStr)}
            </h2>
            <div className="grid gap-3">
              {observations.map((obs) => (
                <ObservationCard key={obs.id} observation={obs} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
