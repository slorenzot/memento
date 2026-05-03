import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import { createMementoConnection } from './hooks/useMemento';
import { createSearchService } from './hooks/useSearch';
import { Dashboard } from './views/Dashboard';
import { ObservationsList } from './views/ObservationsList';
import { Search } from './views/Search';
import { ObservationDetail } from './views/ObservationDetail';
import { StatusBar } from './components/StatusBar';
import { SplitPane } from './components/SplitPane';
import type { DashboardStats, Observation, SearchResult } from '@slorenzot/memento-core';
import { layout } from './theme';

type ViewName = 'dashboard' | 'observations' | 'search' | 'detail' | 'sessions' | 'projects';
type PanelFocus = 'left' | 'right';

const VIEW_SHORTCUTS: Record<string, ViewName> = {
  '1': 'dashboard',
  '2': 'observations',
  '3': 'search',
  '4': 'detail',
  '5': 'sessions',
  '6': 'projects',
};

interface AppState {
  currentView: ViewName;
  selectedIndex: number;
  page: number;
  observations: Observation[];
  totalObservations: number;
  stats: DashboardStats | null;
  loading: boolean;
  error: string | null;
  // Phase 2: Search state
  searchQuery: string;
  searchResults: Observation[];
  searchTotal: number;
  isSearching: boolean;
  // Phase 2: Detail state
  selectedObservation: Observation | null;
  detailScrollOffset: number;
  // Phase 2: Split pane state
  panelFocus: PanelFocus;
}

export function App({ dbPath }: { dbPath?: string }) {
  const { exit } = useApp();
  const memento = createMementoConnection({ dbPath });
  const searchService = createSearchService(memento.engine);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [state, setState] = useState<AppState>({
    currentView: 'dashboard',
    selectedIndex: 0,
    page: 1,
    observations: [],
    totalObservations: 0,
    stats: null,
    loading: true,
    error: null,
    searchQuery: '',
    searchResults: [],
    searchTotal: 0,
    isSearching: false,
    selectedObservation: null,
    detailScrollOffset: 0,
    panelFocus: 'left',
  });

  // Load data for current view
  const loadViewData = useCallback(async (view: ViewName) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      if (view === 'dashboard') {
        const stats = await memento.engine.getDashboardStats();
        setState((prev) => ({ ...prev, stats, loading: false }));
      } else if (view === 'observations') {
        const { pageSize: limit } = layout;
        const offset = (state.page - 1) * limit;
        const result: SearchResult = await memento.engine.search({
          limit,
          offset,
          includeDeleted: false,
        });
        setState((prev) => ({
          ...prev,
          observations: result.observations,
          totalObservations: result.total,
          loading: false,
        }));
      } else if (view === 'search') {
        // Pre-load empty search
        setState((prev) => ({ ...prev, loading: false }));
      }
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      }));
    }
  }, [memento.engine, state.page]);

  // Load data when view changes
  useEffect(() => {
    loadViewData(state.currentView);
  }, [state.currentView, state.page]);

  // Debounced search
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setState((prev) => ({
        ...prev,
        searchResults: [],
        searchTotal: 0,
        isSearching: false,
      }));
      return;
    }

    setState((prev) => ({ ...prev, isSearching: true }));
    try {
      const results = await searchService.search(query);
      setState((prev) => ({
        ...prev,
        searchResults: results.observations,
        searchTotal: results.total,
        isSearching: false,
      }));
    } catch {
      setState((prev) => ({ ...prev, isSearching: false }));
    }
  }, [searchService]);

  const debouncedSearch = useCallback((query: string) => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    searchDebounceRef.current = setTimeout(() => {
      performSearch(query);
    }, layout.searchDebounceMs);
  }, [performSearch]);

  // Load detail for selected observation
  const loadDetail = useCallback(async (id: number) => {
    try {
      const obs = await memento.engine.getObservation(id);
      if (obs) {
        setState((prev) => ({
          ...prev,
          selectedObservation: obs,
          detailScrollOffset: 0,
          currentView: 'detail',
        }));
      }
    } catch {
      // ignore
    }
  }, [memento.engine]);

  // Global key handler
  useInput((input, key) => {
    // Quit
    if (input === 'q') {
      memento.close();
      exit();
      return;
    }

    // Search mode — capture all input
    if (state.currentView === 'search') {
      if (key.escape) {
        setState((prev) => ({
          ...prev,
          currentView: 'observations',
          searchQuery: '',
          searchResults: [],
          searchTotal: 0,
        }));
        return;
      }
      if (key.return) {
        // Open detail for selected result
        if (state.searchResults.length > 0) {
          loadDetail(state.searchResults[state.selectedIndex].id);
        }
        return;
      }
      if (key.downArrow || input === 'j') {
        setState((prev) => ({
          ...prev,
          selectedIndex: Math.min(prev.selectedIndex + 1, prev.searchResults.length - 1),
        }));
        return;
      }
      if (key.upArrow || input === 'k') {
        setState((prev) => ({
          ...prev,
          selectedIndex: Math.max(prev.selectedIndex - 1, 0),
        }));
        return;
      }
      if (key.backspace) {
        const newQuery = state.searchQuery.slice(0, -1);
        setState((prev) => ({ ...prev, searchQuery: newQuery, selectedIndex: 0 }));
        debouncedSearch(newQuery);
        return;
      }
      if (input.length === 1 && !key.ctrl) {
        const newQuery = state.searchQuery + input;
        setState((prev) => ({ ...prev, searchQuery: newQuery, selectedIndex: 0 }));
        debouncedSearch(newQuery);
        return;
      }
      return; // Don't process other keys in search mode
    }

    // Detail mode — scroll
    if (state.currentView === 'detail') {
      if (key.escape) {
        setState((prev) => ({
          ...prev,
          currentView: 'observations',
          selectedObservation: null,
        }));
        return;
      }
      if (key.downArrow || input === 'j') {
        setState((prev) => ({ ...prev, detailScrollOffset: prev.detailScrollOffset + 5 }));
        return;
      }
      if (key.upArrow || input === 'k') {
        setState((prev) => ({
          ...prev,
          detailScrollOffset: Math.max(0, prev.detailScrollOffset - 5),
        }));
        return;
      }
      return;
    }

    // View shortcuts (1-6)
    if (VIEW_SHORTCUTS[input] && VIEW_SHORTCUTS[input] !== state.currentView) {
      const newView = VIEW_SHORTCUTS[input];
      setState((prev) => ({
        ...prev,
        currentView: newView,
        selectedIndex: 0,
        page: 1,
        searchQuery: '',
      }));
      return;
    }

    // Escape — go back to dashboard
    if (key.escape && state.currentView !== 'dashboard') {
      setState((prev) => ({
        ...prev,
        currentView: 'dashboard',
        selectedIndex: 0,
        page: 1,
      }));
      return;
    }

    // / opens search from observations view
    if (input === '/' && state.currentView === 'observations') {
      setState((prev) => ({
        ...prev,
        currentView: 'search',
        searchQuery: '',
        selectedIndex: 0,
      }));
      return;
    }

    // Observations navigation
    if (state.currentView === 'observations') {
      if (key.downArrow || input === 'j') {
        setState((prev) => ({
          ...prev,
          selectedIndex: Math.min(prev.selectedIndex + 1, prev.observations.length - 1),
        }));
      } else if (key.upArrow || input === 'k') {
        setState((prev) => ({
          ...prev,
          selectedIndex: Math.max(prev.selectedIndex - 1, 0),
        }));
      } else if (input === '>' || key.rightArrow) {
        const totalPages = Math.ceil(state.totalObservations / layout.pageSize);
        if (state.page < totalPages) {
          setState((prev) => ({ ...prev, page: prev.page + 1, selectedIndex: 0 }));
        }
      } else if (input === '<' || key.leftArrow) {
        if (state.page > 1) {
          setState((prev) => ({ ...prev, page: prev.page - 1, selectedIndex: 0 }));
        }
      } else if (key.return) {
        // Open detail for selected observation
        if (state.observations.length > 0) {
          loadDetail(state.observations[state.selectedIndex].id);
        }
      } else if (input === 'Tab') {
        // Toggle detail panel
        setState((prev) => ({
          ...prev,
          panelFocus: prev.panelFocus === 'left' ? 'right' : 'left',
        }));
      }
    }
  });

  // Error state
  if (!memento.isReady) {
    return (
      <Box padding={1} flexDirection="column">
        <Text color="red" bold>
          ✗ Failed to connect to Memento database
        </Text>
        <Text dimColor>
          {memento.engine.getInitError()?.message ?? 'Unknown error'}
        </Text>
        <Text dimColor>Press q to exit</Text>
      </Box>
    );
  }

  // Loading state
  if (state.loading) {
    return (
      <Box padding={1}>
        <Text dimColor>Loading...</Text>
      </Box>
    );
  }

  // Error state
  if (state.error) {
    return (
      <Box padding={1} flexDirection="column">
        <Text color="red" bold>Error: {state.error}</Text>
        <Text dimColor>Press Esc to go back</Text>
      </Box>
    );
  }

  // Key bindings for status bar
  const keyBindings = ['q: quit', '1-6: views', 'Esc: back'];
  if (state.currentView === 'observations') {
    keyBindings.push('j/k: nav', '</>: page', '/: search', 'Enter: detail');
  } else if (state.currentView === 'search') {
    keyBindings.push('type to search', 'Enter: open', 'Esc: close');
  } else if (state.currentView === 'detail') {
    keyBindings.push('j/k: scroll', 'Esc: back');
  }

  return (
    <Box flexDirection="column" height="100%">
      {/* Main content area */}
      <Box flexGrow={1}>
        {state.currentView === 'dashboard' && state.stats && (
          <Dashboard stats={state.stats} />
        )}
        {(state.currentView === 'observations' || state.currentView === 'detail') && (
          <SplitPane
            focus={state.panelFocus}
            left={
              <ObservationsList
                observations={state.observations}
                total={state.totalObservations}
                selectedIndex={state.selectedIndex}
                page={state.page}
                totalPages={Math.max(1, Math.ceil(state.totalObservations / layout.pageSize))}
                onSelect={(obs) => loadDetail(obs.id)}
              />
            }
            right={
              state.selectedObservation ? (
                <ObservationDetail
                  observation={state.selectedObservation}
                  scrollOffset={state.detailScrollOffset}
                />
              ) : (
                <Box padding={1}>
                  <Text dimColor>Select an observation to view details</Text>
                  <Text dimColor>Press Enter on a row</Text>
                </Box>
              )
            }
          />
        )}
        {state.currentView === 'search' && (
          <Search
            query={state.searchQuery}
            results={state.searchResults}
            total={state.searchTotal}
            selectedIndex={state.selectedIndex}
            onQueryChange={(q) => {
              setState((prev) => ({ ...prev, searchQuery: q }));
              debouncedSearch(q);
            }}
            onSelect={(obs) => loadDetail(obs.id)}
          />
        )}
        {state.currentView === 'sessions' && (
          <Box padding={1}>
            <Text dimColor>Sessions view — coming in Phase 3</Text>
          </Box>
        )}
        {state.currentView === 'projects' && (
          <Box padding={1}>
            <Text dimColor>Projects view — coming in Phase 3</Text>
          </Box>
        )}
      </Box>

      {/* Status bar */}
      <StatusBar
        currentView={state.currentView}
        keyBindings={keyBindings}
        totalCount={
          state.currentView === 'observations'
            ? state.totalObservations
            : state.currentView === 'search'
            ? state.searchTotal
            : undefined
        }
      />
    </Box>
  );
}
