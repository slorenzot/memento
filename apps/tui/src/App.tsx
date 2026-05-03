import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import { createMementoConnection, type MementoConnection } from './hooks/useMemento';
import { Dashboard } from './views/Dashboard';
import { ObservationsList } from './views/ObservationsList';
import { StatusBar } from './components/StatusBar';
import type { DashboardStats, Observation, SearchResult } from '@slorenzot/memento-core';
import { layout } from './theme';

type ViewName = 'dashboard' | 'observations' | 'search' | 'detail' | 'sessions' | 'projects';

const VIEW_NAMES: Record<ViewName, string> = {
  dashboard: 'Dashboard',
  observations: 'Observations',
  search: 'Search',
  detail: 'Detail',
  sessions: 'Sessions',
  projects: 'Projects',
};

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
}

export function App({ dbPath }: { dbPath?: string }) {
  const { exit } = useApp();
  const memento = createMementoConnection({ dbPath });

  const [state, setState] = useState<AppState>({
    currentView: 'dashboard',
    selectedIndex: 0,
    page: 1,
    observations: [],
    totalObservations: 0,
    stats: null,
    loading: true,
    error: null,
  });

  // Load data for current view
  const loadViewData = useCallback(async (view: ViewName) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      if (view === 'dashboard') {
        const stats = await memento.engine.getDashboardStats();
        setState((prev) => ({ ...prev, stats, loading: false }));
      } else if (view === 'observations') {
        const { limit } = layout;
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

  // Global key handler
  useInput((input, key) => {
    // Quit
    if (input === 'q') {
      memento.close();
      exit();
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

    // View-specific navigation
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
        // Next page
        const totalPages = Math.ceil(state.totalObservations / layout.pageSize);
        if (state.page < totalPages) {
          setState((prev) => ({ ...prev, page: prev.page + 1, selectedIndex: 0 }));
        }
      } else if (input === '<' || key.leftArrow) {
        // Prev page
        if (state.page > 1) {
          setState((prev) => ({ ...prev, page: prev.page - 1, selectedIndex: 0 }));
        }
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
    keyBindings.push('j/k: nav', '</>: page');
  }

  return (
    <Box flexDirection="column" height="100%">
      {/* Main content area */}
      <Box flexGrow={1}>
        {state.currentView === 'dashboard' && state.stats && (
          <Dashboard stats={state.stats} />
        )}
        {state.currentView === 'observations' && (
          <ObservationsList
            observations={state.observations}
            total={state.totalObservations}
            selectedIndex={state.selectedIndex}
            page={state.page}
            totalPages={Math.max(1, Math.ceil(state.totalObservations / layout.pageSize))}
            onSelect={() => {}}
          />
        )}
        {state.currentView === 'search' && (
          <Box padding={1}>
            <Text dimColor>Search view — coming in Phase 2</Text>
          </Box>
        )}
        {state.currentView === 'detail' && (
          <Box padding={1}>
            <Text dimColor>Detail view — coming in Phase 2</Text>
          </Box>
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
            : undefined
        }
      />
    </Box>
  );
}
