'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/shared/Badge';
import { RelativeTime } from '@/components/shared/RelativeTime';
import { ObservationCard } from '@/components/observations/ObservationCard';
import type { Observation } from '@slorenzot/memento-core';

export function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Observation[]>([]);
  const [total, setTotal] = useState(0);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await fetch('/api/observations/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim(), limit: 50 }),
      });
      const data = await res.json();
      setResults(data.observations);
      setTotal(data.total);
    } finally {
      setSearching(false);
      setSearched(true);
    }
  }, [query]);

  return (
    <div className="space-y-6">
      <h1 className="text-[20px] font-medium text-[var(--color-text-primary)]">Search</h1>

      {/* Search input */}
      <div className="flex gap-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search observations with FTS5..."
          className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2.5 text-[14px] text-[var(--color-text-primary)] placeholder:text-[var(--color-tertiary)] focus:border-[var(--color-border-strong)] focus:outline-none"
          autoFocus
        />
        <button
          onClick={handleSearch}
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
          </p>
          {results.length === 0 ? (
            <p className="py-8 text-center text-[14px] text-[var(--color-tertiary)]">
              No observations found.
            </p>
          ) : (
            <div className="grid gap-3">
              {results.map((obs) => (
                <ObservationCard key={obs.id} observation={obs} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
