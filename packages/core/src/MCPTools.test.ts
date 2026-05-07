/**
 * MCPTools.test.ts — E2E tests simulating MCP tool call flows.
 *
 * These tests exercise the SAME operations that the MCP server tools perform,
 * but directly against the MemoryEngine — no stdio transport needed.
 *
 * Each test maps to one or more MCP tools:
 *   mem_save, mem_search, mem_get_observation,
 *   mem_update, mem_delete, mem_restore,
 *   mem_purge, mem_list_deleted, mem_merge,
 *   mem_export, mem_session_start, mem_session_end,
 *   mem_list_sessions, mem_get_session,
 *   mem_timeline, mem_stats, mem_health, mem_config
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { MemoryEngine } from './MemoryEngine';
import {
  createTestDb,
  seedSession,
  seedObservation,
  seedMultipleObservations,
  measureTime,
  expectUnder,
} from './test-helpers';
import type { ExportFormat, MergeStrategy } from './types';

// ─── Helper: simulate the "active session" pattern MCP server uses ───

function createMCPContext(engine: MemoryEngine, projectId: string = 'mcp-test') {
  let activeSessionId: number | null = null;

  async function getOrCreateSession(): Promise<number> {
    if (activeSessionId) return activeSessionId;
    const session = await engine.createSession({
      projectId,
      endedAt: null,
      metadata: {},
    });
    activeSessionId = session.id;
    return session.id;
  }

  return { getOrCreateSession, setActiveSession: (id: number) => { activeSessionId = id; }, clearSession: () => { activeSessionId = null; } };
}

describe('MCP Tools E2E', () => {
  let engine: MemoryEngine;
  let dbPath: string;
  let ctx: ReturnType<typeof createMCPContext>;

  beforeEach(() => {
    const setup = createTestDb();
    engine = setup.engine;
    dbPath = setup.dbPath;
    ctx = createMCPContext(engine);
  });

  afterEach(() => {
    engine.close();
  });

  // ─── Session Lifecycle Tools ───────────────────────────────

  describe('mem_session_start / end / list / get', () => {
    it('should start a session (mem_session_start)', async () => {
      const session = await engine.createSession({
        projectId: 'mcp-test',
        endedAt: null,
        metadata: { agent: 'claude' },
      });

      expect(session.id).toBeDefined();
      expect(session.uuid).toBeDefined();
      expect(session.projectId).toBe('mcp-test');
      expect(session.endedAt).toBeNull();
    });

    it('should end an active session (mem_session_end)', async () => {
      const session = await engine.createSession({
        projectId: 'mcp-test',
        endedAt: null,
        metadata: {},
      });

      const ended = await engine.endSession(session.id);
      expect(ended.endedAt).toBeDefined();
      expect(ended.endedAt).not.toBeNull();
    });

    it('should error when ending with no active session', async () => {
      expect(engine.endSession(99999)).rejects.toThrow();
    });

    it('should get a session by ID (mem_get_session)', async () => {
      const session = await engine.createSession({
        projectId: 'mcp-test',
        endedAt: null,
        metadata: {},
      });

      const found = await engine.getSession(session.id);
      expect(found).toBeDefined();
      expect(found!.id).toBe(session.id);
      expect(found!.projectId).toBe('mcp-test');
    });

    it('should return null for non-existent session', async () => {
      const found = await engine.getSession(99999);
      expect(found).toBeNull();
    });

    it('should list sessions (mem_list_sessions)', async () => {
      // Create sessions with observations
      const s1 = await seedSession(engine, 'project-a');
      await seedObservation(engine, s1.id, { projectId: 'project-a' });

      const s2 = await seedSession(engine, 'project-b');
      await seedObservation(engine, s2.id, { projectId: 'project-b' });

      // Search returns observations → extract unique session IDs
      const result = await engine.search({ limit: 20 });
      const uniqueSessionIds = [...new Set(result.observations.map(o => o.sessionId))];
      const sessions = await Promise.all(uniqueSessionIds.map(id => engine.getSession(id)));

      expect(sessions.filter(Boolean).length).toBeGreaterThanOrEqual(2);
    });
  });

  // ─── Observation CRUD Tools ────────────────────────────────

  describe('mem_save / search / get / update', () => {
    it('should save with auto-session (mem_save pattern)', async () => {
      const sessionId = await ctx.getOrCreateSession();

      const obs = await engine.createObservation({
        sessionId,
        title: 'Architecture Decision',
        content: 'What: Using SQLite for storage\nWhy: Performance\nWhere: core package',
        type: 'decision',
        topicKey: 'architecture/storage',
        projectId: 'mcp-test',
        metadata: { priority: 'high' },
      });

      expect(obs.id).toBeDefined();
      expect(obs.uuid).toBeDefined();
      expect(obs.title).toBe('Architecture Decision');
      expect(obs.type).toBe('decision');
      expect(obs.topicKey).toBe('architecture/storage');
    });

    it('should reuse active session for multiple saves', async () => {
      const sid1 = await ctx.getOrCreateSession();
      const sid2 = await ctx.getOrCreateSession();
      expect(sid1).toBe(sid2);

      await seedObservation(engine, sid1, { title: 'Obs 1', projectId: 'mcp-test' });
      await seedObservation(engine, sid1, { title: 'Obs 2', projectId: 'mcp-test' });

      const result = await engine.search({ projectId: 'mcp-test' });
      expect(result.total).toBe(2);
    });

    it('should search with FTS5 query (mem_search)', async () => {
      const session = await seedSession(engine, 'mcp-test');
      await seedObservation(engine, session.id, { title: 'React patterns', content: 'Hooks and components', projectId: 'mcp-test' });
      await seedObservation(engine, session.id, { title: 'Vue patterns', content: 'Composition API', projectId: 'mcp-test' });

      const result = await engine.search({ query: 'React', projectId: 'mcp-test' });
      expect(result.total).toBe(1);
      expect(result.observations[0].title).toBe('React patterns');
    });

    it('should get observation by ID (mem_get_observation)', async () => {
      const session = await seedSession(engine, 'mcp-test');
      const obs = await seedObservation(engine, session.id, { projectId: 'mcp-test' });

      const found = await engine.getObservation(obs.id);
      expect(found).toBeDefined();
      expect(found!.id).toBe(obs.id);
      expect(found!.title).toBe(obs.title);
    });

    it('should update observation (mem_update)', async () => {
      const session = await seedSession(engine, 'mcp-test');
      const obs = await seedObservation(engine, session.id, { projectId: 'mcp-test' });

      const updated = await engine.updateObservation(obs.id, {
        title: 'Updated Title',
        content: 'Updated content',
        type: 'bug',
        topicKey: 'fix/important',
      });

      expect(updated.title).toBe('Updated Title');
      expect(updated.type).toBe('bug');
      expect(updated.topicKey).toBe('fix/important');
    });
  });

  // ─── Soft Delete / Restore / Purge Tools ───────────────────

  describe('mem_delete / restore / purge / list_deleted', () => {
    it('should soft-delete and exclude from search', async () => {
      const session = await seedSession(engine, 'mcp-test');
      const obs = await seedObservation(engine, session.id, { projectId: 'mcp-test' });

      await engine.deleteObservation(obs.id, 'duplicate');

      // Excluded from normal search
      const result = await engine.search({ projectId: 'mcp-test' });
      expect(result.total).toBe(0);

      // Visible in deleted list
      const deleted = await engine.listDeleted({ projectId: 'mcp-test' });
      expect(deleted.total).toBe(1);
      expect(deleted.observations[0].id).toBe(obs.id);
    });

    it('should restore soft-deleted observation', async () => {
      const session = await seedSession(engine, 'mcp-test');
      const obs = await seedObservation(engine, session.id, { projectId: 'mcp-test' });

      await engine.deleteObservation(obs.id);
      const restored = await engine.restoreObservation(obs.id);

      expect(restored.deletedAt).toBeNull();

      // Now visible in search again
      const result = await engine.search({ projectId: 'mcp-test' });
      expect(result.total).toBe(1);
    });

    it('should purge with confirm check (mem_purge)', async () => {
      const session = await seedSession(engine, 'mcp-test');
      const obs = await seedObservation(engine, session.id, { projectId: 'mcp-test' });

      await engine.deleteObservation(obs.id);

      const result = await engine.purgeObservations({ confirm: true, projectId: 'mcp-test' });
      expect(result.purgedCount).toBe(1);

      // Gone from deleted list too
      const deleted = await engine.listDeleted({ projectId: 'mcp-test' });
      expect(deleted.total).toBe(0);
    });
  });

  // ─── Merge Tool ────────────────────────────────────────────

  describe('mem_merge', () => {
    it('should merge by topic_key (dry_run + execute)', async () => {
      const session = await seedSession(engine, 'mcp-test');
      await seedObservation(engine, session.id, { topicKey: 'auth/model', projectId: 'mcp-test', content: 'Version 1' });
      await seedObservation(engine, session.id, { topicKey: 'auth/model', projectId: 'mcp-test', content: 'Version 2' });

      // Dry run
      const dry = await engine.mergeObservations({
        projectId: 'mcp-test',
        topicKey: 'auth/model',
        strategy: 'by_topic',
        dryRun: true,
      });
      expect(dry.length).toBe(1);
      expect(dry[0].originalCount).toBe(2);

      // Execute
      const results = await engine.mergeObservations({
        projectId: 'mcp-test',
        topicKey: 'auth/model',
        strategy: 'by_topic',
      });
      expect(results.length).toBe(1);
      expect(results[0].mergedObservation).toBeDefined();
      expect(results[0].deletedIds.length).toBe(2);

      // Only 1 obs remains
      const remaining = await engine.search({ projectId: 'mcp-test' });
      expect(remaining.total).toBe(1);
    });

    it('should merge by specific IDs', async () => {
      const session = await seedSession(engine, 'mcp-test');
      const o1 = await seedObservation(engine, session.id, { topicKey: 'merge-me', projectId: 'mcp-test' });
      const o2 = await seedObservation(engine, session.id, { topicKey: 'merge-me', projectId: 'mcp-test' });

      const results = await engine.mergeObservations({
        projectId: 'mcp-test',
        observationIds: [o1.id, o2.id],
        strategy: 'by_ids',
      });
      expect(results.length).toBe(1);
      expect(results[0].strategy).toBe('by_ids');
    });
  });

  // ─── Export Tool ───────────────────────────────────────────

  describe('mem_export', () => {
    it('should export as JSON', async () => {
      const session = await seedSession(engine, 'mcp-test');
      await seedMultipleObservations(engine, session.id, 3, { projectId: 'mcp-test' });

      const result = await engine.exportObservations({
        format: 'json' as ExportFormat,
        projectId: 'mcp-test',
      });

      expect(result.format).toBe('json');
      expect(result.recordCount).toBe(3);
      expect(result.content).toContain('"title"');

      // Validate it's parseable JSON — format is { observations: [...] }
      const parsed = JSON.parse(result.content);
      expect(parsed.observations).toBeDefined();
      expect(Array.isArray(parsed.observations)).toBe(true);
      expect(parsed.observations.length).toBe(3);
    });

    it('should export as TXT with filters', async () => {
      const session = await seedSession(engine, 'mcp-test');
      await seedObservation(engine, session.id, { type: 'bug', projectId: 'mcp-test' });
      await seedObservation(engine, session.id, { type: 'note', projectId: 'mcp-test' });

      const result = await engine.exportObservations({
        format: 'txt' as ExportFormat,
        projectId: 'mcp-test',
        type: 'bug',
      });

      expect(result.format).toBe('txt');
      expect(result.recordCount).toBe(1);
    });

    it('should export as XML', async () => {
      const session = await seedSession(engine, 'mcp-test');
      await seedObservation(engine, session.id, { projectId: 'mcp-test' });

      const result = await engine.exportObservations({
        format: 'xml' as ExportFormat,
        projectId: 'mcp-test',
      });

      expect(result.format).toBe('xml');
      expect(result.recordCount).toBe(1);
      expect(result.content).toContain('<memento-export');
    });
  });

  // ─── Utility Tools ─────────────────────────────────────────

  describe('mem_timeline / stats / health / config', () => {
    it('should return timeline (chronological observations)', async () => {
      const session = await seedSession(engine, 'mcp-test');
      await seedMultipleObservations(engine, session.id, 5, { projectId: 'mcp-test' });

      const timeline = await engine.search({ projectId: 'mcp-test', limit: 20 });
      expect(timeline.total).toBe(5);
      expect(timeline.observations).toHaveLength(5);

      // Verify chronological order (newest first)
      for (let i = 1; i < timeline.observations.length; i++) {
        expect(timeline.observations[i - 1].createdAt.getTime()).toBeGreaterThanOrEqual(
          timeline.observations[i].createdAt.getTime()
        );
      }
    });

    it('should compute stats (by type, by project)', async () => {
      const session = await seedSession(engine, 'mcp-test');
      await seedObservation(engine, session.id, { type: 'bug', projectId: 'mcp-test' });
      await seedObservation(engine, session.id, { type: 'note', projectId: 'mcp-test' });
      await seedObservation(engine, session.id, { type: 'bug', projectId: 'mcp-test' });

      // Stats pattern: search + group
      const result = await engine.search({ projectId: 'mcp-test' });
      const byType: Record<string, number> = {};
      for (const o of result.observations) {
        byType[o.type] = (byType[o.type] || 0) + 1;
      }

      expect(byType['bug']).toBe(2);
      expect(byType['note']).toBe(1);
      expect(result.total).toBe(3);
    });

    it('should report healthy status', () => {
      expect(engine.isHealthy()).toBe(true);
      expect(engine.getInitError()).toBeNull();
    });

    it('should return database path for config', () => {
      const path = engine.getDatabasePath();
      expect(path).toBe(dbPath);
      expect(path).toContain('test-data');
    });

    it('should report unhealthy with invalid DB path', () => {
      // Engine created with bad path in read-only directory
      const badEngine = new MemoryEngine('/dev/null/impossible/path/db.db');
      expect(badEngine.isHealthy()).toBe(false);
      expect(badEngine.getInitError()).not.toBeNull();
      badEngine.close();
    });
  });

  // ─── Full Workflow E2E ─────────────────────────────────────

  describe('Full MCP Workflow E2E', () => {
    it('should complete: save → search → update → verify', async () => {
      const sessionId = await ctx.getOrCreateSession();

      // Save
      const obs = await engine.createObservation({
        sessionId,
        title: 'Initial Discovery',
        content: 'Found N+1 query in UserList',
        type: 'discovery',
        topicKey: 'perf/userlist',
        projectId: 'mcp-test',
        metadata: {},
      });

      // Search
      const search = await engine.search({ query: 'N+1', projectId: 'mcp-test' });
      expect(search.total).toBe(1);

      // Update (fix applied)
      const updated = await engine.updateObservation(obs.id, {
        type: 'note',
        content: 'Fixed N+1 query in UserList by adding eager loading',
        topicKey: 'fix/userlist-n1',
      });
      expect(updated.type).toBe('note');
      expect(updated.topicKey).toBe('fix/userlist-n1');

      // Verify via get
      const found = await engine.getObservation(obs.id);
      expect(found).not.toBeNull();
      expect(found!.title).toBe('Initial Discovery');
    });

    it('should complete: save → delete → restore → purge', async () => {
      const sessionId = await ctx.getOrCreateSession();
      const obs = await engine.createObservation({
        sessionId,
        title: 'Temp Note',
        content: 'Temporary',
        type: 'note',
        topicKey: null,
        projectId: 'mcp-test',
        metadata: {},
      });

      // Delete
      await engine.deleteObservation(obs.id, 'cleanup');
      let result = await engine.search({ projectId: 'mcp-test' });
      expect(result.total).toBe(0);

      // Restore
      await engine.restoreObservation(obs.id);
      result = await engine.search({ projectId: 'mcp-test' });
      expect(result.total).toBe(1);

      // Delete again and purge
      await engine.deleteObservation(obs.id);
      await engine.purgeObservations({ confirm: true, projectId: 'mcp-test' });

      const deleted = await engine.listDeleted({ projectId: 'mcp-test' });
      expect(deleted.total).toBe(0);

      // Purged = gone forever
      const found = await engine.getObservation(obs.id);
      expect(found).toBeNull();
    });

    it('should complete: multiple sessions → export → merge', async () => {
      // Two sessions, same topic
      const s1 = await seedSession(engine, 'mcp-test');
      const s2 = await seedSession(engine, 'mcp-test');

      await seedObservation(engine, s1.id, { topicKey: 'auth/jwt', content: 'JWT approach v1', projectId: 'mcp-test' });
      await seedObservation(engine, s2.id, { topicKey: 'auth/jwt', content: 'JWT approach v2', projectId: 'mcp-test' });
      await seedObservation(engine, s1.id, { topicKey: 'db/sqlite', content: 'SQLite chosen', projectId: 'mcp-test' });

      // Export before merge
      const exported = await engine.exportObservations({ format: 'json', projectId: 'mcp-test' });
      expect(exported.recordCount).toBe(3);

      // Merge auth/jwt topic
      const merged = await engine.mergeObservations({
        projectId: 'mcp-test',
        topicKey: 'auth/jwt',
        strategy: 'by_topic',
      });
      expect(merged.length).toBe(1);

      // Now 2 obs remain (merged auth + original db/sqlite)
      const remaining = await engine.search({ projectId: 'mcp-test' });
      expect(remaining.total).toBe(2);
    });

    it('should handle error when operating on non-existent observation', async () => {
      // MCP tool pattern: getObservation → null
      const obs = await engine.getObservation(99999);
      expect(obs).toBeNull();

      // updateObservation throws
      expect(engine.updateObservation(99999, { title: 'x' })).rejects.toThrow();
    });
  });

  // ─── Timing Benchmarks (MCP-level operations) ──────────────

  describe('MCP Operation Benchmarks', () => {
    it('should save observation under 100ms', async () => {
      const session = await seedSession(engine, 'mcp-test');
      const { ms } = await measureTime(() =>
        engine.createObservation({
          sessionId: session.id,
          title: 'Benchmark Save',
          content: 'Timing test',
          type: 'note',
          topicKey: 'bench/save',
          projectId: 'mcp-test',
          metadata: {},
        })
      );
      expectUnder(ms, 100, 'save observation');
    });

    it('should search 100 observations under 200ms', async () => {
      const session = await seedSession(engine, 'mcp-test');
      await seedMultipleObservations(engine, session.id, 100, { projectId: 'mcp-test' });

      const { ms } = await measureTime(() =>
        engine.search({ query: 'note', projectId: 'mcp-test' })
      );
      expectUnder(ms, 200, 'search 100 observations');
    });

    it('should export 100 observations under 500ms', async () => {
      const session = await seedSession(engine, 'mcp-test');
      await seedMultipleObservations(engine, session.id, 100, { projectId: 'mcp-test' });

      const { ms } = await measureTime(() =>
        engine.exportObservations({ format: 'json', projectId: 'mcp-test' })
      );
      expectUnder(ms, 500, 'export 100 observations');
    });
  });
});
