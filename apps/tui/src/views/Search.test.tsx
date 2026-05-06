import { describe, it, expect } from 'bun:test';
import React from 'react';
import { render } from 'ink-testing-library';
import { Search } from './Search';
import type { Observation } from '@slorenzot/memento-core';

const mockResults: Observation[] = [
  {
    id: 1,
    uuid: 'test-1',
    sessionId: 1,
    title: 'Fixed N+1 query in UserList',
    content: 'The UserList component was making one query per user.',
    type: 'bug',
    topicKey: 'perf/query',
    projectId: 'project-a',
    createdAt: new Date(),
    deletedAt: null,
    metadata: {},
  },
  {
    id: 2,
    uuid: 'test-2',
    sessionId: 1,
    title: 'Chose Zustand for state management',
    content: 'Decision to use Zustand for simplicity.',
    type: 'decision',
    topicKey: 'arch/state',
    projectId: 'project-b',
    createdAt: new Date(),
    deletedAt: null,
    metadata: {},
  },
];

describe('Search', () => {
  it('should render search input', () => {
    const { lastFrame } = render(
      <Search
        query="test"
        results={mockResults}
        total={2}
        selectedIndex={0}
        onQueryChange={() => {}}
        onSelect={() => {}}
      />
    );

    const output = lastFrame();
    expect(output).toContain('test');
  });

  it('should render search results', () => {
    const { lastFrame } = render(
      <Search
        query="query"
        results={mockResults}
        total={2}
        selectedIndex={0}
        onQueryChange={() => {}}
        onSelect={() => {}}
      />
    );

    const output = lastFrame();
    expect(output).toContain('Fixed N+1 query');
    expect(output).toContain('Zustand');
  });

  it('should render empty results message', () => {
    const { lastFrame } = render(
      <Search
        query="nonexistent"
        results={[]}
        total={0}
        selectedIndex={0}
        onQueryChange={() => {}}
        onSelect={() => {}}
      />
    );

    const output = lastFrame();
    expect(output).toContain('No results');
  });

  it('should show type badges in results', () => {
    const { lastFrame } = render(
      <Search
        query="test"
        results={mockResults}
        total={2}
        selectedIndex={0}
        onQueryChange={() => {}}
        onSelect={() => {}}
      />
    );

    const output = lastFrame();
    expect(output).toContain('bug');
    expect(output).toContain('decision');
  });

  it('should highlight selected result', () => {
    const { lastFrame } = render(
      <Search
        query="test"
        results={mockResults}
        total={2}
        selectedIndex={1}
        onQueryChange={() => {}}
        onSelect={() => {}}
      />
    );

    const output = lastFrame();
    expect(output).toContain('▶');
  });

  it('should show result count', () => {
    const { lastFrame } = render(
      <Search
        query="test"
        results={mockResults}
        total={2}
        selectedIndex={0}
        onQueryChange={() => {}}
        onSelect={() => {}}
      />
    );

    const output = lastFrame();
    expect(output).toContain('2');
  });
});
