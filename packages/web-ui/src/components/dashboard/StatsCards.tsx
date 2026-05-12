'use client';

import { useT } from '@/i18n/translation-context';

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
  const t = useT();

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard label={t.dashboard.totalObservations} value={stats.totalObservations} />
      <StatCard label={t.dashboard.active} value={stats.activeObservations} />
      <StatCard label={t.dashboard.sessions} value={stats.activeSessions} />
      <StatCard label={t.dashboard.projects} value={stats.projectCount} />
    </div>
  );
}
