import Link from 'next/link';
import { RelativeTime } from '@/components/shared/RelativeTime';
import { Badge } from '@/components/shared/Badge';
import type { Session } from '@slorenzot/memento-core';

interface SessionCardProps {
  session: Session;
}

export function SessionCard({ session }: SessionCardProps) {
  const isActive = !session.endedAt;

  return (
    <Link
      href={`/sessions/${session.id}`}
      className="block rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-4 transition-colors hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-hover)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`inline-block h-2 w-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-[var(--color-tertiary)]'}`} />
            <h3 className="text-[14px] font-medium text-[var(--color-text-primary)]">
              Session #{session.id}
            </h3>
          </div>
          <div className="mt-1 flex items-center gap-3 text-[12px] text-[var(--color-tertiary)]">
            <span>{session.projectId}</span>
            <RelativeTime date={session.startedAt} />
            {session.endedAt && (
              <>
                <span>→</span>
                <RelativeTime date={session.endedAt} />
              </>
            )}
          </div>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[12px] font-medium ${isActive ? 'bg-green-100 text-green-700' : 'bg-[var(--color-surface-hover)] text-[var(--color-secondary)]'}`}>
          {isActive ? 'Active' : 'Ended'}
        </span>
      </div>
    </Link>
  );
}
