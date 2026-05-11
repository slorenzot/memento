import { expect } from 'bun:test';
import { mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { MemoryEngine } from './MemoryEngine';
import type { Observation } from './types';

// ─── Timing Utilities ───────────────────────────────────────

export async function measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; ms: number }> {
  const start = performance.now();
  const result = await fn();
  const ms = performance.now() - start;
  return { result, ms };
}

export function expectUnder(ms: number, maxMs: number, label: string) {
  expect(ms).toBeLessThan(maxMs);
  if (ms > maxMs * 0.8) {
    console.warn(`⚠️  ${label}: ${ms.toFixed(1)}ms (near limit of ${maxMs}ms)`);
  }
}

export async function bench<T>(label: string, maxMs: number, fn: () => Promise<T>): Promise<T> {
  const { result, ms } = await measureTime(fn);
  expectUnder(ms, maxMs, label);
  return result;
}

// ─── Test Database Management ───────────────────────────────

const TEST_DIR = join(process.cwd(), 'test-data');

export function getTestDir(): string {
  return TEST_DIR;
}

export function ensureTestDir(): string {
  if (!existsSync(TEST_DIR)) {
    mkdirSync(TEST_DIR, { recursive: true });
  }
  return TEST_DIR;
}

export function cleanupTestDir(): void {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
}

export function createTestDb(): { engine: MemoryEngine; dbPath: string } {
  ensureTestDir();
  const dbPath = join(
    TEST_DIR,
    `test-${Date.now()}-${Math.random().toString(36).slice(7)}.db`
  );
  const engine = new MemoryEngine(dbPath);
  return { engine, dbPath };
}

// ─── Seed Helpers ───────────────────────────────────────────

let _lastSessionProjectId: string = 'test-project';

export async function seedSession(
  engine: MemoryEngine,
  projectId: string = 'test-project'
): Promise<{ id: number; uuid: string; projectId: string; startedAt: Date; endedAt: Date | null; metadata: Record<string, unknown> }> {
  _lastSessionProjectId = projectId;
  return engine.createSession({
    projectId,
    endedAt: null,
    metadata: {},
  });
}

export function getLastSessionProjectId(): string {
  return _lastSessionProjectId;
}

export async function seedObservation(
  engine: MemoryEngine,
  sessionId: number,
  overrides: {
    title?: string;
    content?: string;
    type?: Observation['type'];
    topicKey?: string | null;
    projectId?: string;
    metadata?: Record<string, unknown>;
    scope?: 'project' | 'personal';
    pinned?: boolean;
  } = {}
) {
  return engine.createObservation({
    sessionId,
    title: overrides.title ?? 'Test Observation',
    content: overrides.content ?? 'Test content for observation',
    type: overrides.type ?? 'note',
    topicKey: overrides.topicKey ?? null,
    projectId: overrides.projectId ?? _lastSessionProjectId,
    metadata: overrides.metadata ?? {},
    scope: overrides.scope,
    pinned: overrides.pinned,
  });
}

export async function seedMultipleObservations(
  engine: MemoryEngine,
  sessionId: number,
  count: number,
  overrides: {
    type?: 'decision' | 'bug' | 'discovery' | 'note';
    topicKey?: string | null;
    projectId?: string;
  } = {}
) {
  const observations = [];
  for (let i = 0; i < count; i++) {
    const obs = await seedObservation(engine, sessionId, {
      title: `${overrides.type ?? 'note'}-${i}`,
      content: `Content for observation ${i}`,
      ...overrides,
    });
    observations.push(obs);
  }
  return observations;
}
