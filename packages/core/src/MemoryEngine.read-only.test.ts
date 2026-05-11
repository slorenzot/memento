/**
 * MemoryEngine.read-only.test.ts
 *
 * Tests for read-only observation protection (Issue #54).
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { createTestDb, seedSession, seedObservation, cleanupTestDir } from './test-helpers';

describe('MemoryEngine — Read-Only Protection', () => {
  let engine: any;
  let sessionId: number;

  beforeEach(async () => {
    const setup = createTestDb();
    engine = setup.engine;
    const session = await seedSession(engine, 'test-project');
    sessionId = session.id;
  });

  afterEach(() => {
    engine.close();
    cleanupTestDir();
  });

  describe('readOnly column', () => {
    it('creates observation with readOnly=false by default', async () => {
      const obs = await seedObservation(engine, sessionId);
      expect(obs.readOnly).toBe(false);
    });

    it('creates observation with readOnly=true', async () => {
      const obs = await seedObservation(engine, sessionId, { readOnly: true });
      expect(obs.readOnly).toBe(true);
    });
  });

  describe('updateObservation protection', () => {
    it('rejects content update on read-only observation', async () => {
      const obs = await seedObservation(engine, sessionId, { readOnly: true });
      expect(engine.updateObservation(obs.id, { content: 'new content' })).rejects.toThrow('read-only');
    });

    it('rejects title update on read-only observation', async () => {
      const obs = await seedObservation(engine, sessionId, { readOnly: true });
      expect(engine.updateObservation(obs.id, { title: 'new title' })).rejects.toThrow('read-only');
    });

    it('allows changing readOnly flag on read-only observation', async () => {
      const obs = await seedObservation(engine, sessionId, { readOnly: true });
      const updated = await engine.updateObservation(obs.id, { readOnly: false });
      expect(updated.readOnly).toBe(false);
    });

    it('allows update on non-read-only observation', async () => {
      const obs = await seedObservation(engine, sessionId, { readOnly: false });
      const updated = await engine.updateObservation(obs.id, { title: 'new title' });
      expect(updated.title).toBe('new title');
    });
  });

  describe('deleteObservation protection', () => {
    it('rejects delete on read-only observation', async () => {
      const obs = await seedObservation(engine, sessionId, { readOnly: true });
      expect(engine.deleteObservation(obs.id)).rejects.toThrow('read-only');
    });

    it('allows delete on non-read-only observation', async () => {
      const obs = await seedObservation(engine, sessionId, { readOnly: false });
      await engine.deleteObservation(obs.id);
      const deleted = await engine.getObservation(obs.id, true);
      expect(deleted.deletedAt).not.toBeNull();
    });
  });

  describe('mergeObservations protection', () => {
    it('rejects merge if any source is read-only', async () => {
      const obs1 = await seedObservation(engine, sessionId, { topicKey: 'merge-test', readOnly: true });
      const obs2 = await seedObservation(engine, sessionId, { topicKey: 'merge-test' });

      expect(engine.mergeObservations({
        projectId: 'test-project',
        observationIds: [obs1.id, obs2.id],
        strategy: 'by_ids',
      })).rejects.toThrow('read-only');
    });
  });

  describe('lockObservation / unlockObservation', () => {
    it('locks an observation', async () => {
      const obs = await seedObservation(engine, sessionId);
      const locked = await engine.lockObservation(obs.id);
      expect(locked.readOnly).toBe(true);
    });

    it('unlocks an observation', async () => {
      const obs = await seedObservation(engine, sessionId, { readOnly: true });
      const unlocked = await engine.unlockObservation(obs.id);
      expect(unlocked.readOnly).toBe(false);
    });
  });
});
