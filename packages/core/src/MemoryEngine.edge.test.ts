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
} from './test-helpers';

describe('Edge Cases & Stress', () => {
  let engine: MemoryEngine;
  let sessionId: number;

  beforeAll(ensureTestDir);
  afterAll(cleanupTestDir);

  beforeEach(async () => {
    const ctx = createTestDb();
    engine = ctx.engine;
    const session = await seedSession(engine, 'edge-project');
    sessionId = session.id;
  });

  afterEach(() => {
    engine.close();
  });

  // ─── Large Content ────────────────────────────────────────

  describe('Large content', () => {
    it('#203 — create obs with 100KB content (< 200ms)', async () => {
      const largeContent = 'x'.repeat(100 * 1024); // 100KB

      const { result, ms } = await measureTime(() =>
        seedObservation(engine, sessionId, {
          title: 'Large Content 100KB',
          content: largeContent,
          projectId: 'edge-project',
        })
      );

      expectUnder(ms, 200, '#203 create 100KB content');
      expect(result.content).toHaveLength(100 * 1024);
    });

    it('#204 — create obs with 1,000 char title (< 100ms)', async () => {
      const longTitle = 'T'.repeat(1000);

      const { result, ms } = await measureTime(() =>
        seedObservation(engine, sessionId, {
          title: longTitle,
          content: 'Normal content',
          projectId: 'edge-project',
        })
      );

      expectUnder(ms, 100, '#204 create 1K char title');
      expect(result.title).toHaveLength(1000);
    });
  });

  // ─── FTS5 Edge Cases ──────────────────────────────────────

  describe('FTS5 edge cases', () => {
    it('#205 — search with invalid FTS5 syntax should not crash', async () => {
      await seedObservation(engine, sessionId, {
        title: 'FTS Edge',
        content: 'Content for FTS edge testing',
        projectId: 'edge-project',
      });

      // FTS5 special chars that could break parsing
      // Some will throw FTS5 syntax errors — that's OK, we just verify no crash
      const dangerousQueries = ['OR AND NOT', '***', '&&||'];

      for (const query of dangerousQueries) {
        try {
          const result = await engine.search({ query, projectId: 'edge-project' });
          expect(result).toBeDefined();
          expect(result.total).toBeGreaterThanOrEqual(0);
        } catch (error: any) {
          // FTS5 syntax errors are acceptable — we just verify no segfault/crash
          expect(error.message).toBeDefined();
        }
      }
    });

    it('#208 — all observation types are FTS5 searchable', async () => {
      const types = ['decision', 'bug', 'discovery', 'note'] as const;

      for (const type of types) {
        await seedObservation(engine, sessionId, {
          title: `SearchableType ${type}`,
          content: `Unique content for type ${type} searchability test`,
          type,
          projectId: 'edge-project',
        });
      }

      const { ms } = await measureTime(async () => {
        for (const type of types) {
          const result = await engine.search({
            query: `SearchableType ${type}`,
            projectId: 'edge-project',
          });
          expect(result.total).toBeGreaterThanOrEqual(1);
        }
      });

      expectUnder(ms, 200, '#208 all types searchable');
    });
  });

  // ─── Special Characters ───────────────────────────────────

  describe('Special characters', () => {
    it('#209 — observation with <>&"\' in content', async () => {
      const specialContent = 'Content with <>&"\' special chars & <tag> "quoted" \'single\'';

      const obs = await seedObservation(engine, sessionId, {
        title: 'Special Chars',
        content: specialContent,
        projectId: 'edge-project',
      });

      expect(obs.content).toBe(specialContent);

      const retrieved = await engine.getObservation(obs.id);
      expect(retrieved!.content).toBe(specialContent);
    });

    it('#206 — metadata with Unicode/emoji', async () => {
      const unicodeMetadata = {
        emoji: '🚀 🎉 ✅ ❌',
        chinese: '你好世界',
        arabic: 'مرحبا',
        russian: 'Привет мир',
        math: '∑ ∫ ∞ ≈',
      };

      const obs = await seedObservation(engine, sessionId, {
        title: 'Unicode Metadata',
        content: 'Testing unicode in metadata',
        metadata: unicodeMetadata,
        projectId: 'edge-project',
      });

      expect(obs.metadata).toEqual(unicodeMetadata);

      const retrieved = await engine.getObservation(obs.id);
      expect(retrieved!.metadata).toEqual(unicodeMetadata);
    });
  });

  // ─── Database Corruption ──────────────────────────────────

  describe('Database corruption resilience', () => {
    it('#207 — isHealthy() false with corrupted DB, operations fail gracefully', async () => {
      const engine = new MemoryEngine('/dev/null/corrupt/db.db');

      expect(engine.isHealthy()).toBe(false);

      // Operations should throw descriptive errors
      await expect(
        engine.createSession({ projectId: 'test', endedAt: null, metadata: {} })
      ).rejects.toThrow(/Database not initialized/);

      await expect(
        engine.search({})
      ).rejects.toThrow(/Database not initialized/);

      engine.close();
    });
  });
});
