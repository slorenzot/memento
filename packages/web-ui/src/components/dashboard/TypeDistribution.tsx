'use client';

import { OBSERVATION_TYPES, ObservationTypeIcon } from '@/components/shared/ObservationTypeIcon';
import { useT } from '@/i18n/translation-context';

interface TypeDistributionProps {
  byType: Record<string, number>;
}

export function TypeDistribution({ byType }: TypeDistributionProps) {
  const t = useT();
  const total = Object.values(byType).reduce((sum, n) => sum + n, 0);

  if (total === 0) {
    return (
      <div className="rounded-[var(--radius-2xl)] border border-[var(--color-border)] p-5">
        <h3 className="text-[14px] font-medium text-[var(--color-text-primary)]">
          {t.dashboard.byType}
        </h3>
        <p className="mt-4 text-[13px] text-[var(--color-tertiary)]">
          {t.dashboard.noObservations}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius-2xl)] border border-[var(--color-border)] p-5">
      <h3 className="text-[14px] font-medium text-[var(--color-text-primary)]">
        {t.dashboard.byType}
      </h3>
      <div className="mt-4 space-y-3">
        {OBSERVATION_TYPES.map((type) => {
          const count = byType[type] || 0;
          if (count === 0) return null;
          const pct = (count / total) * 100;
          const label = (t.types as Record<string, string>)[type] ?? type;
          return (
            <div key={type}>
              <div className="flex items-center justify-between text-[13px]">
                <span className="flex items-center gap-1.5 capitalize text-[var(--color-secondary)]">
                  <ObservationTypeIcon type={type} size={14} strokeWidth={2} />
                  {label}
                </span>
                <span className="text-[var(--color-tertiary)]">{count}</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-[var(--color-surface-hover)]">
                <div
                  className="h-full rounded-full bg-[var(--color-primary)]"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
