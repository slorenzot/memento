import Link from 'next/link';
import { getEngine } from '@/lib/engine';
import { PAGE_SIZE } from '@/lib/constants';
import { ObservationCard } from '@/components/observations/ObservationCard';
import { ObservationFilters } from '@/components/observations/ObservationFilters';
import { Pagination } from '@/components/shared/Pagination';
import { EmptyState } from '@/components/shared/EmptyState';
import { getDictionary } from '@/i18n/get-dictionary';
import type { Locale } from '@/i18n/config';

export const dynamic = 'force-dynamic';

interface LangObservationsPageProps {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function LangObservationsPage({ params, searchParams }: LangObservationsPageProps) {
  const { lang } = await params;
  const sp = await searchParams;
  const engine = getEngine();
  const t = getDictionary(lang as Locale);
  const prefix = `/${lang}`;

  const page = Math.max(1, Number(sp.page) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const [result, projects] = await Promise.all([
    engine.search({
      type: sp.type as any ?? undefined,
      scope: sp.scope as 'project' | 'personal' | undefined ?? undefined,
      projectId: typeof sp.projectId === 'string' ? sp.projectId : undefined,
      limit: PAGE_SIZE,
      offset,
    }),
    engine.listProjects(),
  ]);

  const hasFilters = sp.type || sp.scope || sp.projectId;
  const queryParams: Record<string, string | undefined> = {
    type: typeof sp.type === 'string' ? sp.type : undefined,
    scope: typeof sp.scope === 'string' ? sp.scope : undefined,
    projectId: typeof sp.projectId === 'string' ? sp.projectId : undefined,
  };

  if (result.observations.length === 0 && !hasFilters) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-[20px] font-medium text-[var(--color-text-primary)]">
            {t.observations.title}
          </h1>
          <Link
            href={`${prefix}/observations/new`}
            className="rounded-full bg-[var(--color-primary)] px-4 py-2 text-[14px] font-medium text-white hover:bg-[var(--color-accent-hover)] transition-colors"
          >
            {t.observations.newObservation}
          </Link>
        </div>
        <EmptyState
          title={t.observations.noObservations}
          description={t.observations.noObservationsDescription}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[20px] font-medium text-[var(--color-text-primary)]">
          {t.observations.title}
          {result.total > 0 && (
            <span className="ml-2 text-[14px] font-normal text-[var(--color-tertiary)]">
              ({result.total})
            </span>
          )}
        </h1>
        <Link
          href={`${prefix}/observations/new`}
          className="rounded-full bg-[var(--color-primary)] px-4 py-2 text-[14px] font-medium text-white hover:bg-[var(--color-accent-hover)] transition-colors"
        >
          {t.observations.newObservation}
        </Link>
      </div>

      <ObservationFilters projects={projects.map((p) => p.name)} />

      {result.observations.length === 0 ? (
        <p className="py-8 text-center text-[14px] text-[var(--color-tertiary)]">
          {t.observations.noMatch}
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
        basePath={`${prefix}/observations`}
        queryParams={queryParams}
      />
    </div>
  );
}
