import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'bun:test';
import { createSearchService, type SearchService } from './useSearch';
import { MemoryEngine } from '@slorenzot/memento-core';
import { mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';

describe('SearchService', () => {
  const testDir = join(process.cwd(), 'test-data');
  let engine: MemoryEngine;
  let searchService: SearchService;
  let sessionId: number;

  const origError = console.error;

  beforeAll(() => {
    console.error = (...args: unknown[]) => {
      if (typeof args[0] === 'string' && args[0].includes('Database initialized')) return;
      origError.apply(console, args);
    };
  });

  afterAll(() => {
    console.error = origError;
  });

  beforeEach(async () => {
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
    const dbPath = join(
      testDir,
      `search-test-${Date.now()}-${Math.random().toString(36).slice(7)}.db`
    );
    engine = new MemoryEngine(dbPath);
    searchService = createSearchService(engine);

    const session = await engine.createSession({
      projectId: 'search-test',
      endedAt: null,
      metadata: {},
    });
    sessionId = session.id;

    // Seed observations for search
    await engine.createObservation({
      sessionId,
      title: 'Fixed N+1 query in UserList',
      content: 'The UserList component was making one query per user. Fixed by batching.',
      type: 'bug',
      topicKey: 'perf/query',
      projectId: 'search-test',
      metadata: {},
    });
    await engine.createObservation({
      sessionId,
      title: 'Chose Zustand over Redux for state',
      content: 'Decision to use Zustand for simplicity and better TypeScript support.',
      type: 'decision',
      topicKey: 'architecture/state',
      projectId: 'search-test',
      metadata: {},
    });
    await engine.createObservation({
      sessionId,
      title: 'Discovered FTS5 ranking algorithm',
      content: 'BM25 ranking in FTS5 provides relevance-ordered results out of the box.',
      type: 'discovery',
      topicKey: 'search/fts5',
      projectId: 'search-test',
      metadata: {},
    });
  });

  afterEach(() => {
    engine.close();
  });

  it('should return results for a matching query', async () => {
    const results = await searchService.search('query');

    expect(results.observations.length).toBeGreaterThan(0);
    expect(results.total).toBeGreaterThan(0);
  });

  it('should return empty results for non-matching query', async () => {
    const results = await searchService.search('xyznonexistent123');

    expect(results.observations).toEqual([]);
    expect(results.total).toBe(0);
  });

  it('should find results by title', async () => {
    const results = await searchService.search('Zustand');

    expect(results.total).toBe(1);
    expect(results.observations[0].title).toContain('Zustand');
  });

  it('should find results by content', async () => {
    const results = await searchService.search('BM25');

    expect(results.total).toBe(1);
    expect(results.observations[0].type).toBe('discovery');
  });

  it('should find results by topic key', async () => {
    const results = await searchService.search('architecture');

    expect(results.total).toBe(1);
    expect(results.observations[0].topicKey).toBe('architecture/state');
  });

  it('should filter by type', async () => {
    const results = await searchService.search('query', { type: 'bug' });

    expect(results.total).toBe(1);
    expect(results.observations[0].type).toBe('bug');
  });

  it('should filter by project', async () => {
    const results = await searchService.search('query', { projectId: 'search-test' });

    expect(results.total).toBeGreaterThan(0);
    results.observations.forEach((obs) => {
      expect(obs.projectId).toBe('search-test');
    });
  });

  it('should respect limit', async () => {
    const results = await searchService.search('query', { limit: 1 });

    expect(results.observations.length).toBeLessThanOrEqual(1);
  });

  it('should handle empty query gracefully', async () => {
    const results = await searchService.search('');

    // Empty query should return empty or all, depending on implementation
    expect(results).toBeDefined();
    expect(results.observations).toBeDefined();
  });

  it('should respond in <100ms', async () => {
    const start = performance.now();
    await searchService.search('query');
    const ms = performance.now() - start;

    expect(ms).toBeLessThan(100);
  });
});
