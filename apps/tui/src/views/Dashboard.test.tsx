import { describe, it, expect } from 'bun:test';
import React from 'react';
import { render } from 'ink-testing-library';
import { Dashboard } from './Dashboard';
import type { DashboardStats } from '@slorenzot/memento-core';

const mockStats: DashboardStats = {
  totalObservations: 42,
  activeObservations: 38,
  deletedObservations: 4,
  byType: {
    decision: 15,
    bug: 8,
    discovery: 10,
    note: 5,
  },
  byProject: {
    'project-a': 25,
    'project-b': 13,
  },
  activeSessions: 3,
  recentObservations: [
    {
      id: 1,
      uuid: 'test-1',
      sessionId: 1,
      title: 'Recent observation 1',
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
      title: 'Recent observation 2',
      content: 'Content 2',
      type: 'bug',
      topicKey: null,
      projectId: 'project-b',
      createdAt: new Date(),
      deletedAt: null,
      metadata: {},
    },
  ],
};

describe('Dashboard', () => {
  it('should render total observations count', () => {
    const { lastFrame } = render(<Dashboard stats={mockStats} />);

    const output = lastFrame();
    expect(output).toContain('42');
    expect(output).toContain('38'); // active
    expect(output).toContain('4');  // deleted
  });

  it('should render type distribution', () => {
    const { lastFrame } = render(<Dashboard stats={mockStats} />);

    const output = lastFrame();
    expect(output).toContain('decision');
    expect(output).toContain('bug');
    expect(output).toContain('discovery');
    expect(output).toContain('note');
  });

  it('should render project distribution', () => {
    const { lastFrame } = render(<Dashboard stats={mockStats} />);

    const output = lastFrame();
    expect(output).toContain('project-a');
    expect(output).toContain('project-b');
  });

  it('should render active sessions count', () => {
    const { lastFrame } = render(<Dashboard stats={mockStats} />);

    const output = lastFrame();
    expect(output).toContain('3');
  });

  it('should render recent observations', () => {
    const { lastFrame } = render(<Dashboard stats={mockStats} />);

    const output = lastFrame();
    expect(output).toContain('Recent observation 1');
    expect(output).toContain('Recent observation 2');
  });

  it('should render empty state', () => {
    const emptyStats: DashboardStats = {
      totalObservations: 0,
      activeObservations: 0,
      deletedObservations: 0,
      byType: { decision: 0, bug: 0, discovery: 0, note: 0 },
      byProject: {},
      activeSessions: 0,
      recentObservations: [],
    };

    const { lastFrame } = render(<Dashboard stats={emptyStats} />);

    const output = lastFrame();
    expect(output).toContain('0');
  });
});
