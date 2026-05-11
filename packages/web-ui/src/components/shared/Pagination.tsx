'use client';

import Link from 'next/link';
import { useT } from '@/i18n/translation-context';

interface PaginationProps {
  /** Current page number (1-based) */
  currentPage: number;
  /** Total number of items */
  totalItems: number;
  /** Items per page */
  pageSize: number;
  /** Base path for links (e.g. '/observations') */
  basePath: string;
  /** Additional query params to preserve (e.g. 'type=bug&scope=project') */
  queryParams?: Record<string, string | undefined>;
}

function buildHref(basePath: string, page: number, queryParams?: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  params.set('page', String(page));

  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined) {
        params.set(key, value);
      }
    }
  }

  return `${basePath}?${params.toString()}`;
}

export function Pagination({ currentPage, totalItems, pageSize, basePath, queryParams }: PaginationProps) {
  const t = useT();
  const totalPages = Math.ceil(totalItems / pageSize);

  if (totalPages <= 1) return null;

  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;
  const pageLabel = t.common.page
    .replace('{current}', String(currentPage))
    .replace('{total}', String(totalPages));

  return (
    <nav className="flex items-center justify-center gap-2 pt-6" aria-label="Pagination">
      {hasPrev ? (
        <Link
          href={buildHref(basePath, currentPage - 1, queryParams)}
          className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-[13px] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-colors"
        >
          ← {t.common.previous}
        </Link>
      ) : (
        <span className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-[13px] text-[var(--color-tertiary)] opacity-50 cursor-not-allowed">
          ← {t.common.previous}
        </span>
      )}

      <span className="px-3 text-[13px] text-[var(--color-tertiary)]">
        {pageLabel}
      </span>

      {hasNext ? (
        <Link
          href={buildHref(basePath, currentPage + 1, queryParams)}
          className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-[13px] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-colors"
        >
          {t.common.next} →
        </Link>
      ) : (
        <span className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-[13px] text-[var(--color-tertiary)] opacity-50 cursor-not-allowed">
          {t.common.next} →
        </span>
      )}
    </nav>
  );
}
