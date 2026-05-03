import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'bun:test';
import { createSessionsService } from './useSessions';
import { MemoryEngine } from '@slorenzot/memento-core';
import { mkdirSync, existsSync } from 'fs';
import { join } from 'path';

describe('SessionsService', () => {
  const testDir = join(process.cwd(), 'test-data');
  let engine: MemoryEngine;

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

  beforeEach(() => {
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
    const dbPath = join(
      testDir,
      `sessions-test-${Date.now()}-${Math.random().toString(36).slice(7)}.db`
    );
    engine = new MemoryEngine(dbPath);
  });

  afterEach(() => {
    engine.close();
  });

  it('should list sessions', async () => {
    const service = createSessionsService(engine);
    await engine.createSession({ projectId: 'test', endedAt: null, metadata: {} });

    const result = await service.listSessions({});

    expect(result.sessions.length).toBeGreaterThan(0);
    expect(result.total).toBeGreaterThan(0);
  });

  it('should filter sessions by project', async () => {
    const service = createSessionsService(engine);
    await engine.createSession({ projectId: 'project-a', endedAt: null, metadata: {} });
    await engine.createSession({ projectId: 'project-b', endedAt: null, metadata: {} });

    const result = await service.listSessions({ projectId: 'project-a' });

    expect(result.total).toBe(1);
    expect(result.sessions[0].projectId).toBe('project-a');
  });

  it('should list only active sessions', async () => {
    const service = createSessionsService(engine);
    await engine.createSession({ projectId: 'test', endedAt: null, metadata: {} });
    const ended = await engine.createSession({ projectId: 'test', endedAt: null, metadata: {} });
    await engine.endSession(ended.id);

    const result = await service.listSessions({ activeOnly: true });

    expect(result.total).toBe(1);
    expect(result.sessions[0].endedAt).toBeNull();
  });

  it('should get observations for a session', async () => {
    const service = createSessionsService(engine);
    const session = await engine.createSession({ projectId: 'test', endedAt: null, metadata: {} });
    await engine.createObservation({
      sessionId: session.id,
      title: 'Test obs 1',
      content: 'Content',
      type: 'note',
      topicKey: null,
      projectId: 'test',
      metadata: {},
    });
    await engine.createObservation({
      sessionId: session.id,
      title: 'Test obs 2',
      content: 'Content',
      type: 'bug',
      topicKey: null,
      projectId: 'test',
      metadata: {},
    });

    const observations = await service.getSessionObservations(session.id);

    expect(observations).toHaveLength(2);
    expect(observations[0].sessionId).toBe(session.id);
  });

  it('should paginate sessions', async () => {
    const service = createSessionsService(engine);
    for (let i = 0; i < 5; i++) {
      await engine.createSession({ projectId: `p-${i}`, endedAt: null, metadata: {} });
    }

    const page1 = await service.listSessions({ limit: 2, offset: 0 });
    const page2 = await service.listSessions({ limit: 2, offset: 2 });

    expect(page1.sessions).toHaveLength(2);
    expect(page2.sessions).toHaveLength(2);
    expect(page1.total).toBe(5);
  });
});
