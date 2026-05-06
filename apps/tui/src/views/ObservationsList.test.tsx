import { describe, it, expect } from 'bun:test';
import React from 'react';
import { render } from 'ink-testing-library';
import { ObservationsList } from './ObservationsList';
import type { Observation } from '@slorenzot/memento-core';

const mockObservations: Observation[] = [
  {
    id: 1,
    uuid: 'test-1',
    sessionId: 1,
    title: 'First observation with a very long title that should be truncated',
    content: 'Content 1',
    type: 'decision',
    topicKey: 'arch/test',
    projectId: 'project-a',
    createdAt: new Date(),
    deletedAt: null,
    metadata: {},
  },
  {
    id: 2,
    uuid: 'test-2',
    sessionId: 1,
    title: 'Second observation',
    content: 'Content 2',
    type: 'bug',
    topicKey: null,
    projectId: 'project-b',
    createdAt: new Date(),
    deletedAt: null,
    metadata: {},
  },
  {
    id: 3,
    uuid: 'test-3',
    sessionId: 1,
    title: 'Third observation',
    content: 'Content 3',
    type: 'discovery',
    topicKey: 'perf/query',
    projectId: 'project-a',
    createdAt: new Date(),
    deletedAt: null,
    metadata: {},
  },
];

describe('ObservationsList', () => {
  it('should render observation titles', () => {
    const { lastFrame } = render(
      <ObservationsList
        observations={mockObservations}
        total={3}
        selectedIndex={0}
        page={1}
        totalPages={1}
        onSelect={() => {}}
      />
    );

    const output = lastFrame();
    // Titles should appear (truncated if needed)
    expect(output).toContain('Second observation');
    expect(output).toContain('Third observation');
  });

  it('should show type for each observation', () => {
    const { lastFrame } = render(
      <ObservationsList
        observations={mockObservations}
        total={3}
        selectedIndex={0}
        page={1}
        totalPages={1}
        onSelect={() => {}}
      />
    );

    const output = lastFrame();
    expect(output).toContain('decision');
    expect(output).toContain('bug');
    expect(output).toContain('discovery');
  });

  it('should show IDs for each observation', () => {
    const { lastFrame } = render(
      <ObservationsList
        observations={mockObservations}
        total={3}
        selectedIndex={0}
        page={1}
        totalPages={1}
        onSelect={() => {}}
      />
    );

    const output = lastFrame();
    expect(output).toContain('#1');
    expect(output).toContain('#2');
    expect(output).toContain('#3');
  });

  it('should highlight selected observation', () => {
    const { lastFrame } = render(
      <ObservationsList
        observations={mockObservations}
        total={3}
        selectedIndex={1}
        page={1}
        totalPages={1}
        onSelect={() => {}}
      />
    );

    const output = lastFrame();
    // Second observation should be highlighted
    expect(output).toContain('▶');
  });

  it('should render empty list', () => {
    const { lastFrame } = render(
      <ObservationsList
        observations={[]}
        total={0}
        selectedIndex={0}
        page={1}
        totalPages={1}
        onSelect={() => {}}
      />
    );

    const output = lastFrame();
    expect(output).toContain('No observations');
  });

  it('should show pagination info', () => {
    const { lastFrame } = render(
      <ObservationsList
        observations={mockObservations}
        total={50}
        selectedIndex={0}
        page={2}
        totalPages={3}
        onSelect={() => {}}
      />
    );

    const output = lastFrame();
    expect(output).toContain('2/3');
  });

  it('should show project for each observation', () => {
    const { lastFrame } = render(
      <ObservationsList
        observations={mockObservations}
        total={3}
        selectedIndex={0}
        page={1}
        totalPages={1}
        onSelect={() => {}}
      />
    );

    const output = lastFrame();
    expect(output).toContain('project-a');
    expect(output).toContain('project-b');
  });
});
