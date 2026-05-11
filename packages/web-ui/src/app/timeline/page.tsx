import { getEngine } from '@/lib/engine';
import { TIMELINE_PAGE_SIZE } from '@/lib/constants';
import { TimelineClient } from '@/components/timeline/TimelineClient';
import { EmptyState } from '@/components/shared/EmptyState';
import { getLocaleFromCookie, getDictionary } from '@/i18n/get-dictionary';

export const dynamic = 'force-dynamic';

export default async function TimelinePage() {
  const engine = getEngine();
  const t = getDictionary(await getLocaleFromCookie());
  const result = await engine.getTimeline({ limit: TIMELINE_PAGE_SIZE });

  if (result.observations.length === 0) {
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
    />
  );
}
