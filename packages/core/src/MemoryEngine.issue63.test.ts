/**
 * MemoryEngine.issue63.test.ts — Stable ordering tests (Issue #63)
 *
 * Verifies that ALL list-producing operations return deterministic ordering
 * even when multiple observations share the same timestamp.
 * This is critical for prompt caching by LLM providers (Anthropic, OpenAI).
 */
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { MemoryEngine } from './MemoryEngine';
import { mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';

describe('Issue #63 — Stable Ordering for Prompt Caching', () => {
  let engine: MemoryEngine;
  let testDbPath: string;
  const testDir = join(process.cwd(), 'test-data');

  beforeEach(() => {
    if (!existsSync(testDir)) mkdirSync(testDir, { recursive: true });
    testDbPath = join(testDir, `issue63-${Date.now()}-${Math.random().toString(36).slice(7)}.db`);
    engine = new MemoryEngine(testDbPath);
  });

  afterEach(() => {
    engine.close();
  });

  /**
   * Helper: create N observations with the SAME created_at timestamp.
   * This simulates real-world scenarios where bulk imports or rapid saves
   * result in identical timestamps, exposing non-deterministic ordering.
   */
  async function seedSameTimestamp(
    count: number,
    overrides: {
      projectId?: string;
      topicKey?: string | null;
      type?: string;
    } = {}
  ): Promise<number[]> {
    const projectId = overrides.projectId ?? 'test-caching';
    const session = await engine.createSession({
      projectId,
      endedAt: null,
      metadata: {},
    });

    const ids: number[] = [];
    const sharedTimestamp = Date.now();

    for (let i = 0; i < count; i++) {
      const obs = await engine.createObservation({
        sessionId: session.id,
        title: `Obs ${i}`,
        content: `Content ${i}`,
        type: (overrides.type ?? 'note') as 'note',
        topicKey: overrides.topicKey ?? null,
        projectId,
        metadata: { index: i },
      });
      ids.push(obs.id);
    }

    // Force all observations to share the same created_at
    // This simulates the edge case where ordering by timestamp alone is non-deterministic
    for (const id of ids) {
      (engine as unknown as { db: { prepare: (sql: string) => { run: (...args: number[]) => void } } }).db
        .prepare('UPDATE observations SET created_at = ? WHERE id = ?')
        .run(sharedTimestamp, id);
    }

    return ids;
  }

  // ─── search() — Issue #63 ─────────────────────────────────

  describe('search()', () => {
    it('should return deterministic order for same-timestamp observations', async () => {
      const ids = await seedSameTimestamp(5);

      const result = await engine.search({
        projectId: 'test-caching',
        limit: 100,
      });

      // All should be returned
      expect(result.observations.length).toBe(5);

      // Order should be: newest first (same timestamp), then by id DESC
      const returnedIds = result.observations.map((o) => o.id);
      expect(returnedIds).toEqual([...ids].reverse());
    });

    it('should produce identical results across multiple calls', async () => {
      await seedSameTimestamp(5);

      const result1 = await engine.search({ projectId: 'test-caching', limit: 100 });
      const result2 = await engine.search({ projectId: 'test-caching', limit: 100 });
      const result3 = await engine.search({ projectId: 'test-caching', limit: 100 });

      const ids1 = result1.observations.map((o) => o.id);
      const ids2 = result2.observations.map((o) => o.id);
      const ids3 = result3.observations.map((o) => o.id);

      expect(ids1).toEqual(ids2);
      expect(ids2).toEqual(ids3);
    });
  });

  // ─── getRecentContext() — Issue #63 ────────────────────────

  describe('getRecentContext()', () => {
    it('should return deterministic order for same-timestamp observations', async () => {
      const ids = await seedSameTimestamp(5);

      const result = await engine.getRecentContext({ projectId: 'test-caching', limit: 20 });

      expect(result.observations.length).toBe(5);

      // created_at DESC, id DESC
      const returnedIds = result.observations.map((o) => o.id);
      expect(returnedIds).toEqual([...ids].reverse());
    });
  });

  // ─── getTimeline() — Issue #63 ─────────────────────────────

  describe('getTimeline()', () => {
    it('should return deterministic order for same-timestamp observations', async () => {
      const ids = await seedSameTimestamp(5);

      const result = await engine.getTimeline({ projectId: 'test-caching', limit: 100 });

      expect(result.observations.length).toBe(5);

      // created_at DESC, id DESC (newest first)
      const returnedIds = result.observations.map((o) => o.id);
      expect(returnedIds).toEqual([...ids].reverse());
    });
  });

  // ─── listDeleted() — Issue #63 ─────────────────────────────

  describe('listDeleted()', () => {
    it('should return deterministic order for same-timestamp deletions', async () => {
      const ids = await seedSameTimestamp(5);

      // Delete all (with a small delay to ensure different deleted_at)
      // Actually, force same deleted_at for deterministic test
      for (const id of ids) {
        await engine.deleteObservation(id);
      }

      // Force same deleted_at timestamp
      const sharedDeletedAt = Date.now();
      for (const id of ids) {
        (engine as unknown as { db: { prepare: (sql: string) => { run: (...args: number[]) => void } } }).db
          .prepare('UPDATE observations SET deleted_at = ? WHERE id = ?')
          .run(sharedDeletedAt, id);
      }

      const result = await engine.listDeleted({ projectId: 'test-caching' });

      expect(result.observations.length).toBe(5);

      // deleted_at DESC, id DESC
      const returnedIds = result.observations.map((o) => o.id);
      expect(returnedIds).toEqual([...ids].reverse());
    });
  });

  // ─── exportObservations() — Issue #63 ──────────────────────

  describe('exportObservations()', () => {
    it('should return deterministic order in exports', async () => {
      const ids = await seedSameTimestamp(5);

      const result = await engine.exportObservations({
        format: 'json',
        projectId: 'test-caching',
      });

      // Parse JSON to extract IDs
      const parsed = JSON.parse(result.content) as { observations: Array<{ id: number }> };

      // created_at ASC, id ASC
      const returnedIds = parsed.observations.map((o) => o.id);
      expect(returnedIds).toEqual(ids);
    });
  });

  // ─── searchJournal() — Issue #63 ───────────────────────────

  describe('searchJournal()', () => {
    it('should return deterministic order for same-timestamp entries', async () => {
      const session = await engine.createSession({
        projectId: 'test-caching',
        endedAt: null,
        metadata: {},
      });

      const ids: number[] = [];
      for (let i = 0; i < 5; i++) {
        const entry = await engine.writeJournal({
          projectId: 'test-caching',
          sessionId: session.id,
          title: `Journal ${i}`,
          body: `Body ${i}`,
          tags: ['test'],
          supersedes: null,
          metadata: {},
        });
        ids.push(entry.id);
      }

      // Force same created_at
      const sharedTimestamp = Date.now();
      for (const id of ids) {
        (engine as unknown as { db: { prepare: (sql: string) => { run: (...args: number[]) => void } } }).db
          .prepare('UPDATE journal SET created_at = ? WHERE id = ?')
          .run(sharedTimestamp, id);
      }

      const result = await engine.searchJournal({ projectId: 'test-caching' });

      expect(result.entries.length).toBe(5);

      // created_at DESC, id DESC
      const returnedIds = result.entries.map((e) => e.id);
      expect(returnedIds).toEqual([...ids].reverse());
    });
  });
});
