import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'bun:test';
import { MemoryEngine } from './MemoryEngine';
import type { Observation, Session } from './types';
import { mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import {
  measureTime,
  expectUnder,
  bench,
  seedMultipleObservations,
} from './test-helpers';

describe('MemoryEngine — CRUD + Timing', () => {
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
    testDbPath = join(testDir, `test-${Date.now()}-${Math.random().toString(36).slice(7)}.db`);
    engine = new MemoryEngine(testDbPath);
  });

  afterEach(() => {
    engine.close();
  });

  // ─── Database Path Management ─────────────────────────────

  describe('Database Path Management', () => {
    it('should create database in specified path', () => {
      expect(existsSync(testDbPath)).toBe(true);
    });

    it('should return the database path', () => {
      const path = engine.getDatabasePath();
      expect(path).toBe(testDbPath);
    });
  });

  // ─── Session Management ───────────────────────────────────

  describe('Session Management', () => {
    it('should create a session successfully', async () => {
      const session = await bench('createSession', 50, async () =>
        engine.createSession({
          projectId: 'test-project',
          endedAt: null,
          metadata: { agent: 'test-agent' },
        })
      );

      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(session.uuid).toBeDefined();
      expect(session.projectId).toBe('test-project');
      expect(session.metadata).toEqual({ agent: 'test-agent' });
    });

    it('#142 — UUID is valid v4 format', async () => {
      const session = await engine.createSession({
        projectId: 'test-project',
        endedAt: null,
        metadata: {},
      });

      // UUID v4 format: 8-4-4-4-12 hex chars
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
      expect(session.uuid).toMatch(uuidRegex);
    });

    it('should get a session by id', async () => {
      const created = await engine.createSession({
        projectId: 'test-project',
        endedAt: null,
        metadata: {},
      });

      const retrieved = await engine.getSession(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.uuid).toBe(created.uuid);
    });

    it('should end a session', async () => {
      const session = await engine.createSession({
        projectId: 'test-project',
        endedAt: null,
        metadata: {},
      });

      expect(session.endedAt).toBeNull();

      await new Promise((resolve) => setTimeout(resolve, 10));

      const ended = await engine.endSession(session.id);

      expect(ended.endedAt).not.toBeNull();
      expect(ended.endedAt?.getTime()).toBeGreaterThan(session.startedAt.getTime());
    });

    it('#146 — should throw on endSession for non-existent session', async () => {
      await expect(engine.endSession(99999)).rejects.toThrow('not found');
    });

    it('should return null for non-existent session', async () => {
      const session = await engine.getSession(99999);
      expect(session).toBeNull();
    });
  });

  // ─── Observation Management ───────────────────────────────

  describe('Observation Management', () => {
    let session: Session;

    beforeEach(async () => {
      session = await engine.createSession({
        projectId: 'test-project',
        endedAt: null,
        metadata: {},
      });
    });

    it('should create an observation successfully', async () => {
      const observation = await bench('createObservation', 50, async () =>
        engine.createObservation({
          sessionId: session.id,
          title: 'Test Decision',
          content: 'This is a test decision',
          type: 'decision',
          topicKey: 'test-topic',
          projectId: 'test-project',
          metadata: { source: 'test' },
        })
      );

      expect(observation).toBeDefined();
      expect(observation.id).toBeDefined();
      expect(observation.title).toBe('Test Decision');
      expect(observation.type).toBe('decision');
      expect(observation.sessionId).toBe(session.id);
    });

    it('#9 — UUID is valid v4 format', async () => {
      const obs = await engine.createObservation({
        sessionId: session.id,
        title: 'UUID Test',
        content: 'Content',
        type: 'note',
        topicKey: null,
        projectId: 'test-project',
        metadata: {},
      });

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
      expect(obs.uuid).toMatch(uuidRegex);
    });

    it('#10 — deletedAt is null on creation', async () => {
      const obs = await engine.createObservation({
        sessionId: session.id,
        title: 'Fresh Obs',
        content: 'No delete',
        type: 'note',
        topicKey: null,
        projectId: 'test-project',
        metadata: {},
      });

      expect(obs.deletedAt).toBeNull();
    });

    it('#12 — topicKey empty string handled', async () => {
      const obs = await engine.createObservation({
        sessionId: session.id,
        title: 'Empty Topic',
        content: 'Content',
        type: 'note',
        topicKey: '',
        projectId: 'test-project',
        metadata: {},
      });

      // Code converts empty string via `topicKey || ''`
      expect(obs.topicKey).toBeDefined();
    });

    it('should get an observation by id', async () => {
      const created = await engine.createObservation({
        sessionId: session.id,
        title: 'Get Test',
        content: 'Get this observation',
        type: 'note',
        topicKey: 'get-topic',
        projectId: 'test-project',
        metadata: {},
      });

      const retrieved = await engine.getObservation(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.title).toBe('Get Test');
    });

    it('#17 — getObservation maps all fields correctly', async () => {
      const created = await engine.createObservation({
        sessionId: session.id,
        title: 'Full Field Test',
        content: 'Full content',
        type: 'bug',
        topicKey: 'field-test',
        projectId: 'test-project',
        metadata: { key: 'value' },
      });

      const retrieved = await engine.getObservation(created.id);
      expect(retrieved).toBeDefined();

      const r = retrieved!;
      expect(r.id).toBe(created.id);
      expect(r.uuid).toBe(created.uuid);
      expect(r.sessionId).toBe(session.id);
      expect(r.title).toBe('Full Field Test');
      expect(r.content).toBe('Full content');
      expect(r.type).toBe('bug');
      expect(r.topicKey).toBe('field-test');
      expect(r.projectId).toBe('test-project');
      expect(r.createdAt).toBeInstanceOf(Date);
      expect(r.deletedAt).toBeNull();
      expect(r.metadata).toEqual({ key: 'value' });
    });

    it('#22 — dates are valid Date instances', async () => {
      const obs = await engine.createObservation({
        sessionId: session.id,
        title: 'Date Test',
        content: 'Content',
        type: 'note',
        topicKey: null,
        projectId: 'test-project',
        metadata: {},
      });

      expect(obs.createdAt).toBeInstanceOf(Date);
      expect(obs.deletedAt).toBeNull();
      expect(obs.createdAt.getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('should update an observation title', async () => {
      const created = await engine.createObservation({
        sessionId: session.id,
        title: 'Original Title',
        content: 'Original content',
        type: 'decision',
        topicKey: 'update-topic',
        projectId: 'test-project',
        metadata: {},
      });

      const updated = await engine.updateObservation(created.id, {
        title: 'Updated Title',
      });

      expect(updated.title).toBe('Updated Title');
      expect(updated.content).toBe('Original content');
      expect(updated.type).toBe('decision');
    });

    it('#25 — should update observation type', async () => {
      const created = await engine.createObservation({
        sessionId: session.id,
        title: 'Type Update',
        content: 'Content',
        type: 'note',
        topicKey: null,
        projectId: 'test-project',
        metadata: {},
      });

      const updated = await engine.updateObservation(created.id, { type: 'bug' });
      expect(updated.type).toBe('bug');
    });

    it('#26 — should update observation topicKey', async () => {
      const created = await engine.createObservation({
        sessionId: session.id,
        title: 'Topic Update',
        content: 'Content',
        type: 'note',
        topicKey: 'old-topic',
        projectId: 'test-project',
        metadata: {},
      });

      const updated = await engine.updateObservation(created.id, { topicKey: 'new-topic' });
      expect(updated.topicKey).toBe('new-topic');
    });

    it('#28 — update with no fields returns unchanged', async () => {
      const created = await engine.createObservation({
        sessionId: session.id,
        title: 'No Change',
        content: 'Same',
        type: 'note',
        topicKey: null,
        projectId: 'test-project',
        metadata: {},
      });

      const updated = await engine.updateObservation(created.id, {});
      expect(updated.title).toBe('No Change');
      expect(updated.content).toBe('Same');
    });

    it('#29 — update non-existent throws', async () => {
      await expect(
        engine.updateObservation(99999, { title: 'Nope' })
      ).rejects.toThrow('not found');
    });

    it('#32 — FTS5 trigger updates index on edit', async () => {
      const obs = await engine.createObservation({
        sessionId: session.id,
        title: 'Before Edit FTS',
        content: 'Original searchable content',
        type: 'note',
        topicKey: null,
        projectId: 'test-project',
        metadata: {},
      });

      const before = await engine.search({ query: 'Before Edit FTS' });
      expect(before.total).toBeGreaterThanOrEqual(1);

      await engine.updateObservation(obs.id, {
        title: 'After Edit FTS UniqueMarker',
        content: 'Updated searchable content with UniqueMarker',
      });

      const afterNew = await engine.search({ query: 'UniqueMarker' });
      expect(afterNew.total).toBeGreaterThanOrEqual(1);
    });

    it('should delete an observation', async () => {
      const created = await engine.createObservation({
        sessionId: session.id,
        title: 'To Delete',
        content: 'This will be deleted',
        type: 'note',
        topicKey: 'delete-topic',
        projectId: 'test-project',
        metadata: {},
      });

      await engine.deleteObservation(created.id);

      const retrieved = await engine.getObservation(created.id);
      expect(retrieved).toBeNull();
    });

    it('should return null for non-existent observation', async () => {
      const observation = await engine.getObservation(99999);
      expect(observation).toBeNull();
    });

    it('should handle all observation types', async () => {
      const types: Array<Observation['type']> = ['decision', 'bug', 'discovery', 'note'];

      for (const type of types) {
        const observation = await engine.createObservation({
          sessionId: session.id,
          title: `${type} Observation`,
          content: `Content for ${type}`,
          type,
          topicKey: `${type}-topic`,
          projectId: 'test-project',
          metadata: {},
        });

        expect(observation.type).toBe(type);
      }
    });

    it('should handle null topic key', async () => {
      const observation = await engine.createObservation({
        sessionId: session.id,
        title: 'No Topic',
        content: 'This has no topic',
        type: 'note',
        topicKey: null,
        projectId: 'test-project',
        metadata: {},
      });

      expect(observation.topicKey).toBeNull();
    });

    it('#13 — FTS5 trigger inserts into index on create', async () => {
      await engine.createObservation({
        sessionId: session.id,
        title: 'FTS5InsertTriggerMarker',
        content: 'This tests that FTS5 index is populated on insert',
        type: 'note',
        topicKey: null,
        projectId: 'test-project',
        metadata: {},
      });

      const result = await engine.search({ query: 'FTS5InsertTriggerMarker' });
      expect(result.total).toBeGreaterThanOrEqual(1);
    });
  });

  // ─── Batch Operations ─────────────────────────────────────

  describe('Batch Operations', () => {
    let session: Session;

    beforeEach(async () => {
      session = await engine.createSession({
        projectId: 'batch-project',
        endedAt: null,
        metadata: {},
      });
    });

    it('#7 — batch create 100 observations (< 3000ms)', async () => {
      const batchStart = performance.now();
      for (let i = 0; i < 100; i++) {
        await engine.createObservation({
          sessionId: session.id,
          title: `Batch-${i}`,
          content: `Content ${i}`,
          type: 'note',
          topicKey: null,
          projectId: 'batch-project',
          metadata: {},
        });
      }
      const batchMs = performance.now() - batchStart;

      expectUnder(batchMs, 3000, '#7 batch create 100');
      expectUnder(batchMs / 100, 30, '#7 avg per create');
    });

    it('#33 — batch update 100 observations (< 5000ms)', async () => {
      const observations = await seedMultipleObservations(engine, session.id, 100, {
        projectId: 'batch-project',
      });

      const batchStart = performance.now();
      for (const obs of observations) {
        await engine.updateObservation(obs.id, { title: `Updated-${obs.id}` });
      }
      const batchMs = performance.now() - batchStart;

      expectUnder(batchMs, 5000, '#33 batch update 100');
      expectUnder(batchMs / 100, 50, '#33 avg per update');
    });
  });

  // ─── Prompt Management ────────────────────────────────────

  describe('Prompt Management', () => {
    let session: Session;

    beforeEach(async () => {
      session = await engine.createSession({
        projectId: 'test-project',
        endedAt: null,
        metadata: {},
      });
    });

    it('should save a prompt successfully', async () => {
      const prompt = await bench('savePrompt', 50, async () =>
        engine.savePrompt({
          sessionId: session.id,
          content: 'This is a test prompt',
          projectId: 'test-project',
          metadata: { length: 21 },
        })
      );

      expect(prompt).toBeDefined();
      expect(prompt.id).toBeDefined();
      expect(prompt.content).toBe('This is a test prompt');
      expect(prompt.sessionId).toBe(session.id);
      expect(prompt.metadata).toEqual({ length: 21 });
    });

    it('#150 — prompt has valid UUID', async () => {
      const prompt = await engine.savePrompt({
        sessionId: session.id,
        content: 'UUID test prompt',
        projectId: 'test-project',
        metadata: {},
      });

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
      expect(prompt.uuid).toMatch(uuidRegex);
    });
  });

  // ─── Search Functionality ─────────────────────────────────

  describe('Search Functionality', () => {
    let session: Session;

    beforeEach(async () => {
      session = await engine.createSession({
        projectId: 'search-project',
        endedAt: null,
        metadata: {},
      });

      await engine.createObservation({
        sessionId: session.id,
        title: 'Authentication Fix',
        content: 'Fixed the JWT authentication bug',
        type: 'bug',
        topicKey: 'auth',
        projectId: 'search-project',
        metadata: {},
      });

      await engine.createObservation({
        sessionId: session.id,
        title: 'Performance Decision',
        content: 'Decided to use Redis for caching',
        type: 'decision',
        topicKey: 'performance',
        projectId: 'search-project',
        metadata: {},
      });

      await engine.createObservation({
        sessionId: session.id,
        title: 'Database Discovery',
        content: 'Found a better way to query the database',
        type: 'discovery',
        topicKey: 'database',
        projectId: 'search-project',
        metadata: {},
      });
    });

    it('should search all observations', async () => {
      const result = await engine.search({});
      expect(result.observations.length).toBeGreaterThanOrEqual(3);
      expect(result.total).toBeGreaterThanOrEqual(3);
    });

    it('should search by type', async () => {
      const result = await engine.search({ type: 'bug' });
      expect(result.observations).toHaveLength(1);
      expect(result.observations[0].type).toBe('bug');
    });

    it('should search by project id', async () => {
      const result = await engine.search({ projectId: 'search-project' });
      expect(result.observations.length).toBeGreaterThanOrEqual(3);
    });

    it('should search by topic key', async () => {
      const result = await engine.search({ topicKey: 'auth' });
      expect(result.observations).toHaveLength(1);
      expect(result.observations[0].topicKey).toBe('auth');
    });

    it('should limit results', async () => {
      const result = await engine.search({ limit: 2 });
      expect(result.observations.length).toBeLessThanOrEqual(2);
    });

    it('should offset results', async () => {
      const firstPage = await engine.search({ limit: 2, offset: 0 });
      const secondPage = await engine.search({ limit: 2, offset: 2 });
      expect(firstPage.observations.length).toBe(2);
      if (secondPage.observations.length > 0) {
        const firstIds = firstPage.observations.map((o) => o.id);
        const secondIds = secondPage.observations.map((o) => o.id);
        expect(firstIds).not.toEqual(secondIds);
      }
    });

    it('should return correct total count', async () => {
      const result = await engine.search({ projectId: 'search-project' });
      expect(result.total).toBe(result.observations.length);
    });

    it('should handle empty search results', async () => {
      const result = await engine.search({ projectId: 'non-existent-project' });
      expect(result.observations).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('#58 — FTS5 stemming (porter tokenizer)', async () => {
      await engine.createObservation({
        sessionId: session.id,
        title: 'Running Tests',
        content: 'Running the test suite for performance',
        type: 'note',
        topicKey: null,
        projectId: 'search-project',
        metadata: {},
      });

      // "running" should match via porter stemming
      const result = await engine.search({ query: 'run', projectId: 'search-project' });
      const found = result.observations.find((o) => o.title === 'Running Tests');
      expect(found).toBeDefined();
    });

    it('#65 — includeDeleted includes soft-deleted', async () => {
      const obs = await engine.createObservation({
        sessionId: session.id,
        title: 'DeleteSearchTest',
        content: 'Will be deleted and searched',
        type: 'note',
        topicKey: null,
        projectId: 'search-project',
        metadata: {},
      });
      await engine.deleteObservation(obs.id);

      const withoutDeleted = await engine.search({
        projectId: 'search-project',
        includeDeleted: false,
      });
      expect(withoutDeleted.observations.find((o) => o.id === obs.id)).toBeUndefined();

      const withDeleted = await engine.search({
        projectId: 'search-project',
        includeDeleted: true,
      });
      expect(withDeleted.observations.find((o) => o.id === obs.id)).toBeDefined();
    });

    it('#69 — combined filters (type + projectId + topicKey)', async () => {
      const result = await engine.search({
        type: 'bug',
        projectId: 'search-project',
        topicKey: 'auth',
      });
      expect(result.observations).toHaveLength(1);
      expect(result.observations[0].title).toContain('Authentication');
    });

    it('#70 — FTS5 query + filters combined', async () => {
      const result = await engine.search({
        query: 'JWT',
        type: 'bug',
        projectId: 'search-project',
      });
      expect(result.observations).toHaveLength(1);
      expect(result.observations[0].title).toContain('Authentication');
    });
  });

  // ─── Metadata Handling ────────────────────────────────────

  describe('Metadata Handling', () => {
    let session: Session;

    beforeEach(async () => {
      session = await engine.createSession({
        projectId: 'metadata-project',
        endedAt: null,
        metadata: {},
      });
    });

    it('should serialize and deserialize complex metadata', async () => {
      const complexMetadata = {
        nested: { array: [1, 2, 3], object: { key: 'value' } },
        string: 'test',
        number: 42,
        boolean: true,
        nullValue: null,
      };

      const observation = await engine.createObservation({
        sessionId: session.id,
        title: 'Complex Metadata',
        content: 'Testing metadata serialization',
        type: 'note',
        topicKey: 'metadata',
        projectId: 'metadata-project',
        metadata: complexMetadata,
      });

      expect(observation.metadata).toEqual(complexMetadata);
    });

    it('should handle empty metadata', async () => {
      const observation = await engine.createObservation({
        sessionId: session.id,
        title: 'Empty Metadata',
        content: 'No metadata here',
        type: 'note',
        topicKey: 'empty',
        projectId: 'metadata-project',
        metadata: {},
      });

      expect(observation.metadata).toEqual({});
    });

    it('should update metadata', async () => {
      const created = await engine.createObservation({
        sessionId: session.id,
        title: 'Update Metadata Test',
        content: 'Will update metadata',
        type: 'note',
        topicKey: 'update',
        projectId: 'metadata-project',
        metadata: { version: 1 },
      });

      const updated = await engine.updateObservation(created.id, {
        metadata: { version: 2, changed: true },
      });

      expect(updated.metadata).toEqual({ version: 2, changed: true });
    });
  });

  // ─── Cross-Session Persistence ────────────────────────────

  describe('Cross-Session Persistence', () => {
    it('should persist observations across sessions', async () => {
      const session1 = await engine.createSession({
        projectId: 'persist-test',
        endedAt: null,
        metadata: {},
      });

      const obs = await engine.createObservation({
        sessionId: session1.id,
        title: 'Persistent Note',
        content: 'This should persist',
        type: 'note',
        topicKey: 'test',
        projectId: 'persist-test',
        metadata: {},
      });

      await engine.endSession(session1.id);

      const session2 = await engine.createSession({
        projectId: 'persist-test',
        endedAt: null,
        metadata: {},
      });

      const searchResult = await engine.search({ projectId: 'persist-test' });
      expect(searchResult.total).toBe(1);
      expect(searchResult.observations[0].id).toBe(obs.id);
    });

    it('#153 — sessions persist across DB close/reopen', async () => {
      const session = await engine.createSession({
        projectId: 'persist-session-test',
        endedAt: null,
        metadata: { test: true },
      });

      engine.close();

      // Reopen same DB
      const engine2 = new MemoryEngine(testDbPath);
      const retrieved = await engine2.getSession(session.id);

      expect(retrieved).toBeDefined();
      expect(retrieved!.projectId).toBe('persist-session-test');
      expect(retrieved!.metadata).toEqual({ test: true });

      engine2.close();
    });

    it('#154 — FTS5 index persists across DB close/reopen', async () => {
      const session = await engine.createSession({
        projectId: 'persist-fts-test',
        endedAt: null,
        metadata: {},
      });

      await engine.createObservation({
        sessionId: session.id,
        title: 'PersistentSearchTarget',
        content: 'This content should remain searchable after reopen',
        type: 'note',
        topicKey: null,
        projectId: 'persist-fts-test',
        metadata: {},
      });

      engine.close();

      const engine2 = new MemoryEngine(testDbPath);
      const result = await engine2.search({ query: 'PersistentSearchTarget' });

      expect(result.total).toBeGreaterThanOrEqual(1);

      engine2.close();
    });
  });

  describe('Export Functionality', () => {
    let session: Session;

    beforeEach(async () => {
      session = await engine.createSession({
        projectId: 'export-project',
        endedAt: null,
        metadata: {},
      });

      await engine.createObservation({
        sessionId: session.id,
        title: 'Export Decision',
        content: 'Decision content for export',
        type: 'decision',
        topicKey: 'export',
        projectId: 'export-project',
        metadata: { source: 'test' },
      });

      await engine.createObservation({
        sessionId: session.id,
        title: 'Export Bug',
        content: 'Bug content for export',
        type: 'bug',
        topicKey: null,
        projectId: 'export-project',
        metadata: {},
      });
    });

    it('should export all observations as JSON', async () => {
      const data = await engine.exportToJson();

      expect(data.version).toBe('1.0');
      expect(data.exportedAt).toBeDefined();
      expect(data.observations).toBeInstanceOf(Array);
      expect(data.observations.length).toBeGreaterThanOrEqual(2);
    });

    it('should export observations filtered by project', async () => {
      const data = await engine.exportToJson({ projectId: 'export-project' });

      expect(data.observations).toHaveLength(2);
      expect(data.project).toBe('export-project');
      data.observations.forEach((obs) => {
        expect(obs.projectId).toBe('export-project');
      });
    });

    it('should export observations with correct schema', async () => {
      const data = await engine.exportToJson({ projectId: 'export-project' });
      const obs = data.observations[0];

      expect(obs.uuid).toBeDefined();
      expect(obs.title).toBeDefined();
      expect(obs.content).toBeDefined();
      expect(obs.type).toBeDefined();
      expect(obs.projectId).toBeDefined();
      expect(obs.createdAt).toBeDefined();
      expect(typeof obs.createdAt).toBe('string');
    });

    it('should include sessions when requested', async () => {
      const data = await engine.exportToJson({
        projectId: 'export-project',
        includeSessions: true,
      });

      expect(data.sessions).toBeDefined();
      expect(data.sessions!.length).toBeGreaterThanOrEqual(1);
      expect(data.sessions![0].uuid).toBeDefined();
      expect(data.sessions![0].projectId).toBe('export-project');
    });

    it('should not include sessions by default', async () => {
      const data = await engine.exportToJson({ projectId: 'export-project' });

      expect(data.sessions).toBeUndefined();
    });

    it('should export empty project', async () => {
      const data = await engine.exportToJson({ projectId: 'non-existent' });

      expect(data.observations).toHaveLength(0);
    });
  });

  describe('Import Functionality', () => {
    let session: Session;

    beforeEach(async () => {
      session = await engine.createSession({
        projectId: 'import-project',
        endedAt: null,
        metadata: {},
      });
    });

    it('should import valid observations from JSON', async () => {
      const data = {
        version: '1.0',
        project: 'import-project',
        observations: [
          { title: 'Imported Decision', content: 'Content 1', type: 'decision' },
          { title: 'Imported Bug', content: 'Content 2', type: 'bug' },
          { title: 'Imported Note', content: 'Content 3', type: 'note' },
        ],
      };

      const result = await engine.importFromJson(data);

      expect(result.imported).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.observations).toHaveLength(3);
      expect(result.observations[0].title).toBe('Imported Decision');
    });

    it('should reject invalid import data (missing version)', async () => {
      const data = { observations: [] };

      expect(engine.importFromJson(data as any)).rejects.toThrow('Invalid import data');
    });

    it('should reject invalid import data (missing observations)', async () => {
      const data = { version: '1.0' };

      expect(engine.importFromJson(data as any)).rejects.toThrow('Invalid import data');
    });

    it('should import 0 records gracefully', async () => {
      const data = { version: '1.0', observations: [] };

      const result = await engine.importFromJson(data);

      expect(result.imported).toBe(0);
      expect(result.observations).toHaveLength(0);
    });

    it('should skip observations with missing required fields', async () => {
      const data = {
        version: '1.0',
        observations: [
          { title: 'Valid', content: 'Content', type: 'note' },
          { title: '', content: 'Missing title', type: 'note' },
          { title: 'Missing content', content: '', type: 'note' },
          { title: 'Missing type', content: 'Content', type: '' },
        ],
      };

      const result = await engine.importFromJson(data, { conflictStrategy: 'skip', dryRun: false });

      expect(result.imported).toBe(1);
      expect(result.failed).toBe(3);
    });

    it('should reject invalid types', async () => {
      const data = {
        version: '1.0',
        observations: [
          { title: 'Valid', content: 'Content', type: 'note' },
          { title: 'Bad Type', content: 'Content', type: 'invalid-type' },
        ],
      };

      const result = await engine.importFromJson(data, { conflictStrategy: 'skip', dryRun: false });

      expect(result.imported).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors[0]).toContain('Invalid type');
    });

    it('should use dryRun mode without writing to database', async () => {
      const data = {
        version: '1.0',
        observations: [
          { title: 'Dry Run', content: 'Content', type: 'note' },
        ],
      };

      const result = await engine.importFromJson(data, { conflictStrategy: 'skip', dryRun: true });

      expect(result.imported).toBe(1);
      expect(result.observations).toHaveLength(0); // dryRun doesn't return observations

      // Verify nothing was actually written
      const search = await engine.search({ projectId: 'import-project' });
      // Only the dry run would have imported — check it's not there
      const dryRunObs = search.observations.find((o) => o.title === 'Dry Run');
      expect(dryRunObs).toBeUndefined();
    });

    it('should override project with options.projectId', async () => {
      const data = {
        version: '1.0',
        project: 'original-project',
        observations: [
          { title: 'Override Project', content: 'Content', type: 'note' },
        ],
      };

      const result = await engine.importFromJson(data, {
        projectId: 'override-project',
        conflictStrategy: 'skip',
        dryRun: false,
      });

      expect(result.imported).toBe(1);
      expect(result.observations[0].projectId).toBe('override-project');
    });

    describe('Conflict Strategies', () => {
      it('should skip duplicates by uuid (skip strategy)', async () => {
        // Create existing observation
        const existing = await engine.createObservation({
          sessionId: session.id,
          title: 'Existing',
          content: 'Original content',
          type: 'note',
          topicKey: null,
          projectId: 'import-project',
          metadata: {},
        });

        const data = {
          version: '1.0',
          observations: [
            { uuid: existing.uuid, title: 'Updated', content: 'New content', type: 'note' },
            { title: 'New Obs', content: 'Fresh content', type: 'decision' },
          ],
        };

        const result = await engine.importFromJson(data, { conflictStrategy: 'skip', dryRun: false });

        expect(result.imported).toBe(1);
        expect(result.skipped).toBe(1);

        // Verify existing was NOT overwritten
        const check = await engine.getObservation(existing.id);
        expect(check?.title).toBe('Existing');
      });

      it('should overwrite duplicates by uuid (overwrite strategy)', async () => {
        const existing = await engine.createObservation({
          sessionId: session.id,
          title: 'Existing',
          content: 'Original content',
          type: 'note',
          topicKey: null,
          projectId: 'import-project',
          metadata: {},
        });

        const data = {
          version: '1.0',
          observations: [
            { uuid: existing.uuid, title: 'Updated', content: 'New content', type: 'note' },
            { title: 'New Obs', content: 'Fresh content', type: 'decision' },
          ],
        };

        const result = await engine.importFromJson(data, { conflictStrategy: 'overwrite', dryRun: false });

        expect(result.imported).toBe(1);
        expect(result.overwritten).toBe(1);

        // Verify existing WAS overwritten
        const check = await engine.getObservation(existing.id);
        expect(check?.title).toBe('Updated');
        expect(check?.content).toBe('New content');
      });

      it('should abort on duplicate with fail strategy', async () => {
        const existing = await engine.createObservation({
          sessionId: session.id,
          title: 'Existing',
          content: 'Original content',
          type: 'note',
          topicKey: null,
          projectId: 'import-project',
          metadata: {},
        });

        const data = {
          version: '1.0',
          observations: [
            { title: 'New Obs', content: 'Fresh content', type: 'decision' },
            { uuid: existing.uuid, title: 'Duplicate', content: 'Dup content', type: 'note' },
          ],
        };

        const result = await engine.importFromJson(data, { conflictStrategy: 'fail', dryRun: false });

        expect(result.failed).toBe(1);
        expect(result.errors[0]).toContain('Duplicate uuid');
        // The first observation should have been rolled back
        const search = await engine.search({ projectId: 'import-project' });
        expect(search.observations.length).toBe(1); // Only the original
      });
    });
  });

  describe('Reset Functionality', () => {
    it('should perform full reset', async () => {
      // Create data
      const session = await engine.createSession({
        projectId: 'reset-test',
        endedAt: null,
        metadata: {},
      });

      await engine.createObservation({
        sessionId: session.id,
        title: 'Will be deleted',
        content: 'Content',
        type: 'note',
        topicKey: null,
        projectId: 'reset-test',
        metadata: {},
      });

      // Verify data exists
      const before = await engine.search({});
      expect(before.total).toBeGreaterThanOrEqual(1);

      // Full reset
      const result = await engine.resetFull();

      expect(result.deleted).toBeGreaterThanOrEqual(1);

      // Verify data is gone
      const after = await engine.search({});
      expect(after.total).toBe(0);

      // Verify DB is still healthy (tables recreated)
      expect(engine.isHealthy()).toBe(true);
    });

    it('should recreate schema after full reset', async () => {
      await engine.resetFull();

      // Should be able to create new observations
      const session = await engine.createSession({
        projectId: 'post-reset',
        endedAt: null,
        metadata: {},
      });

      const obs = await engine.createObservation({
        sessionId: session.id,
        title: 'After Reset',
        content: 'New content',
        type: 'decision',
        topicKey: 'fresh',
        projectId: 'post-reset',
        metadata: {},
      });

      expect(obs.id).toBeDefined();
      expect(obs.title).toBe('After Reset');
    });

    it('should perform project reset', async () => {
      // Create data for two projects
      const session1 = await engine.createSession({
        projectId: 'project-a',
        endedAt: null,
        metadata: {},
      });
      const session2 = await engine.createSession({
        projectId: 'project-b',
        endedAt: null,
        metadata: {},
      });

      await engine.createObservation({
        sessionId: session1.id,
        title: 'Project A Obs',
        content: 'Content A',
        type: 'note',
        topicKey: null,
        projectId: 'project-a',
        metadata: {},
      });
      await engine.createObservation({
        sessionId: session2.id,
        title: 'Project B Obs',
        content: 'Content B',
        type: 'note',
        topicKey: null,
        projectId: 'project-b',
        metadata: {},
      });

      // Reset project-a only
      const result = await engine.resetProject('project-a');

      expect(result.deleted).toBe(1);

      // Project A should be empty
      const searchA = await engine.search({ projectId: 'project-a' });
      expect(searchA.total).toBe(0);

      // Project B should be untouched
      const searchB = await engine.search({ projectId: 'project-b' });
      expect(searchB.total).toBe(1);
      expect(searchB.observations[0].title).toBe('Project B Obs');
    });

    it('should clean up orphan sessions on project reset', async () => {
      const session = await engine.createSession({
        projectId: 'orphan-test',
        endedAt: null,
        metadata: {},
      });

      await engine.createObservation({
        sessionId: session.id,
        title: 'Will be deleted',
        content: 'Content',
        type: 'note',
        topicKey: null,
        projectId: 'orphan-test',
        metadata: {},
      });

      const result = await engine.resetProject('orphan-test');

      expect(result.deleted).toBe(1);
      expect(result.orphanSessions).toBeGreaterThanOrEqual(1);

      // Session should be gone (was orphan)
      const checkSession = await engine.getSession(session.id);
      expect(checkSession).toBeNull();
    });

    it('should count records by project', async () => {
      const session = await engine.createSession({
        projectId: 'count-test',
        endedAt: null,
        metadata: {},
      });

      await engine.createObservation({
        sessionId: session.id,
        title: 'Obs 1',
        content: 'Content 1',
        type: 'note',
        topicKey: null,
        projectId: 'count-test',
        metadata: {},
      });
      await engine.createObservation({
        sessionId: session.id,
        title: 'Obs 2',
        content: 'Content 2',
        type: 'bug',
        topicKey: null,
        projectId: 'count-test',
        metadata: {},
      });

      const counts = await engine.countByProject('count-test');

      expect(counts.observations).toBe(2);
      expect(counts.sessions).toBe(1);
    });

    it('should return zero counts for non-existent project', async () => {
      const counts = await engine.countByProject('non-existent');

      expect(counts.observations).toBe(0);
      expect(counts.prompts).toBe(0);
      expect(counts.sessions).toBe(0);
    });
  });
});
