import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { MemoryEngine } from './MemoryEngine';
import type { Observation, Session, Prompt } from './types';

describe('MemoryEngine', () => {
  let engine: MemoryEngine;
  let testDbPath: string;

  beforeEach(() => {
    testDbPath = `/tmp/test-memento-${Date.now()}.db`;
    engine = new MemoryEngine(testDbPath);
  });

  afterEach(() => {
    engine.close();
  });

  describe('Session Management', () => {
    it('should create a session successfully', async () => {
      const session = await engine.createSession({
        projectId: 'test-project',
        endedAt: null,
        metadata: { agent: 'test-agent' },
      });

      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(session.uuid).toBeDefined();
      expect(session.projectId).toBe('test-project');
      expect(session.metadata).toEqual({ agent: 'test-agent' });
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

    it('should return null for non-existent session', async () => {
      const session = await engine.getSession(99999);
      expect(session).toBeNull();
    });
  });

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
      const observation = await engine.createObservation({
        sessionId: session.id,
        title: 'Test Decision',
        content: 'This is a test decision',
        type: 'decision',
        topicKey: 'test-topic',
        projectId: 'test-project',
        metadata: { source: 'test' },
      });

      expect(observation).toBeDefined();
      expect(observation.id).toBeDefined();
      expect(observation.title).toBe('Test Decision');
      expect(observation.type).toBe('decision');
      expect(observation.sessionId).toBe(session.id);
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

    it('should update an observation', async () => {
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
        content: 'Updated content',
      });

      expect(updated.title).toBe('Updated Title');
      expect(updated.content).toBe('Updated content');
      expect(updated.type).toBe('decision');
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
  });

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
      const prompt = await engine.savePrompt({
        sessionId: session.id,
        content: 'This is a test prompt',
        projectId: 'test-project',
        metadata: { length: 21 },
      });

      expect(prompt).toBeDefined();
      expect(prompt.id).toBeDefined();
      expect(prompt.content).toBe('This is a test prompt');
      expect(prompt.sessionId).toBe(session.id);
      expect(prompt.metadata).toEqual({ length: 21 });
    });
  });

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
      expect(result.observations[0].title).toContain('Authentication');
    });

    it('should search by project id', async () => {
      const result = await engine.search({ projectId: 'search-project' });

      expect(result.observations.length).toBeGreaterThanOrEqual(3);
      result.observations.forEach((obs) => {
        expect(obs.projectId).toBe('search-project');
      });
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
      const result = await engine.search({
        projectId: 'non-existent-project',
      });

      expect(result.observations).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

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
        nested: {
          array: [1, 2, 3],
          object: { key: 'value' },
        },
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
});
