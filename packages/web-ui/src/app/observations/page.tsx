import Link from 'next/link';
import { getEngine } from '@/lib/engine';
import { PAGE_SIZE } from '@/lib/constants';
import { ObservationCard } from '@/components/observations/ObservationCard';
import { ObservationFilters } from '@/components/observations/ObservationFilters';
import { Pagination } from '@/components/shared/Pagination';
import { EmptyState } from '@/components/shared/EmptyState';

export const dynamic = 'force-dynamic';

interface ObservationsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ObservationsPage({ searchParams }: ObservationsPageProps) {
  const params = await searchParams;
  const engine = getEngine();

  const page = Math.max(1, Number(params.page) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const [result, projects] = await Promise.all([
    engine.search({
      type: params.type as any ?? undefined,
      scope: params.scope as 'project' | 'personal' | undefined ?? undefined,
      projectId: typeof params.projectId === 'string' ? params.projectId : undefined,
      limit: PAGE_SIZE,
      offset,
    }),
    engine.listProjects(),
  ]);

  const hasFilters = params.type || params.scope || params.projectId;
  const queryParams: Record<string, string | undefined> = {
    type: typeof params.type === 'string' ? params.type : undefined,
    scope: typeof params.scope === 'string' ? params.scope : undefined,
    projectId: typeof params.projectId === 'string' ? params.projectId : undefined,
  };

  if (result.observations.length === 0 && !hasFilters) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-[20px] font-medium text-[var(--color-text-primary)]">Observations</h1>
          <Link
            href="/observations/new"
            className="rounded-full bg-[var(--color-primary)] px-4 py-2 text-[14px] font-medium text-white hover:bg-[var(--color-accent-hover)] transition-colors"
          >
            New observation
          </Link>
        </div>
        <EmptyState
          title="No observations yet"
          description="Create your first observation to start building your persistent memory."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[20px] font-medium text-[var(--color-text-primary)]">
          Observations
          {result.total > 0 && (
            <span className="ml-2 text-[14px] font-normal text-[var(--color-tertiary)]">
              ({result.total})
            </span>
          )}
        </h1>
        <Link
          href="/observations/new"
          className="rounded-full bg-[var(--color-primary)] px-4 py-2 text-[14px] font-medium text-white hover:bg-[var(--color-accent-hover)] transition-colors"
        >
          New observation
        </Link>
      </div>

      <ObservationFilters projects={projects.map((p) => p.name)} />

      {result.observations.length === 0 ? (
        <p className="py-8 text-center text-[14px] text-[var(--color-tertiary)]">
          No observations match these filters.
        </p>
      ) : (
        <div className="grid gap-3">
          {result.observations.map((obs) => (
            <ObservationCard key={obs.id} observation={obs} />
          ))}
        </div>
      )}

      <Pagination
        currentPage={page}
        totalItems={result.total}
        pageSize={PAGE_SIZE}
        basePath="/observations"
        queryParams={queryParams}
      />
    </div>
  );
}
