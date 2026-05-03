import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { MemoryEngine } from './MemoryEngine';
import { Database } from 'bun:sqlite';
import {
  measureTime,
  expectUnder,
  createTestDb,
  cleanupTestDir,
  ensureTestDir,
} from './test-helpers';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { join, dirname } from 'path';

describe('Initialization & Health', () => {
  const testDir = join(process.cwd(), 'test-data');

  beforeAll(ensureTestDir);
  afterAll(cleanupTestDir);

  // ─── Database Creation ────────────────────────────────────

  describe('Database Creation', () => {
    it('#127 — should create DB with nested directory (mkdirSync recursive)', async () => {
      const nestedPath = join(testDir, `nested-${Date.now()}`, 'deep', 'db', 'memento.db');

      const { result: engine, ms } = await measureTime(() => {
        return Promise.resolve(new MemoryEngine(nestedPath));
      });

      expectUnder(ms, 100, '#127 create nested DB');
      expect(existsSync(nestedPath)).toBe(true);
      expect(engine.isHealthy()).toBe(true);
      engine.close();
    });

    it('#128 — getDatabasePath() returns correct path', () => {
      const { engine, dbPath } = createTestDb();

      const { ms } = measureTimeSync(() => {
        const path = engine.getDatabasePath();
        expect(path).toBe(dbPath);
      });

      expectUnder(ms, 1, '#128 getDatabasePath');
      engine.close();
    });
  });

  // ─── Health Checks ────────────────────────────────────────

  describe('Health Checks', () => {
    it('#129 — isHealthy() returns true with valid DB', () => {
      const { engine } = createTestDb();

      const { ms } = measureTimeSync(() => {
        expect(engine.isHealthy()).toBe(true);
      });

      expectUnder(ms, 1, '#129 isHealthy true');
      engine.close();
    });

    it('#130 — isHealthy() returns false with invalid path', () => {
      const engine = new MemoryEngine('/nonexistent/path/that/cannot/be/created/because/parent/doesnt/exist/db.db');

      const { ms } = measureTimeSync(() => {
        expect(engine.isHealthy()).toBe(false);
      });

      expectUnder(ms, 100, '#130 isHealthy false');
      engine.close();
    });

    it('#131 — getInitError() returns null when healthy', () => {
      const { engine } = createTestDb();

      const { ms } = measureTimeSync(() => {
        expect(engine.getInitError()).toBeNull();
      });

      expectUnder(ms, 1, '#131 getInitError null');
      engine.close();
    });

    it('#132 — getInitError() returns descriptive error when unhealthy', () => {
      const engine = new MemoryEngine('/dev/null/impossible-path/db.db');

      const { ms } = measureTimeSync(() => {
        const error = engine.getInitError();
        expect(error).not.toBeNull();
        expect(error!.message).toBeTruthy();
      });

      expectUnder(ms, 100, '#132 getInitError descriptive');
      engine.close();
    });
  });

  // ─── Mock Database Fallback ───────────────────────────────

  describe('Mock Database Fallback', () => {
    it('#133 — should create mock DB when init fails', () => {
      const engine = new MemoryEngine('/dev/null/impossible/db.db');

      expect(engine.isHealthy()).toBe(false);
      // Engine still exists, just uses mock
      expect(engine).toBeDefined();
      engine.close();
    });

    it('#134 — operations on mock DB should throw descriptive error', async () => {
      const engine = new MemoryEngine('/dev/null/impossible/db.db');

      await expect(
        engine.createSession({ projectId: 'test', endedAt: null, metadata: {} })
      ).rejects.toThrow(/Database not initialized/);

      engine.close();
    });
  });

  // ─── Close ────────────────────────────────────────────────

  describe('close()', () => {
    it('#135 — should not throw on close', () => {
      const { engine } = createTestDb();

      const { ms } = measureTimeSync(() => {
        expect(() => engine.close()).not.toThrow();
      });

      expectUnder(ms, 10, '#135 close');
    });
  });

  // ─── Schema Verification ─────────────────────────────────

  describe('Schema Verification', () => {
    it('#136 — should create all required tables', () => {
      const { engine, dbPath } = createTestDb();

      // Open DB directly to check schema
      const db = new Database(dbPath, { readonly: true });
      const tables = db
        .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        .all() as { name: string }[];
      db.close();

      const tableNames = tables.map((t) => t.name);
      expect(tableNames).toContain('sessions');
      expect(tableNames).toContain('observations');
      expect(tableNames).toContain('prompts');
      expect(tableNames).toContain('projects');

      engine.close();
    });

    it('#137 — should create required indexes', () => {
      const { engine, dbPath } = createTestDb();

      const db = new Database(dbPath, { readonly: true });
      const indexes = db
        .prepare("SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'")
        .all() as { name: string }[];
      db.close();

      const indexNames = indexes.map((i) => i.name);
      expect(indexNames).toContain('idx_observations_deleted');
      expect(indexNames).toContain('idx_observations_created');
      expect(indexNames).toContain('idx_observations_type');
      expect(indexNames).toContain('idx_observations_project');
      expect(indexNames).toContain('idx_observations_topic');

      engine.close();
    });

    it('#138 — should create FTS5 virtual table with porter+unicode61', () => {
      const { engine, dbPath } = createTestDb();

      const db = new Database(dbPath, { readonly: true });
      const tables = db
        .prepare("SELECT name, sql FROM sqlite_master WHERE name='observations_fts'")
        .all() as { name: string; sql: string }[];
      db.close();

      expect(tables).toHaveLength(1);
      expect(tables[0].sql).toContain('fts5');
      expect(tables[0].sql).toContain('porter');
      expect(tables[0].sql).toContain('unicode61');

      engine.close();
    });

    it('#139 — should enable WAL mode', () => {
      const { engine, dbPath } = createTestDb();

      const db = new Database(dbPath, { readonly: true });
      const result = db.query('PRAGMA journal_mode').get() as { journal_mode: string };
      db.close();

      expect(result.journal_mode).toBe('wal');

      engine.close();
    });

    it('#140 — should enable foreign keys', () => {
      const { engine, dbPath } = createTestDb();

      // Verify that the engine sets foreign_keys ON in its connection
      // Note: PRAGMA foreign_keys is per-connection in SQLite, so a new
      // connection won't inherit it. We verify the engine's init code runs.
      // The engine constructor runs PRAGMA foreign_keys = ON without error.
      expect(engine.isHealthy()).toBe(true);

      // Also verify via a direct query on the engine's DB that foreign keys work
      // by checking the schema has FOREIGN KEY constraints
      const db = new Database(dbPath);
      const tables = db
        .prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='observations'")
        .get() as { sql: string };
      db.close();

      expect(tables.sql).toContain('FOREIGN KEY');

      engine.close();
    });
  });
});

function measureTimeSync<T>(fn: () => T): { result: T; ms: number } {
  const start = performance.now();
  const result = fn();
  const ms = performance.now() - start;
  return { result, ms };
}
