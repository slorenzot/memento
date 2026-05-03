import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'bun:test';
import { MemoryEngine } from './MemoryEngine';
import {
  measureTime,
  expectUnder,
  bench,
  createTestDb,
  cleanupTestDir,
  ensureTestDir,
  seedSession,
  seedObservation,
  seedMultipleObservations,
} from './test-helpers';

describe('Delete / Restore / Purge', () => {
  let engine: MemoryEngine;
  let sessionId: number;

  beforeAll(ensureTestDir);
  afterAll(cleanupTestDir);

  beforeEach(async () => {
    const ctx = createTestDb();
    engine = ctx.engine;
    const session = await seedSession(engine);
    sessionId = session.id;
  });

  afterEach(() => {
    engine.close();
  });

  // ─── Soft Delete ──────────────────────────────────────────

  describe('deleteObservation()', () => {
    it('#34 — should mark deletedAt (soft delete)', async () => {
      const obs = await seedObservation(engine, sessionId);
      expect(obs.deletedAt).toBeNull();

      await bench('#34 deleteObservation soft delete', 50, async () => {
        await engine.deleteObservation(obs.id);
      });

      const after = await engine.getObservation(obs.id);
      expect(after).toBeNull(); // excluded from normal get
    });

    it('#35 — should store reason in metadata', async () => {
      const obs = await seedObservation(engine, sessionId);

      const { ms } = await measureTime(() =>
        engine.deleteObservation(obs.id, 'No longer relevant')
      );
      expectUnder(ms, 50, '#35 delete with reason');

      // Verify reason is in metadata — need to get with includeDeleted
      const deleted = await engine.search({
        query: undefined,
        includeDeleted: true,
        projectId: 'test-project',
      });
      const found = deleted.observations.find((o) => o.id === obs.id);
      expect(found).toBeDefined();
      expect(found!.metadata).toHaveProperty('deleteReason', 'No longer relevant');
    });

    it('#36 — should remove from FTS5 index (not in search results)', async () => {
      const obs = await seedObservation(engine, sessionId, {
        title: 'UniqueFTSDeleteTest',
        content: 'This content is unique for FTS delete test',
      });

      // Verify it appears in search before delete
      const before = await engine.search({ query: 'UniqueFTSDeleteTest' });
      expect(before.total).toBeGreaterThanOrEqual(1);

      const { ms } = await measureTime(() => engine.deleteObservation(obs.id));
      expectUnder(ms, 100, '#36 FTS5 removal');

      // Should NOT appear in FTS5 search after delete
      const after = await engine.search({ query: 'UniqueFTSDeleteTest' });
      const found = after.observations.find((o) => o.id === obs.id);
      expect(found).toBeUndefined();
    });

    it('#37 — should throw if already deleted', async () => {
      const obs = await seedObservation(engine, sessionId);
      await engine.deleteObservation(obs.id);

      const { ms } = await measureTime(() =>
        expect(engine.deleteObservation(obs.id)).rejects.toThrow('already deleted')
      );
      expectUnder(ms, 10, '#37 already deleted error');
    });

    it('#38 — should throw if observation not found', async () => {
      const { ms } = await measureTime(() =>
        expect(engine.deleteObservation(99999)).rejects.toThrow('not found')
      );
      expectUnder(ms, 10, '#38 not found error');
    });
  });

  // ─── Restore ──────────────────────────────────────────────

  describe('restoreObservation()', () => {
    it('#39 — should set deletedAt to null', async () => {
      const obs = await seedObservation(engine, sessionId);
      await engine.deleteObservation(obs.id);

      const restored = await bench('#39 restoreObservation', 50, async () => {
        return engine.restoreObservation(obs.id);
      });

      expect(restored.deletedAt).toBeNull();
    });

    it('#40 — should re-insert into FTS5 (appears in search again)', async () => {
      const obs = await seedObservation(engine, sessionId, {
        title: 'UniqueFTSRestoreTest',
        content: 'This content is unique for FTS restore test',
      });
      await engine.deleteObservation(obs.id);

      // Should not appear before restore
      const before = await engine.search({ query: 'UniqueFTSRestoreTest' });
      const foundBefore = before.observations.find((o) => o.id === obs.id);
      expect(foundBefore).toBeUndefined();

      const { ms } = await measureTime(() => engine.restoreObservation(obs.id));
      expectUnder(ms, 100, '#40 FTS5 re-insert');

      // Should appear again after restore
      const after = await engine.search({ query: 'UniqueFTSRestoreTest' });
      const foundAfter = after.observations.find((o) => o.id === obs.id);
      expect(foundAfter).toBeDefined();
    });

    it('#41 — should throw if observation is not deleted', async () => {
      const obs = await seedObservation(engine, sessionId);

      const { ms } = await measureTime(() =>
        expect(engine.restoreObservation(obs.id)).rejects.toThrow('not deleted')
      );
      expectUnder(ms, 10, '#41 not deleted error');
    });

    it('#42 — should throw if observation not found', async () => {
      const { ms } = await measureTime(() =>
        expect(engine.restoreObservation(99999)).rejects.toThrow('not found')
      );
      expectUnder(ms, 10, '#42 not found error');
    });
  });

  // ─── List Deleted ─────────────────────────────────────────

  describe('listDeleted()', () => {
    it('#43 — should return only deleted observations', async () => {
      const obs1 = await seedObservation(engine, sessionId);
      const obs2 = await seedObservation(engine, sessionId);
      await seedObservation(engine, sessionId); // active one

      await engine.deleteObservation(obs1.id);
      await engine.deleteObservation(obs2.id);

      const result = await bench('#43 listDeleted', 50, async () => {
        return engine.listDeleted({});
      });

      expect(result.observations).toHaveLength(2);
      result.observations.forEach((o) => {
        expect(o.deletedAt).not.toBeNull();
      });
    });

    it('#44 — should filter by projectId', async () => {
      const sessionA = await seedSession(engine, 'project-A');
      const sessionB = await seedSession(engine, 'project-B');

      const obsA = await seedObservation(engine, sessionA.id, { projectId: 'project-A' });
      const obsB = await seedObservation(engine, sessionB.id, { projectId: 'project-B' });

      await engine.deleteObservation(obsA.id);
      await engine.deleteObservation(obsB.id);

      const result = await bench('#44 listDeleted by project', 50, async () => {
        return engine.listDeleted({ projectId: 'project-A' });
      });

      expect(result.observations).toHaveLength(1);
      expect(result.observations[0].projectId).toBe('project-A');
    });

    it('#45 — should respect limit', async () => {
      const observations = await seedMultipleObservations(engine, sessionId, 5);
      for (const obs of observations) {
        await engine.deleteObservation(obs.id);
      }

      const result = await bench('#45 listDeleted with limit', 50, async () => {
        return engine.listDeleted({ limit: 3 });
      });

      expect(result.observations.length).toBeLessThanOrEqual(3);
    });

    it('#46 — should return correct total count', async () => {
      const observations = await seedMultipleObservations(engine, sessionId, 4);
      for (const obs of observations) {
        await engine.deleteObservation(obs.id);
      }

      const result = await bench('#46 listDeleted total', 50, async () => {
        return engine.listDeleted({ limit: 2 });
      });

      expect(result.total).toBe(4);
      expect(result.observations.length).toBeLessThanOrEqual(2);
    });

    it('#47 — should return empty array when no deleted', async () => {
      await seedObservation(engine, sessionId); // active only

      const result = await bench('#47 listDeleted empty', 50, async () => {
        return engine.listDeleted({});
      });

      expect(result.observations).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  // ─── Purge ────────────────────────────────────────────────

  describe('purgeObservations()', () => {
    it('#48 — should permanently delete soft-deleted observations', async () => {
      const obs = await seedObservation(engine, sessionId);
      await engine.deleteObservation(obs.id);

      const result = await bench('#48 purge', 200, async () => {
        return engine.purgeObservations({});
      });

      expect(result.purgedCount).toBeGreaterThanOrEqual(1);
      expect(result.purgedIds).toContain(obs.id);

      // Verify permanently gone
      const deleted = await engine.listDeleted({});
      expect(deleted.total).toBe(0);
    });

    it('#49 — should filter by projectId', async () => {
      const sessionA = await seedSession(engine, 'purge-A');
      const sessionB = await seedSession(engine, 'purge-B');

      const obsA = await seedObservation(engine, sessionA.id, { projectId: 'purge-A' });
      const obsB = await seedObservation(engine, sessionB.id, { projectId: 'purge-B' });

      await engine.deleteObservation(obsA.id);
      await engine.deleteObservation(obsB.id);

      const result = await bench('#49 purge by project', 200, async () => {
        return engine.purgeObservations({ projectId: 'purge-A' });
      });

      expect(result.purgedCount).toBe(1);
      expect(result.purgedIds).toContain(obsA.id);

      // project-B observation should still be in deleted
      const remaining = await engine.listDeleted({ projectId: 'purge-B' });
      expect(remaining.total).toBe(1);
    });

    it('#50 — should filter by specific observationIds', async () => {
      const obs1 = await seedObservation(engine, sessionId);
      const obs2 = await seedObservation(engine, sessionId);

      await engine.deleteObservation(obs1.id);
      await engine.deleteObservation(obs2.id);

      const result = await bench('#50 purge by IDs', 200, async () => {
        return engine.purgeObservations({ observationIds: [obs1.id] });
      });

      expect(result.purgedCount).toBe(1);
      expect(result.purgedIds).toContain(obs1.id);
      expect(result.purgedIds).not.toContain(obs2.id);
    });

    it('#51 — should return purgedCount and purgedIds correctly', async () => {
      const observations = await seedMultipleObservations(engine, sessionId, 3);
      for (const obs of observations) {
        await engine.deleteObservation(obs.id);
      }

      const result = await bench('#51 purge return values', 200, async () => {
        return engine.purgeObservations({});
      });

      expect(result.purgedCount).toBeGreaterThanOrEqual(3);
      expect(result.purgedIds.length).toBeGreaterThanOrEqual(3);
      for (const obs of observations) {
        expect(result.purgedIds).toContain(obs.id);
      }
    });

    it('#52 — should return 0 when no deleted observations', async () => {
      await seedObservation(engine, sessionId); // active only

      const result = await bench('#52 purge empty', 50, async () => {
        return engine.purgeObservations({});
      });

      expect(result.purgedCount).toBe(0);
      expect(result.purgedIds).toHaveLength(0);
    });
  });

  // ─── Full Cycle ───────────────────────────────────────────

  describe('Full Lifecycle Cycle', () => {
    it('#53 — create → search → delete → list → restore → purge (< 500ms)', async () => {
      const cycleStart = performance.now();

      // 1. Create
      const obs = await seedObservation(engine, sessionId, {
        title: 'Lifecycle Test',
        content: 'Full cycle content',
        topicKey: 'lifecycle',
      });
      expect(obs.id).toBeDefined();

      // 2. Search (verify exists)
      const searchResult = await engine.search({ query: 'Lifecycle' });
      expect(searchResult.total).toBeGreaterThanOrEqual(1);

      // 3. Delete
      await engine.deleteObservation(obs.id);
      const afterDelete = await engine.search({ query: 'Lifecycle' });
      expect(afterDelete.observations.find((o) => o.id === obs.id)).toBeUndefined();

      // 4. List deleted
      const deletedList = await engine.listDeleted({});
      expect(deletedList.total).toBeGreaterThanOrEqual(1);

      // 5. Restore
      const restored = await engine.restoreObservation(obs.id);
      expect(restored.deletedAt).toBeNull();

      // 6. Delete again
      await engine.deleteObservation(obs.id);

      // 7. Purge
      const purgeResult = await engine.purgeObservations({ observationIds: [obs.id] });
      expect(purgeResult.purgedCount).toBe(1);

      const totalMs = performance.now() - cycleStart;
      expectUnder(totalMs, 500, '#53 full lifecycle');
    });

    it('#54 — batch: soft-delete 100 observations (< 3000ms)', async () => {
      const observations = await seedMultipleObservations(engine, sessionId, 100);

      const batchStart = performance.now();
      for (const obs of observations) {
        await engine.deleteObservation(obs.id);
      }
      const batchMs = performance.now() - batchStart;

      expectUnder(batchMs, 3000, '#54 batch delete 100');
      const avg = batchMs / 100;
      expectUnder(avg, 30, '#54 avg per delete');

      const deletedList = await engine.listDeleted({});
      expect(deletedList.total).toBe(100);
    });

    it('#55 — batch: purge 100 soft-deleted observations (< 500ms)', async () => {
      const observations = await seedMultipleObservations(engine, sessionId, 100);
      for (const obs of observations) {
        await engine.deleteObservation(obs.id);
      }

      const { result, ms } = await measureTime(() =>
        engine.purgeObservations({})
      );

      expectUnder(ms, 500, '#55 batch purge 100');
      expect(result.purgedCount).toBeGreaterThanOrEqual(100);
    });
  });
});
