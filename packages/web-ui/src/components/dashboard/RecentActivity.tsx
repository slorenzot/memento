'use client';

import Link from 'next/link';
import type { Observation } from '@slorenzot/memento-core';
import { Badge } from '@/components/shared/Badge';
import { RelativeTime } from '@/components/shared/RelativeTime';
import { useT } from '@/i18n/translation-context';
import { useLocalePrefix } from '@/i18n/use-locale-prefix';

interface RecentActivityProps {
  observations: Observation[];
}

export function RecentActivity({ observations }: RecentActivityProps) {
  const t = useT();
  const prefix = useLocalePrefix();

  if (observations.length === 0) {
    return (
      <div>
        <h3 className="text-[14px] font-medium text-[var(--color-text-primary)]">
          {t.dashboard.recentActivity}
        </h3>
        <p className="mt-4 text-[13px] text-[var(--color-tertiary)]">
          {t.dashboard.noObservations}
        </p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-[14px] font-medium text-[var(--color-text-primary)]">
        {t.dashboard.recentActivity}
      </h3>
      <div className="mt-4 space-y-3">
        {observations.map((obs) => (
          <Link
            key={obs.id}
            href={`${prefix}/observations/${obs.id}`}
            className="block rounded-[var(--radius-2xl)] border border-[var(--color-border)] p-4 transition-colors hover:border-[var(--color-border-strong)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h4 className="truncate text-[14px] font-medium text-[var(--color-text-primary)]">
                  {obs.title}
                </h4>
                <div className="mt-1.5 flex items-center gap-2">
                  <Badge type={obs.type} />
                  {obs.projectId && (
                    <span className="text-[12px] text-[var(--color-tertiary)]">{obs.projectId}</span>
                  )}
                  {obs.pinned && (
                    <span className="text-[12px] text-[var(--color-tertiary)]">{t.common.pinned}</span>
                  )}
                </div>
                {obs.content && (
                  <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-[var(--color-secondary)]">
                    {obs.content}
                  </p>
                )}
              </div>
              <div className="shrink-0 pt-0.5">
                <RelativeTime date={obs.createdAt} />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
