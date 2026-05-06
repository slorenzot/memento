import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'bun:test';
import { MemoryEngine } from './MemoryEngine';
import {
  measureTime,
  expectUnder,
  bench,
  createTestDb,
  cleanupTestDir,
  ensureTestDir,
  seedSession,
  seedObservation,
  seedMultipleObservations,
} from './test-helpers';

describe('Export', () => {
  let engine: MemoryEngine;
  let sessionId: number;

  beforeAll(ensureTestDir);
  afterAll(cleanupTestDir);

  beforeEach(async () => {
    const ctx = createTestDb();
    engine = ctx.engine;
    const session = await seedSession(engine, 'export-project');
    sessionId = session.id;
  });

  afterEach(() => {
    engine.close();
  });

  // ─── JSON Export ──────────────────────────────────────────

  describe('Export JSON', () => {
    it('#109 — should export valid JSON with correct schema', async () => {
      await seedObservation(engine, sessionId, {
        title: 'Export Test',
        content: 'Content for export',
        type: 'decision',
        topicKey: 'export-topic',
      });

      const result = await bench('#109 export JSON schema', 200, async () => {
        return engine.exportObservations({ format: 'json', projectId: 'export-project' });
      });

      expect(result.format).toBe('json');
      expect(result.recordCount).toBeGreaterThanOrEqual(1);

      const parsed = JSON.parse(result.content);
      expect(parsed.exportedAt).toBeDefined();
      expect(parsed.version).toBe('1.0');
      expect(parsed.project).toBe('export-project');
      expect(parsed.totalRecords).toBeGreaterThanOrEqual(1);
      expect(parsed.observations).toBeInstanceOf(Array);
      expect(parsed.observations[0].title).toBe('Export Test');
      expect(parsed.observations[0].type).toBe('decision');
    });
  });

  // ─── XML Export ───────────────────────────────────────────

  describe('Export XML', () => {
    it('#110 — should export well-formed XML', async () => {
      await seedObservation(engine, sessionId, {
        title: 'XML Test',
        content: 'XML content',
      });

      const result = await bench('#110 export XML', 200, async () => {
        return engine.exportObservations({ format: 'xml', projectId: 'export-project' });
      });

      expect(result.format).toBe('xml');
      expect(result.content).toContain('<?xml version="1.0"');
      expect(result.content).toContain('<memento-export');
      expect(result.content).toContain('<observation ');
      expect(result.content).toContain('<title>XML Test</title>');
      expect(result.content).toContain('<content><![CDATA[XML content]]></content>');
      expect(result.content).toContain('</memento-export>');
    });

    it('#111 — should escape special characters in XML', async () => {
      await seedObservation(engine, sessionId, {
        title: 'XML & <Special> "Chars"',
        content: 'Content with & < > " characters',
      });

      const result = await engine.exportObservations({
        format: 'xml',
        projectId: 'export-project',
      });

      // Title should be escaped
      expect(result.content).toContain('&amp;');
      expect(result.content).toContain('&lt;');
      expect(result.content).toContain('&gt;');
      expect(result.content).toContain('&quot;');
      // CDATA for content should NOT be escaped (uses CDATA)
      expect(result.content).toContain('<![CDATA[Content with & < > " characters]]>');
    });
  });

  // ─── TXT Export ───────────────────────────────────────────

  describe('Export TXT', () => {
    it('#112 — should export readable TXT format', async () => {
      await seedObservation(engine, sessionId, {
        title: 'TXT Test',
        content: 'TXT readable content',
        type: 'bug',
        topicKey: 'txt-topic',
      });

      const result = await bench('#112 export TXT', 200, async () => {
        return engine.exportObservations({ format: 'txt', projectId: 'export-project' });
      });

      expect(result.format).toBe('txt');
      expect(result.content).toContain('MEMENTO EXPORT');
      expect(result.content).toContain('export-project');
      expect(result.content).toContain('[#');
      expect(result.content).toContain('TXT Test');
      expect(result.content).toContain('Type: bug');
      expect(result.content).toContain('Topic: txt-topic');
      expect(result.content).toContain('TXT readable content');
    });
  });

  // ─── Filters ──────────────────────────────────────────────

  describe('Export with filters', () => {
    beforeEach(async () => {
      await seedObservation(engine, sessionId, {
        title: 'Decision 1',
        type: 'decision',
        topicKey: 'auth',
      });
      await seedObservation(engine, sessionId, {
        title: 'Bug 1',
        type: 'bug',
        topicKey: 'ui',
      });
      await seedObservation(engine, sessionId, {
        title: 'Note 1',
        type: 'note',
        topicKey: 'auth',
      });
    });

    it('#113 — should filter by projectId', async () => {
      const result = await engine.exportObservations({
        format: 'json',
        projectId: 'export-project',
      });
      const parsed = JSON.parse(result.content);
      expect(parsed.totalRecords).toBeGreaterThanOrEqual(3);
    });

    it('#114 — should filter by type', async () => {
      const result = await engine.exportObservations({
        format: 'json',
        projectId: 'export-project',
        type: 'bug',
      });
      const parsed = JSON.parse(result.content);
      expect(parsed.totalRecords).toBe(1);
      expect(parsed.observations[0].type).toBe('bug');
    });

    it('#115 — should filter by topicKey', async () => {
      const result = await engine.exportObservations({
        format: 'json',
        projectId: 'export-project',
        topicKey: 'auth',
      });
      const parsed = JSON.parse(result.content);
      expect(parsed.totalRecords).toBe(2);
      parsed.observations.forEach((o: any) => {
        expect(o.topicKey).toBe('auth');
      });
    });

    it('#116 — should filter by dateFrom', async () => {
      // Export from future → should be 0
      const result = await engine.exportObservations({
        format: 'json',
        dateFrom: new Date('2099-01-01'),
      });
      expect(result.recordCount).toBe(0);
    });

    it('#117 — should filter by dateTo', async () => {
      // Export up to far future → should include all
      const result = await engine.exportObservations({
        format: 'json',
        dateTo: new Date('2099-01-01'),
        projectId: 'export-project',
      });
      expect(result.recordCount).toBeGreaterThanOrEqual(3);
    });

    it('#118 — should include deleted with includeDeleted', async () => {
      const obs = await seedObservation(engine, sessionId, { title: 'ToDelete' });
      await engine.deleteObservation(obs.id);

      const result = await engine.exportObservations({
        format: 'json',
        projectId: 'export-project',
        includeDeleted: true,
      });
      const parsed = JSON.parse(result.content);
      const found = parsed.observations.find((o: any) => o.title === 'ToDelete');
      expect(found).toBeDefined();
      expect(found.deletedAt).toBeDefined();
    });
  });

  // ─── Edge Cases ───────────────────────────────────────────

  describe('Export edge cases', () => {
    it('#119 — should export empty structure for 0 observations', async () => {
      const result = await bench('#119 export empty', 50, async () => {
        return engine.exportObservations({
          format: 'json',
          projectId: 'nonexistent-project',
        });
      });

      expect(result.recordCount).toBe(0);
      const parsed = JSON.parse(result.content);
      expect(parsed.observations).toHaveLength(0);
      expect(parsed.totalRecords).toBe(0);
    });

    it('#120 — should throw for invalid format', async () => {
      await expect(
        engine.exportObservations({ format: 'csv' as any })
      ).rejects.toThrow('Unsupported export format');
    });

    it('#121 — recordCount should match actual observations', async () => {
      await seedMultipleObservations(engine, sessionId, 5);

      const result = await engine.exportObservations({
        format: 'json',
        projectId: 'export-project',
      });

      const parsed = JSON.parse(result.content);
      expect(result.recordCount).toBe(parsed.observations.length);
      expect(result.recordCount).toBe(5);
    });

    it('#122 — exportedAt should be a valid date', async () => {
      const result = await engine.exportObservations({ format: 'json' });

      expect(result.exportedAt).toBeInstanceOf(Date);
      expect(result.exportedAt.getTime()).toBeLessThanOrEqual(Date.now());
      expect(result.exportedAt.getTime()).toBeGreaterThan(Date.now() - 10000);
    });
  });

  // ─── Benchmarks ───────────────────────────────────────────

  describe('Export Benchmarks', () => {
    it('#123 — export JSON 1,000 observations (< 500ms)', async () => {
      await seedMultipleObservations(engine, sessionId, 1000);

      const { result, ms } = await measureTime(() =>
        engine.exportObservations({ format: 'json', projectId: 'export-project' })
      );

      expectUnder(ms, 500, '#123 export JSON 1K');
      expect(result.recordCount).toBeGreaterThanOrEqual(1000);
    });

    it('#124 — export XML 1,000 observations (< 500ms)', async () => {
      await seedMultipleObservations(engine, sessionId, 1000);

      const { result, ms } = await measureTime(() =>
        engine.exportObservations({ format: 'xml', projectId: 'export-project' })
      );

      expectUnder(ms, 500, '#124 export XML 1K');
      expect(result.recordCount).toBeGreaterThanOrEqual(1000);
    });

    it('#125 — export TXT 1,000 observations (< 500ms)', async () => {
      await seedMultipleObservations(engine, sessionId, 1000);

      const { result, ms } = await measureTime(() =>
        engine.exportObservations({ format: 'txt', projectId: 'export-project' })
      );

      expectUnder(ms, 500, '#125 export TXT 1K');
      expect(result.recordCount).toBeGreaterThanOrEqual(1000);
    });

    it('#126 — export JSON 5,000 observations (< 1000ms)', async () => {
      await seedMultipleObservations(engine, sessionId, 5000);

      const { result, ms } = await measureTime(() =>
        engine.exportObservations({ format: 'json', projectId: 'export-project' })
      );

      expectUnder(ms, 1000, '#126 export JSON 5K');
      expect(result.recordCount).toBeGreaterThanOrEqual(5000);
    });
  });
});
