/**
 * Issue #60: FTS5 search crashes with special characters (#, numbers)
 *
 * mem_search crashes when the query contains special characters like
 * #, *, ", (, numbers with dashes (e.g., 2026-05-07). FTS5 interprets
 * these as operators causing "no such column" or syntax errors.
 *
 * Fix: sanitizeFTS5Query() strips FTS5 operators before passing to MATCH.
 * If query is empty after sanitization, falls back to non-FTS5 mode.
 */
import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'bun:test';
import { MemoryEngine } from './MemoryEngine';
import {
  createTestDb,
  cleanupTestDir,
  ensureTestDir,
  seedSession,
  seedObservation,
} from './test-helpers';

describe('Issue #60 — FTS5 search with special characters', () => {
  let engine: MemoryEngine;
  let sessionId: number;

  beforeAll(ensureTestDir);
  afterAll(cleanupTestDir);

  beforeEach(async () => {
    const ctx = createTestDb();
    engine = ctx.engine;
    const session = await seedSession(engine, 'issue-60-project');
    sessionId = session.id;
  });

  afterEach(() => {
    engine.close();
  });

  // ─── Exact reproduction from issue ──────────────────────────

  it('should not crash with date-like query "2026-05-07"', async () => {
    // Seed data so there's something to search
    await seedObservation(engine, sessionId, {
      title: 'FTS5 crash special 2026-05-07',
      content: 'Discovered issue during comparison test run with special characters',
      projectId: 'issue-60-project',
    });

    // This would crash with "no such column: 05" before the fix
    const result = await engine.search({
      query: 'FTS5 crash special 2026-05-07',
      projectId: 'issue-60-project',
    });

    // Should not throw, and should find the observation
    expect(result.observations.length).toBeGreaterThanOrEqual(0);
    // The sanitized query "FTS5 crash special 2026 05 07" should match
    expect(result.total).toBeGreaterThanOrEqual(1);
  });

  // ─── Special character cases ────────────────────────────────

  it('should not crash with hashtag # in query', async () => {
    await seedObservation(engine, sessionId, {
      title: 'PR review for feature branch',
      content: 'Reviewed PR number forty-two about authentication',
      projectId: 'issue-60-project',
    });

    const result = await engine.search({
      query: 'PR review #42',
      projectId: 'issue-60-project',
    });

    expect(result.observations.length).toBeGreaterThanOrEqual(0);
  });

  it('should not crash with asterisk * in query', async () => {
    await seedObservation(engine, sessionId, {
      title: 'Wildcard test observation',
      content: 'Content about glob patterns and matching',
      projectId: 'issue-60-project',
    });

    const result = await engine.search({
      query: 'wildcard * pattern',
      projectId: 'issue-60-project',
    });

    expect(result.observations.length).toBeGreaterThanOrEqual(0);
  });

  it('should not crash with double quotes in query', async () => {
    await seedObservation(engine, sessionId, {
      title: 'Exact phrase search test',
      content: 'This content contains an exact phrase to find',
      projectId: 'issue-60-project',
    });

    const result = await engine.search({
      query: '"exact phrase" search',
      projectId: 'issue-60-project',
    });

    expect(result.observations.length).toBeGreaterThanOrEqual(0);
  });

  it('should not crash with parentheses in query', async () => {
    await seedObservation(engine, sessionId, {
      title: 'Function call syntax',
      content: 'Using the execute(param1, param2) method for testing',
      projectId: 'issue-60-project',
    });

    const result = await engine.search({
      query: 'execute(param1, param2)',
      projectId: 'issue-60-project',
    });

    expect(result.observations.length).toBeGreaterThanOrEqual(0);
  });

  it('should not crash with curly braces in query', async () => {
    await seedObservation(engine, sessionId, {
      title: 'JSON object example',
      content: 'Configuration uses key value pairs in objects',
      projectId: 'issue-60-project',
    });

    const result = await engine.search({
      query: 'config {key: value}',
      projectId: 'issue-60-project',
    });

    expect(result.observations.length).toBeGreaterThanOrEqual(0);
  });

  it('should not crash with square brackets in query', async () => {
    await seedObservation(engine, sessionId, {
      title: 'Array notation test',
      content: 'Access array elements by index for iteration',
      projectId: 'issue-60-project',
    });

    const result = await engine.search({
      query: 'array[0] element',
      projectId: 'issue-60-project',
    });

    expect(result.observations.length).toBeGreaterThanOrEqual(0);
  });

  it('should not crash with colon in query', async () => {
    await seedObservation(engine, sessionId, {
      title: 'Title prefix example',
      content: 'Using prefix notation for categorization',
      projectId: 'issue-60-project',
    });

    const result = await engine.search({
      query: 'prefix:value notation',
      projectId: 'issue-60-project',
    });

    expect(result.observations.length).toBeGreaterThanOrEqual(0);
  });

  it('should not crash with caret ^ in query', async () => {
    await seedObservation(engine, sessionId, {
      title: 'Power operator test',
      content: 'Mathematical expression with exponent',
      projectId: 'issue-60-project',
    });

    const result = await engine.search({
      query: 'x^2 exponent',
      projectId: 'issue-60-project',
    });

    expect(result.observations.length).toBeGreaterThanOrEqual(0);
  });

  it('should not crash with exclamation mark in query', async () => {
    await seedObservation(engine, sessionId, {
      title: 'Negation operator test',
      content: 'Logical negation in search queries',
      projectId: 'issue-60-project',
    });

    const result = await engine.search({
      query: '!negation operator',
      projectId: 'issue-60-project',
    });

    expect(result.observations.length).toBeGreaterThanOrEqual(0);
  });

  // ─── Edge case: empty after sanitization ────────────────────

  it('should fall back to non-FTS5 mode when query is only special chars', async () => {
    await seedObservation(engine, sessionId, {
      title: 'Normal observation',
      content: 'Regular content here',
      projectId: 'issue-60-project',
    });

    // Query with ONLY special characters → sanitized to empty
    const result = await engine.search({
      query: '#*"$(){}',
      projectId: 'issue-60-project',
    });

    // Should not crash, returns all observations for project (non-FTS5 mode)
    expect(result.observations.length).toBeGreaterThanOrEqual(1);
  });

  // ─── Sanitization preserves valid words ─────────────────────

  it('should preserve valid search terms while stripping special chars', async () => {
    await seedObservation(engine, sessionId, {
      title: 'Bug fix for auth module',
      content: 'Fixed N+1 query in UserList auth component during 2026',
      projectId: 'issue-60-project',
    });

    // Query with mix of valid words and special chars
    const result = await engine.search({
      query: 'bug #fix for (auth) -2026',
      projectId: 'issue-60-project',
    });

    // "bug fix for auth 2026" after sanitization — should find the observation
    expect(result.total).toBeGreaterThanOrEqual(1);
    expect(result.observations.some((o) => o.title.includes('auth'))).toBe(true);
  });

  it('should still find observations with normal queries after sanitization', async () => {
    await seedObservation(engine, sessionId, {
      title: 'Normal search still works',
      content: 'Regular text without special characters',
      projectId: 'issue-60-project',
    });

    const result = await engine.search({
      query: 'Normal search',
      projectId: 'issue-60-project',
    });

    expect(result.total).toBeGreaterThanOrEqual(1);
  });

  // ─── Journal search also protected ──────────────────────────

  it('should not crash journal search with special characters', async () => {
    await engine.writeJournal({
      projectId: 'issue-60-project',
      sessionId,
      title: 'Journal with special chars',
      body: 'Entry about bug #42 found on 2026-05-07',
    });

    // This would crash before the fix
    const result = await engine.searchJournal({
      query: 'bug #42 date 2026-05-07',
      projectId: 'issue-60-project',
    });

    expect(result.entries.length).toBeGreaterThanOrEqual(0);
  });
});
