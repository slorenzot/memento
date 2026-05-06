import { describe, it, expect } from 'bun:test';
import React from 'react';
import { render } from 'ink-testing-library';
import { SessionsList } from './SessionsList';
import type { Session, Observation } from '@slorenzot/memento-core';

const mockSessions: Session[] = [
  {
    id: 1,
    uuid: 'sess-1',
    projectId: 'project-a',
    startedAt: new Date('2026-05-01T10:00:00Z'),
    endedAt: null,
    metadata: {},
  },
  {
    id: 2,
    uuid: 'sess-2',
    projectId: 'project-b',
    startedAt: new Date('2026-05-01T09:00:00Z'),
    endedAt: new Date('2026-05-01T09:30:00Z'),
    metadata: {},
  },
];

const mockObservations: Observation[] = [
  {
    id: 1,
    uuid: 'obs-1',
    sessionId: 1,
    title: 'Test observation',
    content: 'Content',
    type: 'note',
    topicKey: null,
    projectId: 'project-a',
    createdAt: new Date(),
    deletedAt: null,
    metadata: {},
  },
];

describe('SessionsList', () => {
  it('should render sessions', () => {
    const { lastFrame } = render(
      <SessionsList
        sessions={mockSessions}
        total={2}
        selectedIndex={0}
        sessionObservations={{}}
        expandedSessionId={null}
        onSelect={() => {}}
        onToggleExpand={() => {}}
      />
    );

    const output = lastFrame();
    expect(output).toContain('project-a');
    expect(output).toContain('project-b');
  });

  it('should show active indicator for open sessions', () => {
    const { lastFrame } = render(
      <SessionsList
        sessions={mockSessions}
        total={2}
        selectedIndex={0}
        sessionObservations={{}}
        expandedSessionId={null}
        onSelect={() => {}}
        onToggleExpand={() => {}}
      />
    );

    const output = lastFrame();
    // Active session should have an indicator
    expect(output).toContain('●');
  });

  it('should show closed indicator for ended sessions', () => {
    const { lastFrame } = render(
      <SessionsList
        sessions={mockSessions}
        total={2}
        selectedIndex={0}
        sessionObservations={{}}
        expandedSessionId={null}
        onSelect={() => {}}
        onToggleExpand={() => {}}
      />
    );

    const output = lastFrame();
    expect(output).toContain('○');
  });

  it('should render session IDs', () => {
    const { lastFrame } = render(
      <SessionsList
        sessions={mockSessions}
        total={2}
        selectedIndex={0}
        sessionObservations={{}}
        expandedSessionId={null}
        onSelect={() => {}}
        onToggleExpand={() => {}}
      />
    );

    const output = lastFrame();
    expect(output).toContain('#1');
    expect(output).toContain('#2');
  });

  it('should render observations for expanded session', () => {
    const { lastFrame } = render(
      <SessionsList
        sessions={mockSessions}
        total={2}
        selectedIndex={0}
        sessionObservations={{ 1: mockObservations }}
        expandedSessionId={1}
        onSelect={() => {}}
        onToggleExpand={() => {}}
      />
    );

    const output = lastFrame();
    expect(output).toContain('Test observation');
  });

  it('should highlight selected session', () => {
    const { lastFrame } = render(
      <SessionsList
        sessions={mockSessions}
        total={2}
        selectedIndex={1}
        sessionObservations={{}}
        expandedSessionId={null}
        onSelect={() => {}}
        onToggleExpand={() => {}}
      />
    );

    const output = lastFrame();
    expect(output).toContain('▶');
  });

  it('should render empty list', () => {
    const { lastFrame } = render(
      <SessionsList
        sessions={[]}
        total={0}
        selectedIndex={0}
        sessionObservations={{}}
        expandedSessionId={null}
        onSelect={() => {}}
        onToggleExpand={() => {}}
      />
    );

    const output = lastFrame();
    expect(output).toContain('No sessions');
  });
});
