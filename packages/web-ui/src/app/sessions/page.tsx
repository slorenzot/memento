import { getEngine } from '@/lib/engine';
import { PAGE_SIZE } from '@/lib/constants';
import { SessionCard } from '@/components/sessions/SessionCard';
import { Pagination } from '@/components/shared/Pagination';
import { EmptyState } from '@/components/shared/EmptyState';

export const dynamic = 'force-dynamic';

interface SessionsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function SessionsPage({ searchParams }: SessionsPageProps) {
  const params = await searchParams;
  const engine = getEngine();

  const page = Math.max(1, Number(params.page) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const result = await engine.listSessions({
    projectId: typeof params.projectId === 'string' ? params.projectId : undefined,
    limit: PAGE_SIZE,
    offset,
  });

  if (result.sessions.length === 0 && page === 1) {
    return (
      <div className="space-y-6">
        <h1 className="text-[20px] font-medium text-[var(--color-text-primary)]">Sessions</h1>
        <EmptyState
          title="No sessions yet"
          description="Sessions are created automatically when you create observations."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-[20px] font-medium text-[var(--color-text-primary)]">
        Sessions
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
        basePath="/sessions"
      />
    </div>
  );
}
