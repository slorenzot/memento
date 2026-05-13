'use client';

import { DeleteConfirmation } from '@/components/observations/DeleteConfirmation';
import { Badge } from '@/components/shared/Badge';
import { MarkdownContent } from '@/components/shared/MarkdownContent';
import { RelativeTime } from '@/components/shared/RelativeTime';
import { useT } from '@/i18n/translation-context';
import { useLocalePrefix } from '@/i18n/use-locale-prefix';
import type { Observation, Session } from '@slorenzot/memento-core';
import { ClockIcon, EyeIcon, FolderIcon, MessageSquareIcon, PinIcon, TagsIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface ObservationDetailProps {
  observation: Observation;
  session?: Session | null;
}

export default function ObservationDetailPage({ observation, session }: ObservationDetailProps) {
  const router = useRouter();
  const t = useT();
  const prefix = useLocalePrefix();
  const [showDelete, setShowDelete] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {observation.pinned && (
              <span className="text-[var(--color-tertiary)]" title="Pinned">
                <PinIcon className="size-4" />
              </span>
            )}
            <h1 className="text-[20px] font-medium text-[var(--color-text-primary)]">
              {observation.title}
            </h1>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-[13px] text-[var(--color-tertiary)]">
            <Badge type={observation.type} />
            {session && (
              <Link
                href={`${prefix}/sessions/${session.id}`}
                className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[12px] font-medium transition-colors ${!session.endedAt ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-[var(--color-surface-hover)] text-[var(--color-secondary)] hover:bg-[var(--color-border)]'}`}
              >
                <MessageSquareIcon className="size-3.5" />
                <span
                  className={`inline-block size-1.5 rounded-full ${!session.endedAt ? 'bg-green-500' : 'bg-[var(--color-tertiary)]'}`}
                />
                {t.sessionDetail.session.replace('{id}', String(session.id))}
                <span className="opacity-70">·</span>
                {!session.endedAt ? t.common.active : t.common.ended}
              </Link>
            )}
            {observation.projectId && (
              <span className="flex justify-start items-center gap-2">
                <FolderIcon className="size-4" /> {observation.projectId}
              </span>
            )}
            {observation.topicKey && (
              <span className="flex justify-start items-center gap-2">
                <TagsIcon className="size-4" /> {observation.topicKey}
              </span>
            )}
            <span className="flex justify-start items-center gap-2">
              <EyeIcon className="size-4" />
              {observation.scope}
            </span>
            <div className="flex items-center gap-2">
              <ClockIcon className="size-4" />
              <RelativeTime date={observation.createdAt} />
              {observation.revisionCount > 0 && (
                <span>
                  {(observation.revisionCount === 1
                    ? t.common.revisions_one
                    : t.common.revisions_other
                  ).replace('{count}', String(observation.revisionCount))}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!observation.deletedAt && !observation.readOnly && (
            <Link
              href={`${prefix}/observations/${observation.id}/edit`}
              className="rounded-full border border-[var(--color-border)] px-4 py-1.5 text-[13px] text-[var(--color-secondary)] hover:bg-[var(--color-surface-hover)] transition-colors"
            >
              {t.common.edit}
            </Link>
          )}
          {!observation.deletedAt && (
            <button
              onClick={() => setShowDelete(true)}
              className="rounded-full border border-red-200 px-4 py-1.5 text-[13px] text-red-600 hover:bg-red-50 transition-colors"
            >
              {t.common.delete}
            </button>
          )}
          {observation.deletedAt && (
            <button
              onClick={async () => {
                await fetch(`/api/observations/${observation.id}/restore`, { method: 'POST' });
                router.refresh();
              }}
              className="rounded-full bg-green-600 px-4 py-1.5 text-[13px] text-white hover:bg-green-700 transition-colors"
            >
              {t.common.restore}
            </button>
          )}
        </div>
      </div>

      {/* Delete confirmation */}
      {showDelete && (
        <DeleteConfirmation
          observationId={observation.id}
          observationTitle={observation.title}
          onCancel={() => setShowDelete(false)}
          onDeleted={() => router.push(`${prefix}/observations`)}
        />
      )}

      {/* Content */}
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-6">
        <MarkdownContent content={observation.content} />
      </div>

      {/* Metadata */}
      {Object.keys(observation.metadata).length > 0 && (
        <details className="rounded-lg border border-[var(--color-border)] p-4">
          <summary className="cursor-pointer text-[13px] font-medium text-[var(--color-secondary)]">
            {t.common.metadata}
          </summary>
          <pre className="mt-2 text-[12px] text-[var(--color-tertiary)]">
            {JSON.stringify(observation.metadata, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}
