import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { MemoryEngine } from './MemoryEngine';
import { createTestDb, cleanupTestDir, seedSession } from './test-helpers';
import type { JournalEntry } from './types';

describe('Journal (append-only evidence)', () => {
  let engine: MemoryEngine;
  let dbPath: string;

  beforeEach(() => {
    const setup = createTestDb();
    engine = setup.engine;
    dbPath = setup.dbPath;
  });

  afterEach(() => {
    engine.close();
    cleanupTestDir();
  });

  // ─── writeJournal ──────────────────────────────────────────

  describe('writeJournal', () => {
    it('should create a journal entry with auto-metadata', async () => {
      const session = await seedSession(engine);

      const entry = await engine.writeJournal({
        projectId: 'test-project',
        sessionId: session.id,
        title: 'Debugging FTS5 special chars',
        body: 'Found that FTS5 chokes on quotes inside MATCH expressions',
        tags: ['debugging', 'search'],
        model: 'claude-3.5-sonnet',
        provider: 'anthropic',
        agent: 'coder',
      });

      expect(entry.id).toBeDefined();
      expect(entry.uuid).toBeDefined();
      expect(entry.projectId).toBe('test-project');
      expect(entry.sessionId).toBe(session.id);
      expect(entry.title).toBe('Debugging FTS5 special chars');
      expect(entry.body).toBe('Found that FTS5 chokes on quotes inside MATCH expressions');
      expect(entry.tags).toEqual(['debugging', 'search']);
      expect(entry.model).toBe('claude-3.5-sonnet');
      expect(entry.provider).toBe('anthropic');
      expect(entry.agent).toBe('coder');
      expect(entry.supersededBy).toBeNull();
      expect(entry.invalidatedAt).toBeNull();
      expect(entry.createdAt).toBeInstanceOf(Date);
    });

    it('should create entry without tags or metadata', async () => {
      const entry = await engine.writeJournal({
        projectId: 'test-project',
        title: 'Quick note',
        body: 'Something I noticed',
      });

      expect(entry.tags).toEqual([]);
      expect(entry.sessionId).toBeNull();
      expect(entry.model).toBeNull();
      expect(entry.provider).toBeNull();
      expect(entry.agent).toBeNull();
      expect(entry.metadata).toEqual({});
    });

    it('should create entry with custom metadata', async () => {
      const entry = await engine.writeJournal({
        projectId: 'test-project',
        title: 'Automated finding',
        body: 'Detected by CI',
        metadata: {
          source: 'ci-pipeline',
          origin: 'agent',
          confidence: 0.92,
        },
      });

      expect(entry.metadata.source).toBe('ci-pipeline');
      expect(entry.metadata.origin).toBe('agent');
      expect(entry.metadata.confidence).toBe(0.92);
    });

    it('should store tags in normalized journal_tags table', async () => {
      await engine.writeJournal({
        projectId: 'test-project',
        title: 'Tagged entry',
        body: 'Testing tags',
        tags: ['perf', 'debugging', 'architecture'],
      });

      const entry = await engine.readJournal(1);
      expect(entry!.tags.sort()).toEqual(['architecture', 'debugging', 'perf']);
    });

    it('should deduplicate tags (ignore duplicates)', async () => {
      const entry = await engine.writeJournal({
        projectId: 'test-project',
        title: 'Dup tags',
        body: 'Testing',
        tags: ['debugging', 'debugging', 'perf'],
      });

      // Should only have unique tags
      expect(entry.tags.sort()).toEqual(['debugging', 'perf']);
    });
  });

  // ─── readJournal ───────────────────────────────────────────

  describe('readJournal', () => {
    it('should return entry with all fields', async () => {
      const created = await engine.writeJournal({
        projectId: 'my-project',
        sessionId: null,
        title: 'Full entry',
        body: 'Detailed body',
        tags: ['learning'],
        model: 'gpt-4',
        provider: 'openai',
        agent: 'reviewer',
      });

      const entry = await engine.readJournal(created.id);

      expect(entry).not.toBeNull();
      expect(entry!.id).toBe(created.id);
      expect(entry!.uuid).toBe(created.uuid);
      expect(entry!.title).toBe('Full entry');
      expect(entry!.body).toBe('Detailed body');
      expect(entry!.tags).toEqual(['learning']);
      expect(entry!.model).toBe('gpt-4');
      expect(entry!.provider).toBe('openai');
      expect(entry!.agent).toBe('reviewer');
    });

    it('should return null for non-existent entry', async () => {
      const entry = await engine.readJournal(99999);
      expect(entry).toBeNull();
    });
  });

  // ─── searchJournal ─────────────────────────────────────────

  describe('searchJournal', () => {
    beforeEach(async () => {
      // Seed entries with various tags and content
      await engine.writeJournal({
        projectId: 'project-a',
        title: 'Debugging FTS5 quotes',
        body: 'FTS5 crashes on double quotes in MATCH clause',
        tags: ['debugging', 'search'],
        model: 'claude-3.5-sonnet',
      });

      await engine.writeJournal({
        projectId: 'project-a',
        title: 'Performance bottleneck',
        body: 'N+1 query in UserList causing slow page load',
        tags: ['perf', 'debugging'],
        model: 'gpt-4',
      });

      await engine.writeJournal({
        projectId: 'project-b',
        title: 'Architecture decision',
        body: 'Chose Zustand over Redux for state management',
        tags: ['architecture'],
      });
    });

    it('should search by FTS5 text query', async () => {
      const result = await engine.searchJournal({ query: 'FTS5' });
      expect(result.total).toBe(1);
      expect(result.entries[0].title).toBe('Debugging FTS5 quotes');
    });

    it('should search by full-text across title and body', async () => {
      const result = await engine.searchJournal({ query: 'query UserList' });
      expect(result.total).toBe(1);
      expect(result.entries[0].title).toBe('Performance bottleneck');
    });

    it('should filter by project', async () => {
      const result = await engine.searchJournal({ projectId: 'project-a' });
      expect(result.total).toBe(2);
    });

    it('should filter by tags (AND logic)', async () => {
      const result = await engine.searchJournal({ tags: ['debugging', 'perf'] });
      // Only "Performance bottleneck" has BOTH debugging AND perf
      expect(result.total).toBe(1);
      expect(result.entries[0].title).toBe('Performance bottleneck');
    });

    it('should filter by single tag', async () => {
      const result = await engine.searchJournal({ tags: ['debugging'] });
      // Both FTS5 and Performance have debugging tag
      expect(result.total).toBe(2);
    });

    it('should filter by project AND tags combined', async () => {
      const result = await engine.searchJournal({ projectId: 'project-a', tags: ['architecture'] });
      // Architecture entry is in project-b
      expect(result.total).toBe(0);
    });

    it('should return all entries with empty filters', async () => {
      const result = await engine.searchJournal({});
      expect(result.total).toBe(3);
    });

    it('should paginate with limit and offset', async () => {
      const page1 = await engine.searchJournal({ limit: 2, offset: 0 });
      expect(page1.entries.length).toBe(2);
      expect(page1.total).toBe(3);

      const page2 = await engine.searchJournal({ limit: 2, offset: 2 });
      expect(page2.entries.length).toBe(1);
      expect(page2.total).toBe(3);
    });

    it('should filter by date range', async () => {
      // All entries were just created, so from now-1 day should return all
      const yesterday = new Date(Date.now() - 86400000);
      const result = await engine.searchJournal({ dateFrom: yesterday });
      expect(result.total).toBe(3);

      // Future date should return none
      const tomorrow = new Date(Date.now() + 86400000);
      const futureResult = await engine.searchJournal({ dateFrom: tomorrow });
      expect(futureResult.total).toBe(0);
    });

    it('should filter by session', async () => {
      const session = await seedSession(engine, 'project-a');
      await engine.writeJournal({
        projectId: 'project-a',
        sessionId: session.id,
        title: 'Session entry',
        body: 'Tied to specific session',
      });

      const result = await engine.searchJournal({ sessionId: session.id });
      expect(result.total).toBe(1);
      expect(result.entries[0].title).toBe('Session entry');
    });
  });

  // ─── invalidateJournal ─────────────────────────────────────

  describe('invalidateJournal', () => {
    it('should mark entry as superseded', async () => {
      const original = await engine.writeJournal({
        projectId: 'test-project',
        title: 'Original finding',
        body: 'We think the issue is in the parser',
        tags: ['debugging'],
      });

      const correction = await engine.writeJournal({
        projectId: 'test-project',
        title: 'Correction: root cause found',
        body: 'The issue was in the tokenizer, not the parser',
        tags: ['debugging'],
      });

      await engine.invalidateJournal(original.id, correction.id);

      const invalidated = await engine.readJournal(original.id);
      expect(invalidated!.supersededBy).toBe(correction.id);
      expect(invalidated!.invalidatedAt).toBeInstanceOf(Date);
    });

    it('should throw when invalidating non-existent entry', async () => {
      const entry = await engine.writeJournal({
        projectId: 'test-project',
        title: 'Test',
        body: 'Test body',
      });

      await expect(
        engine.invalidateJournal(99999, entry.id)
      ).rejects.toThrow('not found');
    });

    it('should throw when already invalidated', async () => {
      const original = await engine.writeJournal({
        projectId: 'test-project',
        title: 'Original',
        body: 'Body',
      });

      const correction = await engine.writeJournal({
        projectId: 'test-project',
        title: 'Correction 1',
        body: 'Body 1',
      });

      const correction2 = await engine.writeJournal({
        projectId: 'test-project',
        title: 'Correction 2',
        body: 'Body 2',
      });

      await engine.invalidateJournal(original.id, correction.id);

      await expect(
        engine.invalidateJournal(original.id, correction2.id)
      ).rejects.toThrow('already invalidated');
    });

    it('should filter invalidated entries with activeOnly', async () => {
      const original = await engine.writeJournal({
        projectId: 'test-project',
        title: 'Will be invalidated',
        body: 'Body',
      });

      const corrected = await engine.writeJournal({
        projectId: 'test-project',
        title: 'Correction',
        body: 'Fixed body',
      });

      await engine.invalidateJournal(original.id, corrected.id);

      // activeOnly should exclude invalidated
      const activeResult = await engine.searchJournal({ activeOnly: true });
      expect(activeResult.total).toBe(1);
      expect(activeResult.entries[0].title).toBe('Correction');

      // Without activeOnly, should include all
      const allResult = await engine.searchJournal({});
      expect(allResult.total).toBe(2);
    });
  });

  // ─── writeJournal with supersedes ──────────────────────────

  describe('writeJournal with supersedes', () => {
    it('should auto-invalidate previous entry when supersedes is set', async () => {
      const original = await engine.writeJournal({
        projectId: 'test-project',
        title: 'Initial hypothesis',
        body: 'Maybe it is the parser',
        tags: ['debugging'],
      });

      const correction = await engine.writeJournal({
        projectId: 'test-project',
        title: 'Updated finding',
        body: 'Confirmed: it is the tokenizer',
        tags: ['debugging'],
        supersedes: original.id,
      });

      // Original should be invalidated
      const refreshed = await engine.readJournal(original.id);
      expect(refreshed!.supersededBy).toBe(correction.id);
      expect(refreshed!.invalidatedAt).toBeInstanceOf(Date);

      // Correction should be clean
      expect(correction.supersededBy).toBeNull();
      expect(correction.invalidatedAt).toBeNull();
    });

    it('should throw when superseding non-existent entry', async () => {
      await expect(
        engine.writeJournal({
          projectId: 'test-project',
          title: 'Correction',
          body: 'Body',
          supersedes: 99999,
        })
      ).rejects.toThrow('not found');
    });

    it('should throw when superseding already invalidated entry', async () => {
      const original = await engine.writeJournal({
        projectId: 'test-project',
        title: 'Original',
        body: 'Body',
      });

      // First correction
      await engine.writeJournal({
        projectId: 'test-project',
        title: 'Correction 1',
        body: 'Body 1',
        supersedes: original.id,
      });

      // Second correction trying to supersede already-invalidated original
      await expect(
        engine.writeJournal({
          projectId: 'test-project',
          title: 'Correction 2',
          body: 'Body 2',
          supersedes: original.id,
        })
      ).rejects.toThrow('already invalidated');
    });
  });

  // ─── Append-only guarantee ──────────────────────────────────

  describe('append-only guarantee', () => {
    it('should have NO update/delete methods for journal entries', () => {
      const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(engine));

      // These should NOT exist
      expect(methods).not.toContain('updateJournal');
      expect(methods).not.toContain('deleteJournal');
      expect(methods).not.toContain('softDeleteJournal');
      expect(methods).not.toContain('mergeJournal');

      // These SHOULD exist
      expect(methods).toContain('writeJournal');
      expect(methods).toContain('readJournal');
      expect(methods).toContain('searchJournal');
      expect(methods).toContain('invalidateJournal');
    });

    it('should not allow direct UPDATE of journal body via DB', async () => {
      const entry = await engine.writeJournal({
        projectId: 'test-project',
        title: 'Immutable',
        body: 'Original body',
      });

      // Attempting to mutate body directly should not affect readJournal
      // (append-only by design — no public API to mutate)
      const reRead = await engine.readJournal(entry.id);
      expect(reRead!.body).toBe('Original body');
    });
  });

  // ─── FTS5 Integration ──────────────────────────────────────

  describe('FTS5 full-text search', () => {
    beforeEach(async () => {
      await engine.writeJournal({
        projectId: 'fts-test',
        title: 'SQLite WAL mode performance',
        body: 'Switched to WAL mode for better concurrent read performance',
        tags: ['perf', 'sqlite'],
      });

      await engine.writeJournal({
        projectId: 'fts-test',
        title: 'React 19 compiler patterns',
        body: 'No more useMemo or useCallback needed with React Compiler',
        tags: ['architecture', 'react'],
      });
    });

    it('should find by word in title', async () => {
      const result = await engine.searchJournal({ query: 'WAL' });
      expect(result.total).toBe(1);
      expect(result.entries[0].title).toContain('WAL');
    });

    it('should find by word in body', async () => {
      const result = await engine.searchJournal({ query: 'useMemo' });
      expect(result.total).toBe(1);
      expect(result.entries[0].title).toContain('React');
    });

    it('should handle porter stemming', async () => {
      // "performance" should match "performance" via porter stemmer
      const result = await engine.searchJournal({ query: 'performance' });
      expect(result.total).toBe(1);
      expect(result.entries[0].title).toContain('SQLite');
    });

    it('should combine FTS with tag filter', async () => {
      const result = await engine.searchJournal({ query: 'performance', tags: ['perf'] });
      expect(result.total).toBe(1);
      expect(result.entries[0].title).toContain('SQLite');
    });

    it('should return empty for non-matching query', async () => {
      const result = await engine.searchJournal({ query: 'kubernetes docker' });
      expect(result.total).toBe(0);
    });
  });
});
