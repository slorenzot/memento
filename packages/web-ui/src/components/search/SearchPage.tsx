'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { ObservationCard } from '@/components/observations/ObservationCard';
import type { Observation } from '@slorenzot/memento-core';

const SEARCH_PAGE_SIZE = 50;

export function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Observation[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [searching, setSearching] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = useCallback(async (searchOffset = 0) => {
    if (!query.trim()) return;

    const isLoadMore = searchOffset > 0;
    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setSearching(true);
    }

    try {
      const res = await fetch('/api/observations/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query.trim(),
          limit: SEARCH_PAGE_SIZE,
          offset: searchOffset,
        }),
      });
      const data = await res.json();

      if (isLoadMore) {
        // Deduplicate by id (safety net)
        const existingIds = new Set(results.map((r) => r.id));
        const newObs = data.observations.filter((o: Observation) => !existingIds.has(o.id));
        setResults((prev) => [...prev, ...newObs]);
      } else {
        setResults(data.observations);
      }

      setTotal(data.total);
      setOffset(searchOffset);
    } finally {
      setSearching(false);
      setLoadingMore(false);
      setSearched(true);
    }
  }, [query, results]);

  const handleLoadMore = useCallback(() => {
    handleSearch(offset + SEARCH_PAGE_SIZE);
  }, [handleSearch, offset]);

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    // Reset results when query changes
    if (value.trim() !== query.trim()) {
      setResults([]);
      setTotal(0);
      setOffset(0);
      setSearched(false);
    }
  }, [query]);

  const hasMore = results.length < total;

  return (
    <div className="space-y-6">
      <h1 className="text-[20px] font-medium text-[var(--color-text-primary)]">Search</h1>

      {/* Search input */}
      <div className="flex gap-3">
        <input
          type="text"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search observations with FTS5..."
          className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2.5 text-[14px] text-[var(--color-text-primary)] placeholder:text-[var(--color-tertiary)] focus:border-[var(--color-border-strong)] focus:outline-none"
          autoFocus
        />
        <button
          onClick={() => handleSearch()}
          disabled={searching || !query.trim()}
          className="rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-[14px] font-medium text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-50 transition-colors"
        >
          {searching ? 'Searching...' : 'Search'}
        </button>
      </div>

      {/* Results */}
      {searched && (
        <div>
          <p className="mb-3 text-[13px] text-[var(--color-tertiary)]">
            {total} result{total !== 1 ? 's' : ''} for &ldquo;{query}&rdquo;
            {hasMore && (
              <> — showing {results.length} of {total}</>
            )}
          </p>
          {results.length === 0 ? (
            <p className="py-8 text-center text-[14px] text-[var(--color-tertiary)]">
              No observations found.
            </p>
          ) : (
            <>
              <div className="grid gap-3">
                {results.map((obs) => (
                  <ObservationCard key={obs.id} observation={obs} />
                ))}
              </div>

              {hasMore && (
                <div className="flex justify-center pt-6">
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-[13px] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] disabled:opacity-50 transition-colors"
                  >
                    {loadingMore ? 'Loading...' : 'Load more'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
