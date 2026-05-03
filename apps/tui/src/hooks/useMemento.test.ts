import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { createMementoConnection } from './useMemento';
import { mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';

describe('createMementoConnection', () => {
  const testDir = join(process.cwd(), 'test-data');
  let testDbPath: string;

  // Suppress console.error from MemoryEngine init messages
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
    testDbPath = join(
      testDir,
      `hook-test-${Date.now()}-${Math.random().toString(36).slice(7)}.db`
    );
  });

  it('should initialize MemoryEngine with provided path', () => {
    const memento = createMementoConnection({ dbPath: testDbPath });

    expect(memento.engine).toBeDefined();
    expect(memento.engine.getDatabasePath()).toBe(testDbPath);
    expect(memento.isReady).toBe(true);

    memento.close();
  });

  it('should initialize with default path', () => {
    const memento = createMementoConnection();

    expect(memento.engine).toBeDefined();
    expect(memento.isReady).toBe(true);

    memento.close();
  });

  it('should report unhealthy when DB path is invalid', () => {
    const memento = createMementoConnection({ dbPath: '/proc/nonexistent/path/db.db' });

    expect(memento.isReady).toBe(false);

    memento.close();
  });

  it('should expose engine methods', () => {
    const memento = createMementoConnection({ dbPath: testDbPath });

    expect(typeof memento.engine.search).toBe('function');
    expect(typeof memento.engine.getDashboardStats).toBe('function');
    expect(typeof memento.engine.listSessions).toBe('function');
    expect(typeof memento.engine.listProjects).toBe('function');
    expect(typeof memento.engine.getObservation).toBe('function');

    memento.close();
  });

  it('should close engine cleanly', () => {
    const memento = createMementoConnection({ dbPath: testDbPath });

    expect(() => memento.close()).not.toThrow();
  });
});
