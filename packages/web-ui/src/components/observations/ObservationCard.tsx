'use client';

import { Badge } from '@/components/shared/Badge';
import { RelativeTime } from '@/components/shared/RelativeTime';
import { useLocalePrefix } from '@/i18n/use-locale-prefix';
import { useT } from '@/i18n/translation-context';
import type { Observation, Session } from '@slorenzot/memento-core';
import { ClockIcon, EyeIcon, FolderIcon, PinIcon, TagsIcon, MessageSquareIcon } from 'lucide-react';
import Link from 'next/link';

interface ObservationCardProps {
  observation: Observation;
  session?: Session;
}

export function ObservationCard({ observation, session }: ObservationCardProps) {
  const prefix = useLocalePrefix();
  const t = useT();

  return (
    <Link
      href={`${prefix}/observations/${observation.id}`}
      className="block rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-4 transition-colors hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-hover)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {observation.pinned && (
              <span className="text-[var(--color-tertiary)]" title="Pinned">
                <PinIcon className="size-4" />
              </span>
            )}
            <h3 className="truncate text-[14px] font-medium text-[var(--color-text-primary)]">
              {observation.title}
            </h3>
          </div>
          {observation.topicKey && (
            <p className="flex items-center gap-2 mt-0.5 truncate text-[12px] text-[var(--color-tertiary)]">
              <TagsIcon className="size-4" /> {observation.topicKey}
            </p>
          )}
        </div>
        <Badge type={observation.type} />
      </div>
      <div className="mt-2 flex items-center gap-3 text-[12px] text-[var(--color-tertiary)]">
        {observation.projectId && (
          <div className="flex items-center gap-2">
            <FolderIcon className="size-4" />
            <span>{observation.projectId}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <EyeIcon className="size-4" />
          <span>{observation.scope}</span>
        </div>
        {session && (
          <Link
            href={`${prefix}/sessions/${session.id}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 rounded-full px-1.5 py-0.5 transition-colors hover:bg-[var(--color-surface-hover)]"
            title={t.sessionDetail.session.replace('{id}', String(session.id))}
          >
            <MessageSquareIcon className="size-4" />
            <span
              className={`inline-block size-1.5 rounded-full ${!session.endedAt ? 'bg-green-500' : 'bg-[var(--color-tertiary)]'}`}
            />
            <span>
              {t.timeline.sessionLabel.replace('{id}', String(session.id))}
            </span>
          </Link>
        )}
        <div className="flex items-center gap-2">
          <ClockIcon className="size-4" />
          <RelativeTime date={observation.createdAt} />
        </div>
      </div>
    </Link>
  );
}
