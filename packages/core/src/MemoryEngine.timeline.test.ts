/**
 * MemoryEngine.timeline.test.ts — Timeline sort order tests (Issue #140)
 *
 * Verifies that getTimeline() returns observations in DESC order
 * (newest first), which is the correct behavior for a timeline view.
 */
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { MemoryEngine } from './MemoryEngine';
import { mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';

describe('getTimeline() sort order — Issue #140', () => {
  let engine: MemoryEngine;
  let testDbPath: string;
  const testDir = join(process.cwd(), 'test-data');

  beforeEach(() => {
    if (!existsSync(testDir)) mkdirSync(testDir, { recursive: true });
    testDbPath = join(testDir, `timeline-${Date.now()}-${Math.random().toString(36).slice(7)}.db`);
    engine = new MemoryEngine(testDbPath);
  });

  afterEach(() => {
    engine.close();
  });

  /**
   * Helper: create observations with specific timestamps (ms since epoch).
   * Returns the IDs in the order they were requested.
   */
  async function seedWithTimestamps(
    items: Array<{ title: string; timestamp: number; projectId?: string }>
  ): Promise<number[]> {
    const projectId = 'test-timeline';
    const session = await engine.createSession({
      projectId,
      endedAt: null,
      metadata: {},
    });

    const ids: number[] = [];
    for (const item of items) {
      const obs = await engine.createObservation({
        sessionId: session.id,
        title: item.title,
        content: `Content for ${item.title}`,
        type: 'note',
        projectId,
        metadata: {},
      });
      ids.push(obs.id);
    }

    // Force specific created_at timestamps
    for (let i = 0; i < items.length; i++) {
      (
        engine as unknown as {
          db: { prepare: (sql: string) => { run: (...args: number[]) => void } };
        }
      ).db
        .prepare('UPDATE observations SET created_at = ? WHERE id = ?')
        .run(items[i].timestamp, ids[i]);
    }

    return ids;
  }

  it('should return newest observations first', async () => {
    const now = Date.now();
    const ids = await seedWithTimestamps([
      { title: 'Oldest', timestamp: now - 3000 },
      { title: 'Middle', timestamp: now - 2000 },
      { title: 'Newest', timestamp: now - 1000 },
    ]);

    const result = await engine.getTimeline({ projectId: 'test-timeline', limit: 50 });

    expect(result.observations).toHaveLength(3);
    expect(result.observations[0].id).toBe(ids[2]); // Newest first
    expect(result.observations[0].title).toBe('Newest');
    expect(result.observations[1].id).toBe(ids[1]); // Middle
    expect(result.observations[2].id).toBe(ids[0]); // Oldest last
    expect(result.observations[2].title).toBe('Oldest');
  });

  it('should maintain deterministic order for same-timestamp observations', async () => {
    const sharedTimestamp = Date.now();
    const ids = await seedWithTimestamps([
      { title: 'A', timestamp: sharedTimestamp },
      { title: 'B', timestamp: sharedTimestamp },
      { title: 'C', timestamp: sharedTimestamp },
    ]);

    const result = await engine.getTimeline({ projectId: 'test-timeline', limit: 50 });

    expect(result.observations).toHaveLength(3);
    // DESC by id: highest id first (last inserted)
    expect(result.observations.map((o) => o.id)).toEqual([...ids].reverse());

    // Run twice to verify determinism (no random ordering)
    const result2 = await engine.getTimeline({ projectId: 'test-timeline', limit: 50 });
    expect(result2.observations.map((o) => o.id)).toEqual(result.observations.map((o) => o.id));
  });

  it('should respect offset with DESC order', async () => {
    const now = Date.now();
    const ids = await seedWithTimestamps([
      { title: 'Obs-0', timestamp: now - 5000 },
      { title: 'Obs-1', timestamp: now - 4000 },
      { title: 'Obs-2', timestamp: now - 3000 },
      { title: 'Obs-3', timestamp: now - 2000 },
      { title: 'Obs-4', timestamp: now - 1000 },
    ]);

    // First page: newest 2
    const page1 = await engine.getTimeline({ projectId: 'test-timeline', limit: 2, offset: 0 });
    expect(page1.observations).toHaveLength(2);
    expect(page1.observations[0].id).toBe(ids[4]); // Newest
    expect(page1.observations[1].id).toBe(ids[3]);

    // Second page: next 2
    const page2 = await engine.getTimeline({ projectId: 'test-timeline', limit: 2, offset: 2 });
    expect(page2.observations).toHaveLength(2);
    expect(page2.observations[0].id).toBe(ids[2]);
    expect(page2.observations[1].id).toBe(ids[1]);

    // Third page: last 1
    const page3 = await engine.getTimeline({ projectId: 'test-timeline', limit: 2, offset: 4 });
    expect(page3.observations).toHaveLength(1);
    expect(page3.observations[0].id).toBe(ids[0]); // Oldest

    // Verify no overlaps
    const allIds = [
      ...page1.observations.map((o) => o.id),
      ...page2.observations.map((o) => o.id),
      ...page3.observations.map((o) => o.id),
    ];
    expect(new Set(allIds).size).toBe(5); // No duplicates
  });

  it('should show newest day first in web UI scenario', async () => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const ids = await seedWithTimestamps([
      { title: 'Two days ago #1', timestamp: twoDaysAgo.getTime() + 1000 },
      { title: 'Two days ago #2', timestamp: twoDaysAgo.getTime() + 2000 },
      { title: 'Yesterday #1', timestamp: yesterday.getTime() + 1000 },
      { title: 'Yesterday #2', timestamp: yesterday.getTime() + 2000 },
      { title: 'Today #1', timestamp: today.getTime() + 1000 },
      { title: 'Today #2', timestamp: today.getTime() + 2000 },
    ]);

    const result = await engine.getTimeline({ projectId: 'test-timeline', limit: 50 });

    expect(result.observations).toHaveLength(6);

    // First observation should be from today (newest)
    const firstDate = new Date(result.observations[0].createdAt).toDateString();
    const todayStr = today.toDateString();
    expect(firstDate).toBe(todayStr);

    // Last observation should be from two days ago (oldest)
    const lastDate = new Date(result.observations[5].createdAt).toDateString();
    const twoDaysAgoStr = twoDaysAgo.toDateString();
    expect(lastDate).toBe(twoDaysAgoStr);

    // Within same day, newest first
    expect(result.observations[0].title).toBe('Today #2');
    expect(result.observations[1].title).toBe('Today #1');
  });

  it('should return empty results gracefully', async () => {
    const result = await engine.getTimeline({ projectId: 'test-timeline', limit: 50 });

    expect(result.observations).toHaveLength(0);
    expect(result.total).toBe(0);
  });
});
