import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'bun:test';
import { MemoryEngine } from './MemoryEngine';
import {
  measureTime,
  expectUnder,
  createTestDb,
  cleanupTestDir,
  ensureTestDir,
  seedSession,
  seedObservation,
  seedMultipleObservations,
} from './test-helpers';

describe('Search Benchmarks — Volume', () => {
  let engine: MemoryEngine;
  let sessionId: number;

  beforeAll(ensureTestDir);
  afterAll(cleanupTestDir);

  beforeEach(async () => {
    const ctx = createTestDb();
    engine = ctx.engine;
    const session = await seedSession(engine, 'bench-search');
    sessionId = session.id;
  });

  afterEach(() => {
    engine.close();
  });

  // ─── 1,000 observations ──────────────────────────────────

  describe('1,000 observations', () => {
    beforeEach(async () => {
      await seedMultipleObservations(engine, sessionId, 1000, { projectId: 'bench-search' });
    });

    it('#74 — search sin filtros (< 200ms)', async () => {
      const { result, ms } = await measureTime(() =>
        engine.search({ projectId: 'bench-search' })
      );

      expectUnder(ms, 200, '#74 search 1K sin filtros');
      expect(result.total).toBeGreaterThanOrEqual(1000);
    });

    it('#75 — search FTS5 query (< 200ms)', async () => {
      // Seed one with unique content to search for
      await seedObservation(engine, sessionId, {
        title: 'UniqueBenchmarkTarget',
        content: 'This is a unique benchmark target for FTS5 query testing',
        projectId: 'bench-search',
      });

      const { result, ms } = await measureTime(() =>
        engine.search({ query: 'UniqueBenchmarkTarget', projectId: 'bench-search' })
      );

      expectUnder(ms, 200, '#75 FTS5 query 1K');
      expect(result.total).toBeGreaterThanOrEqual(1);
    });

    it('#76 — search type filter (< 200ms)', async () => {
      const { result, ms } = await measureTime(() =>
        engine.search({ type: 'note', projectId: 'bench-search' })
      );

      expectUnder(ms, 200, '#76 type filter 1K');
      expect(result.total).toBeGreaterThanOrEqual(1000);
    });

    it('#77 — search combinación filtros (< 500ms)', async () => {
      await seedObservation(engine, sessionId, {
        title: 'Combined Filter Target',
        content: 'Content for combined filter testing',
        type: 'decision',
        topicKey: 'bench-combo',
        projectId: 'bench-search',
      });

      const { result, ms } = await measureTime(() =>
        engine.search({
          query: 'Combined',
          type: 'decision',
          topicKey: 'bench-combo',
          projectId: 'bench-search',
        })
      );

      expectUnder(ms, 500, '#77 combined filters 1K');
      expect(result.total).toBeGreaterThanOrEqual(1);
    });
  });

  // ─── 5,000 observations ──────────────────────────────────

  describe('5,000 observations', () => {
    beforeEach(async () => {
      await seedMultipleObservations(engine, sessionId, 5000, { projectId: 'bench-search' });
    });

    it('#78 — FTS5 query (< 500ms)', async () => {
      await seedObservation(engine, sessionId, {
        title: 'FiveKSearchTarget',
        content: 'Unique content for five thousand observation search benchmark',
        projectId: 'bench-search',
      });

      const { result, ms } = await measureTime(() =>
        engine.search({ query: 'FiveKSearchTarget', projectId: 'bench-search' })
      );

      expectUnder(ms, 500, '#78 FTS5 query 5K');
      expect(result.total).toBeGreaterThanOrEqual(1);
    });

    it('#79 — search sin filtros full scan (< 500ms)', async () => {
      const { result, ms } = await measureTime(() =>
        engine.search({ projectId: 'bench-search' })
      );

      expectUnder(ms, 500, '#79 full scan 5K');
      expect(result.total).toBeGreaterThanOrEqual(5000);
    });
  });

  // ─── 10,000 observations ─────────────────────────────────

  describe('10,000 observations', () => {
    beforeEach(async () => {
      await seedMultipleObservations(engine, sessionId, 10000, { projectId: 'bench-search' });
    });

    it('#80 — FTS5 query (< 500ms)', async () => {
      await seedObservation(engine, sessionId, {
        title: 'TenKSearchTarget',
        content: 'Unique content for ten thousand observation search benchmark',
        projectId: 'bench-search',
      });

      const { result, ms } = await measureTime(() =>
        engine.search({ query: 'TenKSearchTarget', projectId: 'bench-search' })
      );

      expectUnder(ms, 500, '#80 FTS5 query 10K');
      expect(result.total).toBeGreaterThanOrEqual(1);
    });

    it('#81 — paginación offset 5,000 (< 500ms)', async () => {
      const { result, ms } = await measureTime(() =>
        engine.search({ projectId: 'bench-search', limit: 100, offset: 5000 })
      );

      expectUnder(ms, 500, '#81 offset 5K');
      expect(result.observations.length).toBeLessThanOrEqual(100);
      expect(result.total).toBeGreaterThanOrEqual(10000);
    });
  });
});
