import { getEngine } from '@/lib/engine';
import { PAGE_SIZE } from '@/lib/constants';
import { SessionCard } from '@/components/sessions/SessionCard';
import { Pagination } from '@/components/shared/Pagination';
import { EmptyState } from '@/components/shared/EmptyState';
import { getDictionary } from '@/i18n/get-dictionary';
import type { Locale } from '@/i18n/config';

export const dynamic = 'force-dynamic';

interface LangSessionsPageProps {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function LangSessionsPage({ params, searchParams }: LangSessionsPageProps) {
  const { lang } = await params;
  const sp = await searchParams;
  const engine = getEngine();
  const t = getDictionary(lang as Locale);
  const prefix = `/${lang}`;

  const page = Math.max(1, Number(sp.page) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const result = await engine.listSessions({
    projectId: typeof sp.projectId === 'string' ? sp.projectId : undefined,
    limit: PAGE_SIZE,
    offset,
  });

  if (result.sessions.length === 0 && page === 1) {
    return (
      <div className="space-y-6">
        <h1 className="text-[20px] font-medium text-[var(--color-text-primary)]">
          {t.sessions.title}
        </h1>
        <EmptyState
          title={t.sessions.noSessions}
          description={t.sessions.noSessionsDescription}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-[20px] font-medium text-[var(--color-text-primary)]">
        {t.sessions.title}
        <span className="ml-2 text-[14px] font-normal text-[var(--color-tertiary)]">
          ({result.total})
        </span>
      </h1>

      <div className="grid gap-3">
        {result.sessions.map((session) => (
          <SessionCard key={session.id} session={session} />
        ))}
      </div>

      <Pagination
        currentPage={page}
        totalItems={result.total}
        pageSize={PAGE_SIZE}
        basePath={`${prefix}/sessions`}
      />
    </div>
  );
}
