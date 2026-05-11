'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/shared/Badge';
import { RelativeTime } from '@/components/shared/RelativeTime';
import { MarkdownContent } from '@/components/shared/MarkdownContent';
import { DeleteConfirmation } from '@/components/observations/DeleteConfirmation';
import type { Observation } from '@slorenzot/memento-core';

interface ObservationDetailProps {
  observation: Observation;
}

export default function ObservationDetailPage({ observation }: ObservationDetailProps) {
  const router = useRouter();
  const [showDelete, setShowDelete] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {observation.pinned && <span title="Pinned">📌</span>}
            <h1 className="text-[20px] font-medium text-[var(--color-text-primary)]">
              {observation.title}
            </h1>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-[13px] text-[var(--color-tertiary)]">
            <Badge type={observation.type} />
            {observation.topicKey && <span>{observation.topicKey}</span>}
            {observation.projectId && <span>{observation.projectId}</span>}
            <span>{observation.scope}</span>
            <RelativeTime date={observation.createdAt} />
            {observation.revisionCount > 0 && (
              <span>{observation.revisionCount} revision{observation.revisionCount > 1 ? 's' : ''}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!observation.deletedAt && !observation.readOnly && (
            <Link
              href={`/observations/${observation.id}/edit`}
              className="rounded-full border border-[var(--color-border)] px-4 py-1.5 text-[13px] text-[var(--color-secondary)] hover:bg-[var(--color-surface-hover)] transition-colors"
            >
              Edit
            </Link>
          )}
          {!observation.deletedAt && (
            <button
              onClick={() => setShowDelete(true)}
              className="rounded-full border border-red-200 px-4 py-1.5 text-[13px] text-red-600 hover:bg-red-50 transition-colors"
            >
              Delete
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
              Restore
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
          onDeleted={() => router.push('/observations')}
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
            Metadata
          </summary>
          <pre className="mt-2 text-[12px] text-[var(--color-tertiary)]">
            {JSON.stringify(observation.metadata, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}
