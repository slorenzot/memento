'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/shared/Badge';
import { RelativeTime } from '@/components/shared/RelativeTime';
import { useLocalePrefix } from '@/i18n/use-locale-prefix';
import type { Observation } from '@slorenzot/memento-core';

interface ObservationCardProps {
  observation: Observation;
}

export function ObservationCard({ observation }: ObservationCardProps) {
  const prefix = useLocalePrefix();

  return (
    <Link
      href={`${prefix}/observations/${observation.id}`}
      className="block rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-4 transition-colors hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-hover)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {observation.pinned && (
              <span className="text-[var(--color-tertiary)]" title="Pinned">📌</span>
            )}
            <h3 className="truncate text-[14px] font-medium text-[var(--color-text-primary)]">
              {observation.title}
            </h3>
          </div>
          {observation.topicKey && (
            <p className="mt-0.5 truncate text-[12px] text-[var(--color-tertiary)]">
              {observation.topicKey}
            </p>
          )}
        </div>
        <Badge type={observation.type} />
      </div>
      <div className="mt-2 flex items-center gap-3 text-[12px] text-[var(--color-tertiary)]">
        {observation.projectId && <span>{observation.projectId}</span>}
        <span>{observation.scope}</span>
        <RelativeTime date={observation.createdAt} />
      </div>
    </Link>
  );
}
