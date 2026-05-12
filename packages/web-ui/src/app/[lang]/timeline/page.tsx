import { getEngine } from '@/lib/engine';
import { TIMELINE_PAGE_SIZE } from '@/lib/constants';
import { TimelineClient } from '@/components/timeline/TimelineClient';
import { EmptyState } from '@/components/shared/EmptyState';
import { getDictionary } from '@/i18n/get-dictionary';
import type { Locale } from '@/i18n/config';

export const dynamic = 'force-dynamic';

interface LangTimelineProps {
  params: Promise<{ lang: string }>;
}

export default async function LangTimelinePage({ params }: LangTimelineProps) {
  const { lang } = await params;
  const engine = getEngine();
  const t = getDictionary(lang as Locale);
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
