import { StatsCards } from '@/components/dashboard/StatsCards';
import { TypeDistribution } from '@/components/dashboard/TypeDistribution';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { EmptyState } from '@/components/shared/EmptyState';
import { getDictionary } from '@/i18n/get-dictionary';
import type { Locale } from '@/i18n/config';

export const dynamic = 'force-dynamic';

interface LangDashboardProps {
  params: Promise<{ lang: string }>;
}

export default async function LangDashboardPage({ params }: LangDashboardProps) {
  const { lang } = await params;
  const t = getDictionary(lang as Locale);

  const { getEngine } = await import('@/lib/engine');
  const engine = getEngine();

  const [stats, projects] = await Promise.all([
    engine.getDashboardStats(),
    engine.listProjects(),
  ]);

  const hasData = stats.totalObservations > 0;

  if (!hasData) {
    return (
      <EmptyState
        title={t.dashboard.noObservations}
        description={t.dashboard.noObservationsDescription}
      />
    );
  }

  return (
    <div className="space-y-8">
      <StatsCards
        stats={{
          totalObservations: stats.totalObservations,
          activeObservations: stats.activeObservations,
          activeSessions: stats.activeSessions,
          projectCount: projects.length,
        }}
      />

      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        <TypeDistribution byType={stats.byType} />
        <RecentActivity observations={stats.recentObservations} />
      </div>
    </div>
  );
}
