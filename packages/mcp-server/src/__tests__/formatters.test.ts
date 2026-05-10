/**
 * formatters.test.ts — Unit tests for Markdown formatters.
 *
 * Validates that each formatter produces the expected Markdown output.
 */

import { describe, it, expect } from 'bun:test';
import {
  formatObservation,
  formatObservationShort,
  formatObservationList,
  formatSession,
  formatSessionList,
  formatStats,
  formatHealth,
  formatConfig,
} from '../formatters';
import type { Observation, Session, DashboardStats } from '@slorenzot/memento-core';

// ─── Fixtures ───────────────────────────────────────────────

function makeObservation(overrides: Partial<Observation> = {}): Observation {
  return {
    id: 42,
    uuid: 'test-uuid-1234',
    sessionId: 5,
    title: 'Fixed N+1 query in UserList',
    content: '**What**: Fixed the N+1 query issue\n**Why**: Performance\n**Where**: src/UserList.ts',
    type: 'bug',
    topicKey: 'bugfix/n1-query',
    projectId: 'my-project',
    createdAt: new Date('2026-05-06T10:00:00.000Z'),
    deletedAt: null,
    metadata: {},
    scope: 'project',
    revisionCount: 1,
    ...overrides,
  };
}

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 5,
    uuid: 'session-uuid-5678',
    projectId: 'my-project',
    startedAt: new Date('2026-05-06T09:00:00.000Z'),
    endedAt: null,
    metadata: { agent: 'test' },
    ...overrides,
  };
}

// ─── formatObservation ──────────────────────────────────────

describe('formatObservation', () => {
  it('should format a full observation with all fields', () => {
    const obs = makeObservation();
    const result = formatObservation(obs);

    expect(result).toContain('#42 [bug] Fixed N+1 query in UserList');
    expect(result).toContain('Project: my-project');
    expect(result).toContain('Topic: bugfix/n1-query');
    expect(result).toContain('Scope: project');
    expect(result).toContain('Created: 2026-05-06');
    expect(result).toContain('Revision: 1');
    expect(result).toContain('**What**: Fixed the N+1 query issue');
    // Should NOT contain dropped fields
    expect(result).not.toContain('test-uuid-1234');
    expect(result).not.toContain('sessionId');
  });

  it('should handle observation without topicKey', () => {
    const obs = makeObservation({ topicKey: null });
    const result = formatObservation(obs);

    expect(result).toContain('#42 [bug]');
    expect(result).not.toContain('Topic:');
  });
});

// ─── formatObservationShort ─────────────────────────────────

describe('formatObservationShort', () => {
  it('should format a compact observation for lists', () => {
    const obs = makeObservation();
    const result = formatObservationShort(obs);

    expect(result).toContain('#42 [bug] Fixed N+1 query in UserList');
    expect(result).toContain('Project: my-project');
    expect(result).toContain('Topic: bugfix/n1-query');
    expect(result).toContain('2026-05-06');
    expect(result).toContain('**What**');
  });

  it('should truncate long content previews', () => {
    const obs = makeObservation({ content: 'A'.repeat(200) });
    const result = formatObservationShort(obs);

    // Preview should be truncated
    const lines = result.split('\n');
    const previewLine = lines[lines.length - 1];
    expect(previewLine.length).toBeLessThanOrEqual(120);
    expect(previewLine).toContain('...');
  });
});

// ─── formatObservationList ──────────────────────────────────

describe('formatObservationList', () => {
  it('should format empty list', () => {
    const result = formatObservationList({ total: 0, observations: [] });

    expect(result).toContain('Found 0 observations');
    expect(result).not.toContain('---');
  });

  it('should format single observation', () => {
    const obs = makeObservation();
    const result = formatObservationList({ total: 1, observations: [obs] });

    expect(result).toContain('Found 1 observation');
    expect(result).toContain('#42 [bug]');
    expect(result).not.toContain('---');
  });

  it('should format multiple observations with separator', () => {
    const obs1 = makeObservation({ id: 1, title: 'First' });
    const obs2 = makeObservation({ id: 2, title: 'Second' });
    const result = formatObservationList({ total: 2, observations: [obs1, obs2] });

    expect(result).toContain('Found 2 observations');
    expect(result).toContain('#1 [bug] First');
    expect(result).toContain('#2 [bug] Second');
    expect(result).toContain('---');
  });

  it('should show total even when truncated by limit', () => {
    const obs = makeObservation();
    const result = formatObservationList({ total: 50, observations: [obs] });

    expect(result).toContain('Found 50 observations');
  });
});

// ─── formatSession ──────────────────────────────────────────

describe('formatSession', () => {
  it('should format an active session', () => {
    const session = makeSession();
    const result = formatSession(session);

    expect(result).toContain('Session #5');
    expect(result).toContain('Project: my-project');
    expect(result).toContain('Active');
    expect(result).toContain('Started: 2026-05-06');
    expect(result).toContain('Metadata: {"agent":"test"}');
  });

  it('should format an ended session', () => {
    const session = makeSession({ endedAt: new Date('2026-05-06T18:00:00.000Z') });
    const result = formatSession(session);

    expect(result).toContain('Ended: 2026-05-06');
    expect(result).not.toContain('Active');
  });

  it('should handle session without metadata', () => {
    const session = makeSession({ metadata: {} });
    const result = formatSession(session);

    expect(result).not.toContain('Metadata:');
  });
});

// ─── formatSessionList ──────────────────────────────────────

describe('formatSessionList', () => {
  it('should format empty list', () => {
    const result = formatSessionList({ total: 0, sessions: [] });

    expect(result).toContain('Sessions (0 total)');
  });

  it('should format multiple sessions', () => {
    const s1 = makeSession({ id: 1, projectId: 'alpha' });
    const s2 = makeSession({ id: 2, projectId: 'beta', endedAt: new Date('2026-05-05T10:00:00.000Z') });
    const result = formatSessionList({ total: 2, sessions: [s1, s2] });

    expect(result).toContain('Sessions (2 total)');
    expect(result).toContain('#1 | alpha');
    expect(result).toContain('#2 | beta');
    expect(result).toContain('Active');
    expect(result).toContain('Ended: 2026-05-05');
  });
});

// ─── formatStats ────────────────────────────────────────────

describe('formatStats', () => {
  it('should format stats with active session', () => {
    const stats: DashboardStats = {
      totalObservations: 42,
      activeObservations: 39,
      deletedObservations: 3,
      byType: { bug: 10, note: 20, decision: 12 },
      byProject: { 'my-project': 30, 'other': 12 },
      activeSessions: 1,
      recentObservations: [],
    };

    const result = formatStats(stats, 5);

    expect(result).toContain('42 observations');
    expect(result).toContain('3 deleted');
    expect(result).toContain('session #5 active');
    expect(result).toContain('bug(10)');
    expect(result).toContain('note(20)');
    expect(result).toContain('my-project(30)');
  });

  it('should format stats without active session', () => {
    const stats: DashboardStats = {
      totalObservations: 0,
      activeObservations: 0,
      deletedObservations: 0,
      byType: {},
      byProject: {},
      activeSessions: 0,
      recentObservations: [],
    };

    const result = formatStats(stats, null);

    expect(result).toContain('no active session');
    expect(result).not.toContain('Types:');
    expect(result).not.toContain('Projects:');
  });
});

// ─── formatHealth ───────────────────────────────────────────

describe('formatHealth', () => {
  it('should format healthy status', () => {
    const result = formatHealth({
      status: 'healthy',
      version: '1.0.0',
      storage: 'sqlite-persistent',
      databasePath: '/home/.memento/memento.db',
      projectId: 'test',
      databaseHealth: 'ok',
      observations: 573,
      activeSession: 235,
    });

    expect(result).toContain('Status: healthy');
    expect(result).toContain('Version: 1.0.0');
    expect(result).toContain('Database: ok');
    expect(result).toContain('Observations: 573');
    expect(result).toContain('Active session: #235');
  });

  it('should format unhealthy status with error', () => {
    const result = formatHealth({
      status: 'unhealthy',
      version: '1.0.0',
      storage: 'sqlite-persistent',
      databasePath: '/bad/path.db',
      projectId: 'test',
      databaseHealth: 'failed',
      observations: 0,
      activeSession: null,
      initError: 'Permission denied',
    });

    expect(result).toContain('Status: unhealthy');
    expect(result).toContain('Database: failed');
    expect(result).toContain('No active session');
    expect(result).toContain('Error: Permission denied');
  });
});

// ─── formatConfig ───────────────────────────────────────────

describe('formatConfig', () => {
  it('should format full configuration', () => {
    const result = formatConfig({
      name: 'memento',
      version: '1.0.0',
      config: {
        storagePath: '/home/.memento/memento.db',
        projectId: 'my-project',
        projectRoot: '/home/project',
        hasConfigFile: false,
      },
      storage: {
        type: 'SQLite Persistent',
        method: 'bun:sqlite',
        databasePath: '/home/.memento/memento.db',
        walEnabled: true,
      },
      diskUsage: {
        totalBytes: 2500000,
        totalSizeHuman: '2.38 MB',
        mainDbBytes: 1800000,
        mainDbSizeHuman: '1.72 MB',
        walBytes: 700000,
        walSizeHuman: '0.67 MB',
      },
      statistics: {
        totalObservations: 573,
        byType: { bug: 52, note: 95 },
        activeSession: 235,
      },
      environment: {
        nodeVersion: 'v22.0.0',
        platform: 'darwin',
        arch: 'arm64',
        bunVersion: '1.2.0',
      },
      tools: ['mem_save', 'mem_search', 'mem_status'],
    });

    expect(result).toContain('memento v1.0.0 — Configuration');
    expect(result).toContain('Storage: SQLite Persistent (bun:sqlite) | WAL: enabled');
    expect(result).toContain('Disk: 2.38 MB (main: 1.72 MB, WAL: 0.67 MB)');
    expect(result).toContain('573 observations');
    expect(result).toContain('bug(52)');
    expect(result).toContain('note(95)');
    expect(result).toContain('Active session: #235');
    expect(result).toContain('Tools: 3 registered');
    expect(result).toContain('darwin/arm64');
  });

  it('should format config without active session', () => {
    const result = formatConfig({
      name: 'memento',
      version: '1.0.0',
      config: {
        storagePath: '/tmp/test.db',
        projectId: 'test',
        projectRoot: '/tmp',
        hasConfigFile: false,
      },
      storage: {
        type: 'SQLite Persistent',
        method: 'bun:sqlite',
        databasePath: '/tmp/test.db',
        walEnabled: false,
      },
      diskUsage: {
        totalBytes: 0,
        totalSizeHuman: '0 B',
        mainDbBytes: 0,
        mainDbSizeHuman: '0 B',
        walBytes: 0,
        walSizeHuman: '0 B',
      },
      statistics: {
        totalObservations: 0,
        byType: {},
        activeSession: null,
      },
      environment: {
        nodeVersion: 'v22.0.0',
        platform: 'linux',
        arch: 'x64',
        bunVersion: 'unknown',
      },
      tools: [],
    });

    expect(result).toContain('WAL: disabled');
    expect(result).toContain('0 observations');
    expect(result).toContain('No active session');
    expect(result).toContain('Tools: 0 registered');
  });
});
