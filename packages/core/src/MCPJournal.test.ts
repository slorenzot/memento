/**
 * MCPJournal.test.ts — E2E tests simulating MCP journal tool call flows.
 *
 * Tests exercise the SAME operations that the MCP server journal tools perform,
 * directly against the MemoryEngine — no stdio transport needed.
 *
 * Each test maps to MCP tools:
 *   mem_journal_write, mem_journal_read, mem_journal_search
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { MemoryEngine } from './MemoryEngine';
import { createTestDb, seedSession } from './test-helpers';

// ─── Helper: simulate MCP context ──────────────────────────

function createMCPContext(engine: MemoryEngine, projectId: string = 'mcp-journal-test') {
  let activeSessionId: number | null = null;

  async function getOrCreateSession(): Promise<number> {
    if (activeSessionId) return activeSessionId;
    const session = await engine.createSession({
      projectId,
      endedAt: null,
      metadata: { source: 'journal' },
    });
    activeSessionId = session.id;
    return session.id;
  }

  return {
    getOrCreateSession,
    setActiveSession: (id: number) => { activeSessionId = id; },
    clearSession: () => { activeSessionId = null; },
    getActiveSessionId: () => activeSessionId,
  };
}

describe('MCP Journal Tools E2E', () => {
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

  // ─── mem_journal_write ─────────────────────────────────────

  describe('mem_journal_write', () => {
    it('should create entry with auto-session creation', async () => {
      // Simulates: no active session → auto-create
      const sessionId = await ctx.getOrCreateSession();

      const entry = await engine.writeJournal({
        projectId: 'mcp-journal-test',
        sessionId,
        title: 'Debugging session: FTS5 special chars',
        body: 'FTS5 MATCH clause fails with double quotes. Need to escape.',
        tags: ['debugging', 'search'],
      });

      expect(entry.id).toBeDefined();
      expect(entry.title).toBe('Debugging session: FTS5 special chars');
      expect(entry.tags).toEqual(['debugging', 'search']);
      expect(entry.projectId).toBe('mcp-journal-test');
    });

    it('should create entry with full auto-metadata', async () => {
      const sessionId = await ctx.getOrCreateSession();

      const entry = await engine.writeJournal({
        projectId: 'mcp-journal-test',
        sessionId,
        title: 'Performance discovery',
        body: 'N+1 query found in UserList controller',
        tags: ['perf'],
        model: 'claude-3.5-sonnet',
        provider: 'anthropic',
        agent: 'coder',
        metadata: {
          source: 'ci-pipeline',
          origin: 'agent',
          confidence: 0.95,
        },
      });

      expect(entry.model).toBe('claude-3.5-sonnet');
      expect(entry.provider).toBe('anthropic');
      expect(entry.agent).toBe('coder');
      expect(entry.metadata.source).toBe('ci-pipeline');
      expect(entry.metadata.origin).toBe('agent');
      expect(entry.metadata.confidence).toBe(0.95);
    });

    it('should create entry without session (null sessionId)', async () => {
      const entry = await engine.writeJournal({
        projectId: 'mcp-journal-test',
        title: 'Quick capture',
        body: 'Something I noticed',
      });

      expect(entry.sessionId).toBeNull();
      expect(entry.id).toBeDefined();
    });

    it('should supersede a previous entry', async () => {
      const sessionId = await ctx.getOrCreateSession();

      const original = await engine.writeJournal({
        projectId: 'mcp-journal-test',
        sessionId,
        title: 'Initial hypothesis',
        body: 'Maybe the issue is in the auth middleware',
        tags: ['debugging'],
      });

      const correction = await engine.writeJournal({
        projectId: 'mcp-journal-test',
        sessionId,
        title: 'Correction: root cause found',
        body: 'The issue was in the token validation, not the middleware',
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
          projectId: 'mcp-journal-test',
          title: 'Correction',
          body: 'Body',
          supersedes: 99999,
        })
      ).rejects.toThrow('not found');
    });
  });

  // ─── mem_journal_read ──────────────────────────────────────

  describe('mem_journal_read', () => {
    it('should read entry with all fields', async () => {
      const sessionId = await ctx.getOrCreateSession();

      const created = await engine.writeJournal({
        projectId: 'mcp-journal-test',
        sessionId,
        title: 'Architecture note',
        body: 'Chose hexagonal architecture for payment module',
        tags: ['architecture', 'decision'],
        model: 'gpt-4',
        provider: 'openai',
      });

      const entry = await engine.readJournal(created.id);

      expect(entry).not.toBeNull();
      expect(entry!.title).toBe('Architecture note');
      expect(entry!.body).toBe('Chose hexagonal architecture for payment module');
      expect(entry!.tags.sort()).toEqual(['architecture', 'decision']);
      expect(entry!.model).toBe('gpt-4');
      expect(entry!.provider).toBe('openai');
      expect(entry!.sessionId).toBe(sessionId);
    });

    it('should return null for non-existent entry', async () => {
      const entry = await engine.readJournal(99999);
      expect(entry).toBeNull();
    });

    it('should show invalidation info for superseded entry', async () => {
      const sessionId = await ctx.getOrCreateSession();

      const original = await engine.writeJournal({
        projectId: 'mcp-journal-test',
        sessionId,
        title: 'Old finding',
        body: 'Something wrong',
      });

      const correction = await engine.writeJournal({
        projectId: 'mcp-journal-test',
        sessionId,
        title: 'New finding',
        body: 'Actually correct',
        supersedes: original.id,
      });

      const invalidated = await engine.readJournal(original.id);
      expect(invalidated!.supersededBy).toBe(correction.id);
      expect(invalidated!.invalidatedAt).toBeInstanceOf(Date);
    });
  });

  // ─── mem_journal_search ────────────────────────────────────

  describe('mem_journal_search', () => {
    beforeEach(async () => {
      const sessionId = await ctx.getOrCreateSession();

      await engine.writeJournal({
        projectId: 'mcp-journal-test',
        sessionId,
        title: 'FTS5 query optimization',
        body: 'Using porter stemmer for better search results in FTS5',
        tags: ['perf', 'search'],
        agent: 'coder',
      });

      await engine.writeJournal({
        projectId: 'mcp-journal-test',
        sessionId,
        title: 'React Compiler migration',
        body: 'Removed all useMemo and useCallback calls after React Compiler upgrade',
        tags: ['architecture', 'react'],
        agent: 'coder',
      });

      await engine.writeJournal({
        projectId: 'other-project',
        sessionId,
        title: 'SQLite WAL mode tuning',
        body: 'Increased busy_timeout to 5000ms for better concurrent access',
        tags: ['perf', 'sqlite'],
      });
    });

    it('should search by FTS5 text', async () => {
      const result = await engine.searchJournal({ query: 'FTS5 porter' });
      expect(result.total).toBe(1);
      expect(result.entries[0].title).toContain('FTS5');
    });

    it('should search across body text', async () => {
      const result = await engine.searchJournal({ query: 'useMemo' });
      expect(result.total).toBe(1);
      expect(result.entries[0].title).toContain('React');
    });

    it('should filter by project', async () => {
      const result = await engine.searchJournal({ projectId: 'mcp-journal-test' });
      expect(result.total).toBe(2);
    });

    it('should filter by tags with AND logic', async () => {
      const result = await engine.searchJournal({ tags: ['perf', 'search'] });
      expect(result.total).toBe(1);
      expect(result.entries[0].title).toContain('FTS5');
    });

    it('should filter by single tag', async () => {
      const result = await engine.searchJournal({ tags: ['perf'] });
      expect(result.total).toBe(2); // FTS5 optimization + WAL tuning
    });

    it('should return all entries without filters', async () => {
      const result = await engine.searchJournal({});
      expect(result.total).toBe(3);
    });

    it('should paginate results', async () => {
      const page1 = await engine.searchJournal({ limit: 1, offset: 0 });
      expect(page1.entries.length).toBe(1);
      expect(page1.total).toBe(3);

      const page2 = await engine.searchJournal({ limit: 1, offset: 1 });
      expect(page2.entries.length).toBe(1);
      expect(page2.total).toBe(3);
    });

    it('should combine FTS + project filter', async () => {
      const result = await engine.searchJournal({
        query: 'optimization',
        projectId: 'other-project',
      });
      expect(result.total).toBe(0); // optimization entry is in mcp-journal-test
    });

    it('should exclude invalidated entries with activeOnly', async () => {
      // Create and supersede an entry
      const original = await engine.writeJournal({
        projectId: 'mcp-journal-test',
        title: 'Will be invalidated',
        body: 'This finding is wrong',
        tags: ['debugging'],
      });

      const correction = await engine.writeJournal({
        projectId: 'mcp-journal-test',
        title: 'Correct finding',
        body: 'This is the right answer',
        supersedes: original.id,
      });

      // activeOnly should exclude invalidated
      const activeResult = await engine.searchJournal({ activeOnly: true });
      const invalidatedEntry = activeResult.entries.find((e) => e.id === original.id);
      expect(invalidatedEntry).toBeUndefined();

      const correctedEntry = activeResult.entries.find((e) => e.id === correction.id);
      expect(correctedEntry).toBeDefined();

      // Without activeOnly, should include all
      const allResult = await engine.searchJournal({});
      expect(allResult.total).toBe(5); // 3 seed + 1 original + 1 correction
    });

    it('should filter by date range', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 86400000);
      const tomorrow = new Date(now.getTime() + 86400000);

      // From yesterday → all entries
      const recentResult = await engine.searchJournal({ dateFrom: yesterday });
      expect(recentResult.total).toBe(3);

      // From tomorrow → no entries
      const futureResult = await engine.searchJournal({ dateFrom: tomorrow });
      expect(futureResult.total).toBe(0);
    });
  });

  // ─── Cross-tool E2E flow ──────────────────────────────────

  describe('E2E: Debugging session flow', () => {
    it('should capture a full debugging session in journal', async () => {
      const sessionId = await ctx.getOrCreateSession();

      // Agent discovers an issue
      const discovery = await engine.writeJournal({
        projectId: 'mcp-journal-test',
        sessionId,
        title: 'Bug: Search returns duplicates',
        body: 'FTS5 query returns duplicate rows when using JOIN with observations table',
        tags: ['bug', 'search'],
        agent: 'coder',
      });

      // Agent investigates
      const investigation = await engine.writeJournal({
        projectId: 'mcp-journal-test',
        sessionId,
        title: 'Root cause: missing DISTINCT in search query',
        body: 'The JOIN creates duplicate matches when multiple FTS terms hit the same row',
        tags: ['debugging'],
        agent: 'coder',
      });

      // Agent fixes and corrects initial hypothesis
      const fix = await engine.writeJournal({
        projectId: 'mcp-journal-test',
        sessionId,
        title: 'Fix: Added DISTINCT to search SQL',
        body: 'Changed JOIN to use SELECT DISTINCT to prevent duplicate results',
        tags: ['fix', 'search'],
        agent: 'coder',
        supersedes: discovery.id,
      });

      // Verify audit trail
      const invalidated = await engine.readJournal(discovery.id);
      expect(invalidated!.supersededBy).toBe(fix.id);
      expect(invalidated!.invalidatedAt).toBeInstanceOf(Date);

      // Search for all debugging entries in this session
      const sessionEntries = await engine.searchJournal({
        sessionId,
        activeOnly: true,
      });
      expect(sessionEntries.total).toBe(2); // investigation + fix (discovery is invalidated)

      // Search by tag
      const searchTagged = await engine.searchJournal({
        tags: ['search'],
        projectId: 'mcp-journal-test',
        activeOnly: true,
      });
      expect(searchTagged.total).toBe(1); // only fix has search tag and is active
      expect(searchTagged.entries[0].title).toContain('Fix');
    });
  });
});
