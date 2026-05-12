'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { ObservationCard } from '@/components/observations/ObservationCard';
import { Badge } from '@/components/shared/Badge';
import { EmptyState } from '@/components/shared/EmptyState';
import { useT } from '@/i18n/translation-context';
import type { Observation } from '@slorenzot/memento-core';

const SEARCH_PAGE_SIZE = 50;

const TYPES = [
  'decision', 'bug', 'discovery', 'note', 'summary',
  'learning', 'pattern', 'architecture', 'config', 'preference',
];

const SCOPES = ['project', 'personal'] as const;

export function SearchPage() {
  const t = useT();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') ?? '';
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<Observation[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [searching, setSearching] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searched, setSearched] = useState(false);

  // Filters
  const [activeType, setActiveType] = useState('');
  const [activeScope, setActiveScope] = useState('');
  const [activeProject, setActiveProject] = useState('');
  const [projects, setProjects] = useState<string[]>([]);

  // Auto-execute search when arriving from header with ?q= param
  const [initialSearchDone, setInitialSearchDone] = useState(false);

  // Load projects list on mount
  useEffect(() => {
    async function loadProjects() {
      try {
        const res = await fetch('/api/projects');
        const data = await res.json();
        // API returns array of { project_id, ... } — extract names
        const names = (data.data ?? data).map((p: { project_id: string } | string) =>
          typeof p === 'string' ? p : p.project_id
        );
        setProjects(names);
      } catch {
        // Silently fail — project filter just won't show options
      }
    }
    loadProjects();
  }, []);

  const handleSearch = useCallback(async (searchOffset = 0) => {
    if (!query.trim()) return;

    const isLoadMore = searchOffset > 0;
    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setSearching(true);
    }

    try {
      const body: Record<string, unknown> = {
        query: query.trim(),
        limit: SEARCH_PAGE_SIZE,
        offset: searchOffset,
      };

      // Add filters only when set
      if (activeType) body.type = activeType;
      if (activeScope) body.scope = activeScope;
      if (activeProject) body.projectId = activeProject;

      const res = await fetch('/api/observations/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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
  }, [query, results, activeType, activeScope, activeProject]);

  // Auto-search on mount when arriving with ?q= param from header
  useEffect(() => {
    if (initialQuery && !initialSearchDone) {
      setInitialSearchDone(true);
      handleSearch();
    }
  }, [initialQuery, initialSearchDone, handleSearch]);

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

  const resultsLabel = total === 1
    ? t.searchPage.results.replace('{total}', String(total)).replace('{query}', query)
    : t.searchPage.results.replace('{total}', String(total)).replace('{query}', query);

  return (
    <div className="space-y-6">
      <h1 className="text-[20px] font-medium text-[var(--color-text-primary)]">
        {t.searchPage.title}
      </h1>

      {/* Search input */}
      <div className="flex gap-3">
        <input
          type="text"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder={t.searchPage.placeholder}
          className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2.5 text-[14px] text-[var(--color-text-primary)] placeholder:text-[var(--color-tertiary)] focus:border-[var(--color-border-strong)] focus:outline-none"
          autoFocus
        />
        <button
          onClick={() => handleSearch()}
          disabled={searching || !query.trim()}
          className="rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-[14px] font-medium text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-50 transition-colors"
        >
          {searching ? t.common.searching : t.common.search}
        </button>
      </div>

      {/* Filters — always visible */}
      <div className="space-y-3">
        {/* Type filter badges */}
        <div className="flex flex-wrap gap-1.5">
          {TYPES.map((type) => (
            <Badge
              key={type}
              type={type}
              active={activeType === type}
              onClick={() => setActiveType(activeType === type ? '' : type)}
            />
          ))}
        </div>

        {/* Scope + Project selects */}
        <div className="flex items-center gap-3">
          <select
            value={activeScope}
            onChange={(e) => setActiveScope(e.target.value)}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-[13px] text-[var(--color-text-primary)]"
          >
            <option value="">{t.common.allScopes}</option>
            {SCOPES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {projects.length > 0 && (
            <select
              value={activeProject}
              onChange={(e) => setActiveProject(e.target.value)}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-[13px] text-[var(--color-text-primary)]"
            >
              <option value="">{t.common.allProjects}</option>
              {projects.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Initial empty state with hint */}
      {!searched && (
        <EmptyState
          title={t.searchPage.hintTitle}
          description={t.searchPage.hintDescription}
        />
      )}

      {/* Results */}
      {searched && (
        <div>
          <p className="mb-3 text-[13px] text-[var(--color-tertiary)]">
            {resultsLabel}
            {hasMore && (
              <> {t.searchPage.showing.replace('{shown}', String(results.length)).replace('{total}', String(total))}</>
            )}
          </p>
          {results.length === 0 ? (
            <p className="py-8 text-center text-[14px] text-[var(--color-tertiary)]">
              {t.searchPage.noResults}
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
                    {loadingMore ? t.common.loading : t.common.loadMore}
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
