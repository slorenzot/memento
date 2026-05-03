import type { MemoryEngine, SearchResult } from '@slorenzot/memento-core';

export interface SearchService {
  search: (query: string, filters?: {
    type?: string;
    projectId?: string;
    limit?: number;
  }) => Promise<SearchResult>;
}

/**
 * Creates a search service wrapping MemoryEngine's FTS5 search.
 *
 * Not a React hook — this is a plain service object.
 * Debouncing is handled at the UI layer (SearchInput component).
 */
export function createSearchService(engine: MemoryEngine): SearchService {
  return {
    async search(query, filters = {}) {
      if (!query || query.trim().length === 0) {
        return { observations: [], total: 0 };
      }

      return engine.search({
        query: query.trim(),
        type: filters.type as 'decision' | 'bug' | 'discovery' | 'note' | undefined,
        projectId: filters.projectId,
        limit: filters.limit ?? 50,
        offset: 0,
        includeDeleted: false,
      });
    },
  };
}
