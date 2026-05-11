import { StatsCards } from '@/components/dashboard/StatsCards';
import { TypeDistribution } from '@/components/dashboard/TypeDistribution';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { EmptyState } from '@/components/shared/EmptyState';

// Force dynamic rendering — requires bun:sqlite at runtime
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  // Lazy import to avoid bun:sqlite evaluation at build time
  const { getEngine } = await import('@/lib/engine');
  const engine = getEngine();

  const stats = await engine.getDashboardStats();
  const projects = await engine.listProjects();

  const hasData = stats.totalObservations > 0;

  if (!hasData) {
    return (
      <EmptyState
        title="No observations yet"
        description="Start using Memento to capture decisions, discoveries, and patterns from your coding sessions."
      />
    );
  }

  return (
    <div className="space-y-8">
      {/* Stats */}
      <StatsCards
        stats={{
          totalObservations: stats.totalObservations,
          activeObservations: stats.activeObservations,
          activeSessions: stats.activeSessions,
          projectCount: projects.length,
        }}
      />

      {/* Type distribution + Recent activity */}
      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        <TypeDistribution byType={stats.byType} />
        <RecentActivity observations={stats.recentObservations} />
      </div>
    </div>
  );
}
