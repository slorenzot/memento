interface TypeDistributionProps {
  byType: Record<string, number>;
}

const TYPE_ORDER = [
  'decision',
  'bug',
  'discovery',
  'note',
  'summary',
  'learning',
  'pattern',
  'architecture',
  'config',
  'preference',
];

export function TypeDistribution({ byType }: TypeDistributionProps) {
  const total = Object.values(byType).reduce((sum, n) => sum + n, 0);

  if (total === 0) {
    return (
      <div className="rounded-[var(--radius-2xl)] border border-[var(--color-border)] p-5">
        <h3 className="text-[14px] font-medium text-[var(--color-text-primary)]">By type</h3>
        <p className="mt-4 text-[13px] text-[var(--color-tertiary)]">No observations yet</p>
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius-2xl)] border border-[var(--color-border)] p-5">
      <h3 className="text-[14px] font-medium text-[var(--color-text-primary)]">By type</h3>
      <div className="mt-4 space-y-3">
        {TYPE_ORDER.map((type) => {
          const count = byType[type] || 0;
          if (count === 0) return null;
          const pct = (count / total) * 100;
          return (
            <div key={type}>
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-[var(--color-secondary)] capitalize">{type}</span>
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
