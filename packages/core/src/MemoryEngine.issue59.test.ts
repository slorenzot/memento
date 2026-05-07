/**
 * Issue #59: Restored observations not re-indexed in FTS5
 *
 * After soft-deleting and restoring an observation via mem_delete → mem_restore,
 * the observation is readable via mem_get_observation but is NOT findable via mem_search.
 *
 * Root cause (suspected): FTS5 index not updated on restore.
 * Fix: observations_undelete trigger re-inserts into observations_fts.
 *
 * This test replicates the EXACT steps from the issue to verify the fix.
 */
import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'bun:test';
import { MemoryEngine } from './MemoryEngine';
import {
  createTestDb,
  cleanupTestDir,
  ensureTestDir,
  seedSession,
  seedObservation,
} from './test-helpers';

describe('Issue #59 — Restored observations re-indexed in FTS5', () => {
  let engine: MemoryEngine;
  let sessionId: number;

  beforeAll(ensureTestDir);
  afterAll(cleanupTestDir);

  beforeEach(async () => {
    const ctx = createTestDb();
    engine = ctx.engine;
    const session = await seedSession(engine, 'issue-59-project');
    sessionId = session.id;
  });

  afterEach(() => {
    engine.close();
  });

  it('should find restored observation via mem_search after mem_delete → mem_restore', async () => {
    // Step 1: Save an observation with unique searchable content
    const obs = await seedObservation(engine, sessionId, {
      title: 'Issue59 Unique Title',
      content: 'Issue59 unique content for FTS5 restore reindex verification',
      topicKey: 'bugfix/fts5-restore-reindex',
      projectId: 'issue-59-project',
    });
    expect(obs.id).toBeDefined();

    // Step 2: Verify it's findable via search BEFORE delete
    const beforeDelete = await engine.search({
      query: 'Issue59 Unique Title',
      projectId: 'issue-59-project',
    });
    expect(beforeDelete.observations.find((o) => o.id === obs.id)).toBeDefined();

    // Step 3: mem_delete — soft delete
    await engine.deleteObservation(obs.id);

    // Step 4: Verify excluded from search results
    const afterDelete = await engine.search({
      query: 'Issue59 Unique Title',
      projectId: 'issue-59-project',
    });
    expect(afterDelete.observations.find((o) => o.id === obs.id)).toBeUndefined();

    // Also verify it's excluded from non-FTS search (deleted_at filter)
    const afterDeleteNoQuery = await engine.search({
      projectId: 'issue-59-project',
    });
    expect(afterDeleteNoQuery.observations.find((o) => o.id === obs.id)).toBeUndefined();

    // Step 5: mem_restore — restore the observation
    const restored = await engine.restoreObservation(obs.id);
    expect(restored.deletedAt).toBeNull();

    // Step 6: mem_get_observation — returns full content ✅
    const retrieved = await engine.getObservation(obs.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved!.title).toBe('Issue59 Unique Title');
    expect(retrieved!.content).toBe('Issue59 unique content for FTS5 restore reindex verification');

    // Step 7: mem_search — SHOULD find the observation via FTS5
    const afterRestore = await engine.search({
      query: 'Issue59 Unique Title',
      projectId: 'issue-59-project',
    });
    const found = afterRestore.observations.find((o) => o.id === obs.id);
    expect(found).toBeDefined();
    expect(found!.title).toBe('Issue59 Unique Title');

    // Step 8: Also verify search by content terms works
    const byContent = await engine.search({
      query: 'FTS5 restore reindex',
      projectId: 'issue-59-project',
    });
    const foundByContent = byContent.observations.find((o) => o.id === obs.id);
    expect(foundByContent).toBeDefined();
  });

  it('should find restored observation via topic_key search after restore', async () => {
    const obs = await seedObservation(engine, sessionId, {
      title: 'Issue59 TopicKey Test',
      content: 'Testing topic_key search after restore',
      topicKey: 'bugfix/fts5-restore-reindex',
      projectId: 'issue-59-project',
    });

    // Delete
    await engine.deleteObservation(obs.id);

    // Verify not findable
    const afterDelete = await engine.search({
      topicKey: 'bugfix/fts5-restore-reindex',
      projectId: 'issue-59-project',
    });
    expect(afterDelete.observations.find((o) => o.id === obs.id)).toBeUndefined();

    // Restore
    await engine.restoreObservation(obs.id);

    // Should be findable via topic_key filter (non-FTS path)
    const afterRestore = await engine.search({
      topicKey: 'bugfix/fts5-restore-reindex',
      projectId: 'issue-59-project',
    });
    expect(afterRestore.observations.find((o) => o.id === obs.id)).toBeDefined();
  });

  it('should handle delete with reason → restore → search correctly', async () => {
    const obs = await seedObservation(engine, sessionId, {
      title: 'Issue59 Delete With Reason',
      content: 'Content for delete-with-reason restore test',
      projectId: 'issue-59-project',
    });

    // Delete WITH reason (updates both deleted_at AND metadata)
    await engine.deleteObservation(obs.id, 'Testing issue #59 fix');

    // Restore
    const restored = await engine.restoreObservation(obs.id);
    expect(restored.deletedAt).toBeNull();

    // Verify findable via FTS5 search
    const result = await engine.search({
      query: 'Issue59 Delete With Reason',
      projectId: 'issue-59-project',
    });
    expect(result.observations.find((o) => o.id === obs.id)).toBeDefined();
  });
});
