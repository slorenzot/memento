'use client';

import Link from 'next/link';
import { RelativeTime } from '@/components/shared/RelativeTime';
import { useT } from '@/i18n/translation-context';
import { useLocalePrefix } from '@/i18n/use-locale-prefix';
import { ClockIcon, FolderIcon, LayersIcon, PlayIcon, StopCircleIcon } from 'lucide-react';
import type { Session } from '@slorenzot/memento-core';

interface SessionCardProps {
  session: Session;
  observationCount?: number;
}

export function SessionCard({ session, observationCount }: SessionCardProps) {
  const t = useT();
  const prefix = useLocalePrefix();
  const isActive = !session.endedAt;
  const obsCount = observationCount ?? session.observationCount ?? 0;

  return (
    <Link
      href={`${prefix}/sessions/${session.id}`}
      className="block rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-4 transition-colors hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-hover)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {isActive ? (
              <PlayIcon className="size-4 text-green-500" />
            ) : (
              <StopCircleIcon className="size-4 text-[var(--color-tertiary)]" />
            )}
            <h3 className="text-[14px] font-medium text-[var(--color-text-primary)]">
              Session #{session.id}
            </h3>
          </div>
          <div className="mt-2 flex items-center gap-3 text-[12px] text-[var(--color-tertiary)]">
            {session.projectId && (
              <div className="flex items-center gap-1.5">
                <FolderIcon className="size-4" />
                <span>{session.projectId}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <LayersIcon className="size-4" />
              <span>{obsCount} {obsCount === 1 ? t.sessions.observationSingular : t.sessions.observationPlural}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ClockIcon className="size-4" />
              <RelativeTime date={session.startedAt} />
            </div>
            {session.endedAt && (
              <>
                <span>→</span>
                <RelativeTime date={session.endedAt} />
              </>
            )}
          </div>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[12px] font-medium ${isActive ? 'bg-green-100 text-green-700' : 'bg-[var(--color-surface-hover)] text-[var(--color-secondary)]'}`}>
          {isActive ? t.common.active : t.common.ended}
        </span>
      </div>
    </Link>
  );
}
