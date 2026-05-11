import { getEngine } from '@/lib/engine';
import { TIMELINE_PAGE_SIZE } from '@/lib/constants';
import { TimelineClient } from '@/components/timeline/TimelineClient';
import { EmptyState } from '@/components/shared/EmptyState';

export const dynamic = 'force-dynamic';

export default async function TimelinePage() {
  const engine = getEngine();
  const result = await engine.getTimeline({ limit: TIMELINE_PAGE_SIZE });

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

  return (
    <TimelineClient
      initialObservations={result.observations}
      initialTotal={result.total}
    />
  );
}
