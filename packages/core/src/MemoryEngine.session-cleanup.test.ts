import { describe, it, expect, beforeEach, afterAll } from 'bun:test';
import { createTestDb, cleanupTestDir } from './test-helpers';
import { MemoryEngine } from './MemoryEngine';

describe('MemoryEngine — Session Cleanup', () => {
  let engine: MemoryEngine;

  beforeEach(() => {
    const test = createTestDb();
    engine = test.engine;
  });

  afterAll(cleanupTestDir);

  describe('closeStaleSessionsForProject()', () => {
    it('should close stale sessions for a specific project', async () => {
      // Create a session with started_at in the past (25 hours ago)
      const staleSession = await engine.createSession({
        projectId: 'project-a',
        endedAt: null,
        metadata: { agent: 'test' },
      });

      // Manually set started_at to 25h ago
      const staleTimestamp = Date.now() - 25 * 60 * 60 * 1000;
      (engine as any).db
        .prepare('UPDATE sessions SET started_at = ? WHERE id = ?')
        .run(staleTimestamp, staleSession.id);

      // Create a recent session (should NOT be closed)
      const recentSession = await engine.createSession({
        projectId: 'project-a',
        endedAt: null,
        metadata: {},
      });

      // Close stale sessions (default 24h threshold)
      const result = engine.closeStaleSessionsForProject('project-a');

      expect(result.closed).toBe(1);

      // Verify stale session is closed
      const staleUpdated = await engine.getSession(staleSession.id);
      expect(staleUpdated!.endedAt).not.toBeNull();
      expect(staleUpdated!.metadata.auto_closed).toBe(true);
      expect(staleUpdated!.metadata.reason).toBe('stale');
      expect(staleUpdated!.metadata.agent).toBe('test'); // preserved original metadata
      expect(typeof staleUpdated!.metadata.closed_at).toBe('number');

      // Verify recent session is still active
      const recentUpdated = await engine.getSession(recentSession.id);
      expect(recentUpdated!.endedAt).toBeNull();
      expect(recentUpdated!.metadata.auto_closed).toBeUndefined();
    });

    it('should not close sessions from other projects', async () => {
      // Create stale session for project-a
      const sessionA = await engine.createSession({
        projectId: 'project-a',
        endedAt: null,
        metadata: {},
      });

      const staleTimestamp = Date.now() - 25 * 60 * 60 * 1000;
      (engine as any).db
        .prepare('UPDATE sessions SET started_at = ? WHERE id = ?')
        .run(staleTimestamp, sessionA.id);

      // Create stale session for project-b
      const sessionB = await engine.createSession({
        projectId: 'project-b',
        endedAt: null,
        metadata: {},
      });

      (engine as any).db
        .prepare('UPDATE sessions SET started_at = ? WHERE id = ?')
        .run(staleTimestamp, sessionB.id);

      // Only close project-a
      const result = engine.closeStaleSessionsForProject('project-a');

      expect(result.closed).toBe(1);

      // project-a closed
      const updatedA = await engine.getSession(sessionA.id);
      expect(updatedA!.endedAt).not.toBeNull();

      // project-b still active
      const updatedB = await engine.getSession(sessionB.id);
      expect(updatedB!.endedAt).toBeNull();
    });

    it('should respect custom maxAgeMs', async () => {
      // Create session 2 hours old
      const session = await engine.createSession({
        projectId: 'project-a',
        endedAt: null,
        metadata: {},
      });

      const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
      (engine as any).db
        .prepare('UPDATE sessions SET started_at = ? WHERE id = ?')
        .run(twoHoursAgo, session.id);

      // With 1h threshold → should be closed
      const result1 = engine.closeStaleSessionsForProject('project-a', 60 * 60 * 1000);
      expect(result1.closed).toBe(1);

      // Create another 2h old session
      const session2 = await engine.createSession({
        projectId: 'project-a',
        endedAt: null,
        metadata: {},
      });

      (engine as any).db
        .prepare('UPDATE sessions SET started_at = ? WHERE id = ?')
        .run(twoHoursAgo, session2.id);

      // With 3h threshold → should NOT be closed
      const result2 = engine.closeStaleSessionsForProject('project-a', 3 * 60 * 60 * 1000);
      expect(result2.closed).toBe(0);
    });

    it('should return 0 when no stale sessions exist', async () => {
      // Only create recent sessions
      await engine.createSession({
        projectId: 'project-a',
        endedAt: null,
        metadata: {},
      });

      const result = engine.closeStaleSessionsForProject('project-a');
      expect(result.closed).toBe(0);
    });

    it('should return 0 for project with no sessions at all', () => {
      const result = engine.closeStaleSessionsForProject('nonexistent-project');
      expect(result.closed).toBe(0);
    });

    it('should preserve existing metadata when merging auto_close flags', async () => {
      const session = await engine.createSession({
        projectId: 'project-a',
        endedAt: null,
        metadata: { agent: 'claude', version: '3.5', custom: [1, 2, 3] },
      });

      const staleTimestamp = Date.now() - 25 * 60 * 60 * 1000;
      (engine as any).db
        .prepare('UPDATE sessions SET started_at = ? WHERE id = ?')
        .run(staleTimestamp, session.id);

      engine.closeStaleSessionsForProject('project-a');

      const updated = await engine.getSession(session.id);
      expect(updated!.metadata.agent).toBe('claude');
      expect(updated!.metadata.version).toBe('3.5');
      expect(updated!.metadata.custom).toEqual([1, 2, 3]);
      expect(updated!.metadata.auto_closed).toBe(true);
      expect(updated!.metadata.reason).toBe('stale');
    });
  });

  describe('closeStaleSessions()', () => {
    it('should close stale sessions across ALL projects', async () => {
      // Stale sessions in different projects
      const sessionA = await engine.createSession({
        projectId: 'project-a',
        endedAt: null,
        metadata: {},
      });

      const sessionB = await engine.createSession({
        projectId: 'project-b',
        endedAt: null,
        metadata: {},
      });

      const staleTimestamp = Date.now() - 25 * 60 * 60 * 1000;
      (engine as any).db
        .prepare('UPDATE sessions SET started_at = ? WHERE id = ?')
        .run(staleTimestamp, sessionA.id);
      (engine as any).db
        .prepare('UPDATE sessions SET started_at = ? WHERE id = ?')
        .run(staleTimestamp, sessionB.id);

      const result = engine.closeStaleSessions();

      expect(result.closed).toBe(2);

      const updatedA = await engine.getSession(sessionA.id);
      const updatedB = await engine.getSession(sessionB.id);
      expect(updatedA!.endedAt).not.toBeNull();
      expect(updatedB!.endedAt).not.toBeNull();
    });

    it('should not touch already-closed sessions', async () => {
      // Create and close a session
      const session = await engine.createSession({
        projectId: 'project-a',
        endedAt: null,
        metadata: {},
      });

      await engine.endSession(session.id);

      // Make it look old
      const staleTimestamp = Date.now() - 25 * 60 * 60 * 1000;
      (engine as any).db
        .prepare('UPDATE sessions SET started_at = ? WHERE id = ?')
        .run(staleTimestamp, session.id);

      const result = engine.closeStaleSessions();
      expect(result.closed).toBe(0);
    });

    it('should close all sessions with --all equivalent (very small maxAge)', async () => {
      // Create a session (it's "now")
      const session = await engine.createSession({
        projectId: 'project-a',
        endedAt: null,
        metadata: {},
      });

      // Make it 1 second old so it's definitely older than any tiny maxAge
      const oneSecondAgo = Date.now() - 1000;
      (engine as any).db
        .prepare('UPDATE sessions SET started_at = ? WHERE id = ?')
        .run(oneSecondAgo, session.id);

      // Use maxAge=0 → cutoff = Date.now(), and started_at (1s ago) < Date.now() → stale
      const result = engine.closeStaleSessions(0);
      expect(result.closed).toBe(1);

      const updated = await engine.getSession(session.id);
      expect(updated!.endedAt).not.toBeNull();
    });
  });
});
