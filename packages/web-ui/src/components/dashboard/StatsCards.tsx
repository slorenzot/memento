interface StatCardProps {
  label: string;
  value: number | string;
}

export function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="rounded-[var(--radius-2xl)] border border-[var(--color-border)] p-5">
      <p className="text-[13px] text-[var(--color-secondary)]">{label}</p>
      <p className="mt-1 text-[36px] font-semibold tracking-tight text-[var(--color-text-primary)]">
        {value}
      </p>
    </div>
  );
}

interface StatsCardsProps {
  stats: {
    totalObservations: number;
    activeObservations: number;
    activeSessions: number;
    projectCount: number;
  };
}

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard label="Total observations" value={stats.totalObservations} />
      <StatCard label="Active" value={stats.activeObservations} />
      <StatCard label="Sessions" value={stats.activeSessions} />
      <StatCard label="Projects" value={stats.projectCount} />
    </div>
  );
}
