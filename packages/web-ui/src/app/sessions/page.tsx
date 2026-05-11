import { getEngine } from '@/lib/engine';
import { SessionCard } from '@/components/sessions/SessionCard';
import { EmptyState } from '@/components/shared/EmptyState';

export const dynamic = 'force-dynamic';

export default async function SessionsPage() {
  const engine = getEngine();
  const result = await engine.listSessions({ limit: 50 });

  if (result.sessions.length === 0) {
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
    </div>
  );
}
