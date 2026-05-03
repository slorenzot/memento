import { describe, it, expect } from 'bun:test';
import React from 'react';
import { render } from 'ink-testing-library';
import { ObservationDetail } from './ObservationDetail';
import type { Observation } from '@slorenzot/memento-core';

const mockObservation: Observation = {
  id: 42,
  uuid: 'abc-123-def',
  sessionId: 7,
  title: 'Fixed N+1 query in UserList component',
  content: '## What\nThe UserList component was making one query per user.\n\n## Why\nPerformance issue reported in production with 1000+ users.\n\n## Where\n- src/components/UserList.tsx\n- src/hooks/useUsers.ts',
  type: 'bug',
  topicKey: 'perf/query',
  projectId: 'my-project',
  createdAt: new Date('2026-05-01T10:00:00Z'),
  deletedAt: null,
  metadata: { severity: 'high', author: 'test' },
};

describe('ObservationDetail', () => {
  it('should render observation title', () => {
    const { lastFrame } = render(
      <ObservationDetail observation={mockObservation} />
    );

    const output = lastFrame();
    expect(output).toContain('Fixed N+1 query in UserList component');
  });

  it('should render observation ID', () => {
    const { lastFrame } = render(
      <ObservationDetail observation={mockObservation} />
    );

    const output = lastFrame();
    expect(output).toContain('42');
  });

  it('should render type badge', () => {
    const { lastFrame } = render(
      <ObservationDetail observation={mockObservation} />
    );

    const output = lastFrame();
    expect(output).toContain('bug');
  });

  it('should render project', () => {
    const { lastFrame } = render(
      <ObservationDetail observation={mockObservation} />
    );

    const output = lastFrame();
    expect(output).toContain('my-project');
  });

  it('should render topic key', () => {
    const { lastFrame } = render(
      <ObservationDetail observation={mockObservation} />
    );

    const output = lastFrame();
    expect(output).toContain('perf/query');
  });

  it('should render content', () => {
    const { lastFrame } = render(
      <ObservationDetail observation={mockObservation} />
    );

    const output = lastFrame();
    expect(output).toContain('UserList component');
    expect(output).toContain('Performance issue');
  });

  it('should show DELETED indicator for soft-deleted observations', () => {
    const deletedObs: Observation = {
      ...mockObservation,
      deletedAt: new Date(),
    };

    const { lastFrame } = render(
      <ObservationDetail observation={deletedObs} />
    );

    const output = lastFrame();
    expect(output).toContain('DELETED');
  });

  it('should not show DELETED for active observations', () => {
    const { lastFrame } = render(
      <ObservationDetail observation={mockObservation} />
    );

    const output = lastFrame();
    expect(output).not.toContain('DELETED');
  });

  it('should render metadata as key-value pairs', () => {
    const { lastFrame } = render(
      <ObservationDetail observation={mockObservation} />
    );

    const output = lastFrame();
    expect(output).toContain('severity');
    expect(output).toContain('high');
  });

  it('should render session ID', () => {
    const { lastFrame } = render(
      <ObservationDetail observation={mockObservation} />
    );

    const output = lastFrame();
    expect(output).toContain('7');
  });
});
