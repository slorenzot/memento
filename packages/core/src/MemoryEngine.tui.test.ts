import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'bun:test';
import { MemoryEngine } from './MemoryEngine';
import type { DashboardStats, ProjectStats, ListSessionsResult } from './types';
import { mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { measureTime, expectUnder, bench } from './test-helpers';

// ─── TUI Explorer API Tests ──────────────────────────────────
//
// Tests for methods needed by the TUI:
//   - listSessions(params) → ListSessionsResult
//   - listProjects() → ProjectStats[]
//   - getDashboardStats() → DashboardStats
//
// TDD: these tests define the contract BEFORE implementation.

describe('MemoryEngine — TUI Explorer API', () => {
  let engine: MemoryEngine;
  let testDbPath: string;
  const testDir = join(process.cwd(), 'test-data');

  beforeAll(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    mkdirSync(testDir, { recursive: true });
  });

  afterAll(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    testDbPath = join(
      testDir,
      `tui-test-${Date.now()}-${Math.random().toString(36).slice(7)}.db`
    );
    engine = new MemoryEngine(testDbPath);
  });

  afterEach(() => {
    engine.close();
  });

  // ─── listSessions ─────────────────────────────────────────

  describe('listSessions()', () => {
    it('should return empty list when no sessions exist', async () => {
      const result = await engine.listSessions({});

      expect(result.sessions).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should list all sessions ordered by startedAt DESC', async () => {
      const s1 = await engine.createSession({
        projectId: 'project-a',
        endedAt: null,
        metadata: {},
      });
      const s2 = await engine.createSession({
        projectId: 'project-b',
        endedAt: null,
        metadata: {},
      });

      const result = await engine.listSessions({});

      expect(result.total).toBe(2);
      expect(result.sessions[0].id).toBe(s2.id); // most recent first
      expect(result.sessions[1].id).toBe(s1.id);
    });

    it('should filter by projectId', async () => {
      await engine.createSession({ projectId: 'project-a', endedAt: null, metadata: {} });
      await engine.createSession({ projectId: 'project-b', endedAt: null, metadata: {} });
      await engine.createSession({ projectId: 'project-a', endedAt: null, metadata: {} });

      const result = await engine.listSessions({ projectId: 'project-a' });

      expect(result.total).toBe(2);
      result.sessions.forEach((s) => {
        expect(s.projectId).toBe('project-a');
      });
    });

    it('should filter by activeOnly=true (no ended sessions)', async () => {
      const active = await engine.createSession({
        projectId: 'test',
        endedAt: null,
        metadata: {},
      });
      const ended = await engine.createSession({
        projectId: 'test',
        endedAt: null,
        metadata: {},
      });
      await engine.endSession(ended.id);

      const result = await engine.listSessions({ activeOnly: true });

      expect(result.total).toBe(1);
      expect(result.sessions[0].id).toBe(active.id);
      expect(result.sessions[0].endedAt).toBeNull();
    });

    it('should paginate with limit and offset', async () => {
      for (let i = 0; i < 5; i++) {
        await engine.createSession({ projectId: `proj-${i}`, endedAt: null, metadata: {} });
      }

      const page1 = await engine.listSessions({ limit: 2, offset: 0 });
      const page2 = await engine.listSessions({ limit: 2, offset: 2 });
      const page3 = await engine.listSessions({ limit: 2, offset: 4 });

      expect(page1.sessions).toHaveLength(2);
      expect(page2.sessions).toHaveLength(2);
      expect(page3.sessions).toHaveLength(1);
      expect(page1.total).toBe(5);
      expect(page2.total).toBe(5);
      expect(page3.total).toBe(5);
    });

    it('should respond in <50ms with 100 sessions', async () => {
      for (let i = 0; i < 100; i++) {
        await engine.createSession({ projectId: 'perf-test', endedAt: null, metadata: {} });
      }

      const { ms } = await measureTime(() => engine.listSessions({}));
      expectUnder(ms, 50, 'listSessions with 100 sessions');
    });
  });

  // ─── listProjects ─────────────────────────────────────────

  describe('listProjects()', () => {
    it('should return empty list when no observations exist', async () => {
      const projects = await engine.listProjects();
      expect(projects).toEqual([]);
    });

    it('should return project stats with observation counts', async () => {
      const session = await engine.createSession({
        projectId: 'project-a',
        endedAt: null,
        metadata: {},
      });

      // 3 notes, 2 decisions in project-a
      for (let i = 0; i < 3; i++) {
        await engine.createObservation({
          sessionId: session.id,
          title: `Note ${i}`,
          content: 'content',
          type: 'note',
          topicKey: null,
          projectId: 'project-a',
          metadata: {},
        });
      }
      for (let i = 0; i < 2; i++) {
        await engine.createObservation({
          sessionId: session.id,
          title: `Decision ${i}`,
          content: 'content',
          type: 'decision',
          topicKey: null,
          projectId: 'project-a',
          metadata: {},
        });
      }

      const projects = await engine.listProjects();

      expect(projects).toHaveLength(1);
      expect(projects[0].name).toBe('project-a');
      expect(projects[0].activeCount).toBe(5);
      expect(projects[0].deletedCount).toBe(0);
      expect(projects[0].byType.note).toBe(3);
      expect(projects[0].byType.decision).toBe(2);
      expect(projects[0].lastActivity).not.toBeNull();
    });

    it('should count soft-deleted observations separately', async () => {
      const session = await engine.createSession({
        projectId: 'project-b',
        endedAt: null,
        metadata: {},
      });

      const obs1 = await engine.createObservation({
        sessionId: session.id,
        title: 'Active',
        content: 'content',
        type: 'note',
        topicKey: null,
        projectId: 'project-b',
        metadata: {},
      });
      const obs2 = await engine.createObservation({
        sessionId: session.id,
        title: 'To Delete',
        content: 'content',
        type: 'bug',
        topicKey: null,
        projectId: 'project-b',
        metadata: {},
      });

      await engine.deleteObservation(obs2.id, 'test cleanup');

      const projects = await engine.listProjects();

      expect(projects).toHaveLength(1);
      expect(projects[0].activeCount).toBe(1);
      expect(projects[0].deletedCount).toBe(1);
      expect(projects[0].byType.note).toBe(1);
      expect(projects[0].byType.bug).toBe(1); // still counts in byType
    });

    it('should return multiple projects ordered by last activity DESC', async () => {
      // Create observations in different projects sequentially
      const sessionA = await engine.createSession({
        projectId: 'project-a',
        endedAt: null,
        metadata: {},
      });
      await engine.createObservation({
        sessionId: sessionA.id,
        title: 'First in A',
        content: 'content',
        type: 'note',
        topicKey: null,
        projectId: 'project-a',
        metadata: {},
      });

      const sessionB = await engine.createSession({
        projectId: 'project-b',
        endedAt: null,
        metadata: {},
      });
      await engine.createObservation({
        sessionId: sessionB.id,
        title: 'First in B',
        content: 'content',
        type: 'note',
        topicKey: null,
        projectId: 'project-b',
        metadata: {},
      });

      const projects = await engine.listProjects();

      expect(projects).toHaveLength(2);
      // project-b was most recently active
      expect(projects[0].name).toBe('project-b');
      expect(projects[1].name).toBe('project-a');
    });

    it('should include all type keys in byType even when zero', async () => {
      const session = await engine.createSession({
        projectId: 'sparse-project',
        endedAt: null,
        metadata: {},
      });
      await engine.createObservation({
        sessionId: session.id,
        title: 'Only notes',
        content: 'content',
        type: 'note',
        topicKey: null,
        projectId: 'sparse-project',
        metadata: {},
      });

      const projects = await engine.listProjects();

      expect(projects[0].byType).toEqual({
        decision: 0,
        bug: 0,
        discovery: 0,
        note: 1,
        summary: 0,
        learning: 0,
        pattern: 0,
        architecture: 0,
        config: 0,
        preference: 0,
      });
    });

    it('should respond in <50ms with 10 projects and 500 observations', async () => {
      for (let p = 0; p < 10; p++) {
        const session = await engine.createSession({
          projectId: `perf-project-${p}`,
          endedAt: null,
          metadata: {},
        });
        for (let i = 0; i < 50; i++) {
          await engine.createObservation({
            sessionId: session.id,
            title: `Obs ${i}`,
            content: 'content',
            type: 'note',
            topicKey: null,
            projectId: `perf-project-${p}`,
            metadata: {},
          });
        }
      }

      const { ms } = await measureTime(() => engine.listProjects());
      expectUnder(ms, 50, 'listProjects with 10 projects, 500 observations');
    });
  });

  // ─── getDashboardStats ────────────────────────────────────

  describe('getDashboardStats()', () => {
    it('should return zeroed stats for empty database', async () => {
      const stats = await engine.getDashboardStats();

      expect(stats.totalObservations).toBe(0);
      expect(stats.activeObservations).toBe(0);
      expect(stats.deletedObservations).toBe(0);
      expect(stats.activeSessions).toBe(0);
      expect(stats.byType).toEqual({
        decision: 0,
        bug: 0,
        discovery: 0,
        note: 0,
        summary: 0,
        learning: 0,
        pattern: 0,
        architecture: 0,
        config: 0,
        preference: 0,
      });
      expect(stats.byProject).toEqual({});
      expect(stats.recentObservations).toEqual([]);
    });

    it('should count active and deleted observations', async () => {
      const session = await engine.createSession({
        projectId: 'dashboard-test',
        endedAt: null,
        metadata: {},
      });

      // Create 5 active observations
      for (let i = 0; i < 5; i++) {
        await engine.createObservation({
          sessionId: session.id,
          title: `Active ${i}`,
          content: 'content',
          type: 'note',
          topicKey: null,
          projectId: 'dashboard-test',
          metadata: {},
        });
      }

      // Create and delete 2 observations
      for (let i = 0; i < 2; i++) {
        const obs = await engine.createObservation({
          sessionId: session.id,
          title: `ToDelete ${i}`,
          content: 'content',
          type: 'bug',
          topicKey: null,
          projectId: 'dashboard-test',
          metadata: {},
        });
        await engine.deleteObservation(obs.id);
      }

      const stats = await engine.getDashboardStats();

      expect(stats.totalObservations).toBe(7);
      expect(stats.activeObservations).toBe(5);
      expect(stats.deletedObservations).toBe(2);
    });

    it('should aggregate observations by type', async () => {
      const session = await engine.createSession({
        projectId: 'type-test',
        endedAt: null,
        metadata: {},
      });

      const types: Array<'decision' | 'bug' | 'discovery' | 'note'> = [
        'decision',
        'decision',
        'bug',
        'bug',
        'bug',
        'discovery',
        'note',
        'note',
        'note',
        'note',
      ];

      for (let i = 0; i < types.length; i++) {
        await engine.createObservation({
          sessionId: session.id,
          title: `${types[i]} ${i}`,
          content: 'content',
          type: types[i],
          topicKey: null,
          projectId: 'type-test',
          metadata: {},
        });
      }

      const stats = await engine.getDashboardStats();

      expect(stats.byType).toEqual({
        decision: 2,
        bug: 3,
        discovery: 1,
        note: 4,
        summary: 0,
        learning: 0,
        pattern: 0,
        architecture: 0,
        config: 0,
        preference: 0,
      });
    });

    it('should aggregate observations by project', async () => {
      const sessionA = await engine.createSession({
        projectId: 'proj-alpha',
        endedAt: null,
        metadata: {},
      });
      const sessionB = await engine.createSession({
        projectId: 'proj-beta',
        endedAt: null,
        metadata: {},
      });

      for (let i = 0; i < 3; i++) {
        await engine.createObservation({
          sessionId: sessionA.id,
          title: `Alpha ${i}`,
          content: 'content',
          type: 'note',
          topicKey: null,
          projectId: 'proj-alpha',
          metadata: {},
        });
      }
      for (let i = 0; i < 2; i++) {
        await engine.createObservation({
          sessionId: sessionB.id,
          title: `Beta ${i}`,
          content: 'content',
          type: 'decision',
          topicKey: null,
          projectId: 'proj-beta',
          metadata: {},
        });
      }

      const stats = await engine.getDashboardStats();

      expect(stats.byProject).toEqual({
        'proj-alpha': 3,
        'proj-beta': 2,
      });
    });

    it('should count active sessions', async () => {
      // 2 active sessions
      await engine.createSession({ projectId: 'p1', endedAt: null, metadata: {} });
      await engine.createSession({ projectId: 'p2', endedAt: null, metadata: {} });

      // 1 ended session
      const ended = await engine.createSession({
        projectId: 'p3',
        endedAt: null,
        metadata: {},
      });
      await engine.endSession(ended.id);

      const stats = await engine.getDashboardStats();

      expect(stats.activeSessions).toBe(2);
    });

    it('should return last 5 observations as recentObservations', async () => {
      const session = await engine.createSession({
        projectId: 'recent-test',
        endedAt: null,
        metadata: {},
      });

      // Create 10 observations
      for (let i = 0; i < 10; i++) {
        await engine.createObservation({
          sessionId: session.id,
          title: `Obs ${String(i).padStart(2, '0')}`,
          content: `Content ${i}`,
          type: 'note',
          topicKey: null,
          projectId: 'recent-test',
          metadata: {},
        });
      }

      const stats = await engine.getDashboardStats();

      expect(stats.recentObservations).toHaveLength(5);
      // Most recent first (Obs 09, 08, 07, 06, 05)
      expect(stats.recentObservations[0].title).toBe('Obs 09');
      expect(stats.recentObservations[4].title).toBe('Obs 05');
    });

    it('should respond in <50ms with 1000 observations', async () => {
      const session = await engine.createSession({
        projectId: 'perf-dash',
        endedAt: null,
        metadata: {},
      });

      for (let i = 0; i < 1000; i++) {
        await engine.createObservation({
          sessionId: session.id,
          title: `Perf ${i}`,
          content: `Content for performance testing ${i}`,
          type: (['note', 'decision', 'bug', 'discovery'] as const)[i % 4],
          topicKey: i % 3 === 0 ? 'perf-topic' : null,
          projectId: `perf-proj-${i % 5}`,
          metadata: {},
        });
      }

      const { ms } = await measureTime(() => engine.getDashboardStats());
      expectUnder(ms, 100, 'getDashboardStats with 1000 observations');
    });
  });
});
