import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'bun:test';
import { MemoryEngine } from './MemoryEngine';
import type { Observation } from './types';
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

describe('Merge', () => {
  let engine: MemoryEngine;
  let sessionId: number;

  beforeAll(ensureTestDir);
  afterAll(cleanupTestDir);

  beforeEach(async () => {
    const ctx = createTestDb();
    engine = ctx.engine;
    const session = await seedSession(engine, 'merge-project');
    sessionId = session.id;
  });

  afterEach(() => {
    engine.close();
  });

  // ─── Jaccard Similarity ───────────────────────────────────

  describe('jaccardSimilarity()', () => {
    it('#101 — identical texts → 1.0', () => {
      const { ms } = measureTimeSync(() => {
        const sim = engine.jaccardSimilarity(
          'the quick brown fox jumps over the lazy dog',
          'the quick brown fox jumps over the lazy dog'
        );
        expect(sim).toBe(1.0);
      });
      expectUnder(ms, 1, '#101 identical');
    });

    it('#102 — completely different texts → 0.0', () => {
      const { ms } = measureTimeSync(() => {
        const sim = engine.jaccardSimilarity(
          'alpha beta gamma delta',
          'one two three four'
        );
        expect(sim).toBe(0.0);
      });
      expectUnder(ms, 1, '#102 different');
    });

    it('#103 — partially similar → ~0.5', () => {
      const { ms } = measureTimeSync(() => {
        const sim = engine.jaccardSimilarity(
          'the quick brown fox jumps over',
          'the quick brown cat sleeps under'
        );
        expect(sim).toBeGreaterThan(0.3);
        expect(sim).toBeLessThan(0.7);
      });
      expectUnder(ms, 1, '#103 partial');
    });

    it('#104 — should ignore words shorter than 3 chars', () => {
      const sim = engine.jaccardSimilarity(
        'a I an is it to do go',
        'completely different set of longer words'
      );
      // All words in text1 are < 3 chars after filtering → empty set
      expect(sim).toBe(0);
    });

    it('#105 — should be case-insensitive', () => {
      const sim = engine.jaccardSimilarity(
        'Quick Brown Fox',
        'quick brown fox'
      );
      expect(sim).toBe(1.0);
    });
  });

  // ─── findMergeCandidates() by_topic ───────────────────────

  describe('findMergeCandidates() — by_topic', () => {
    it('#82 — should group by topic_key', async () => {
      await seedObservation(engine, sessionId, { topicKey: 'auth', title: 'Auth 1' });
      await seedObservation(engine, sessionId, { topicKey: 'auth', title: 'Auth 2' });
      await seedObservation(engine, sessionId, { topicKey: 'auth', title: 'Auth 3' });

      const candidates = await bench('#82 findMerge by_topic', 200, async () => {
        return engine.findMergeCandidates({ projectId: 'merge-project', strategy: 'by_topic' });
      });

      expect(candidates.groups.length).toBeGreaterThanOrEqual(1);
      const authGroup = candidates.groups.find((g) => g.reason === 'topic_key: auth');
      expect(authGroup).toBeDefined();
      expect(authGroup!.observations).toHaveLength(3);
    });

    it('#83 — should ignore observations without topic_key', async () => {
      await seedObservation(engine, sessionId, { topicKey: null });
      await seedObservation(engine, sessionId, { topicKey: null });

      const candidates = await engine.findMergeCandidates({
        projectId: 'merge-project',
        strategy: 'by_topic',
      });

      // No groups should exist for null topic keys
      candidates.groups.forEach((g) => {
        expect(g.reason).not.toContain('null');
      });
    });

    it('#84 — should ignore soft-deleted observations', async () => {
      const obs1 = await seedObservation(engine, sessionId, { topicKey: 'deleted-topic' });
      const obs2 = await seedObservation(engine, sessionId, { topicKey: 'deleted-topic' });
      await engine.deleteObservation(obs1.id);

      const candidates = await engine.findMergeCandidates({
        projectId: 'merge-project',
        strategy: 'by_topic',
      });

      // Only obs2 remains → group needs >= 2 obs, so no group
      const deletedGroup = candidates.groups.find(
        (g) => g.reason === 'topic_key: deleted-topic'
      );
      expect(deletedGroup).toBeUndefined();
    });

    it('#86 — should return estimatedReduction', async () => {
      await seedObservation(engine, sessionId, { topicKey: 'reduce', title: 'R1' });
      await seedObservation(engine, sessionId, { topicKey: 'reduce', title: 'R2' });

      const candidates = await engine.findMergeCandidates({
        projectId: 'merge-project',
        strategy: 'by_topic',
      });

      expect(candidates.estimatedReduction).toBeGreaterThanOrEqual(1);
    });
  });

  // ─── findMergeCandidates() by_similarity ──────────────────

  describe('findMergeCandidates() — by_similarity', () => {
    it('#85 — should group by Jaccard > 0.85', async () => {
      // Very similar content
      await seedObservation(engine, sessionId, {
        title: 'Similar 1',
        content: 'Implemented authentication using JWT tokens with refresh token rotation for security',
      });
      await seedObservation(engine, sessionId, {
        title: 'Similar 2',
        content: 'Implemented authentication using JWT tokens with refresh token rotation for security',
      });

      const candidates = await bench('#85 findMerge by_similarity', 500, async () => {
        return engine.findMergeCandidates({ projectId: 'merge-project', strategy: 'by_similarity' });
      });

      expect(candidates.groups.length).toBeGreaterThanOrEqual(1);
      expect(candidates.groups[0].observations.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ─── mergeObservations() by_topic ─────────────────────────

  describe('mergeObservations() — by_topic', () => {
    it('#87 — should create merged observation', async () => {
      await seedObservation(engine, sessionId, { topicKey: 'merge-target', title: 'M1' });
      await seedObservation(engine, sessionId, { topicKey: 'merge-target', title: 'M2' });

      const results = await bench('#87 merge by_topic', 200, async () => {
        return engine.mergeObservations({
          projectId: 'merge-project',
          strategy: 'by_topic',
        });
      });

      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].mergedObservation).toBeDefined();
      expect(results[0].mergedObservation.id).toBeDefined();
    });

    it('#88 — should delete original observations', async () => {
      const obs1 = await seedObservation(engine, sessionId, { topicKey: 'merge-del', title: 'D1' });
      const obs2 = await seedObservation(engine, sessionId, { topicKey: 'merge-del', title: 'D2' });

      const results = await engine.mergeObservations({
        projectId: 'merge-project',
        strategy: 'by_topic',
      });

      const mergeResult = results.find((r) =>
        r.deletedIds.includes(obs1.id) || r.deletedIds.includes(obs2.id)
      );
      expect(mergeResult).toBeDefined();
      expect(mergeResult!.deletedIds).toContain(obs1.id);
      expect(mergeResult!.deletedIds).toContain(obs2.id);

      // Originals should be gone
      const afterMerge = await engine.search({ projectId: 'merge-project' });
      expect(afterMerge.observations.find((o) => o.id === obs1.id)).toBeUndefined();
      expect(afterMerge.observations.find((o) => o.id === obs2.id)).toBeUndefined();
    });

    it('#89 — should filter by specific topicKey', async () => {
      await seedObservation(engine, sessionId, { topicKey: 'filter-this', title: 'F1' });
      await seedObservation(engine, sessionId, { topicKey: 'filter-this', title: 'F2' });
      await seedObservation(engine, sessionId, { topicKey: 'dont-filter', title: 'NF1' });
      await seedObservation(engine, sessionId, { topicKey: 'dont-filter', title: 'NF2' });

      const results = await engine.mergeObservations({
        projectId: 'merge-project',
        strategy: 'by_topic',
        topicKey: 'filter-this',
      });

      // Only filter-this should be merged
      expect(results.length).toBe(1);
      expect(results[0].mergedObservation.topicKey).toBe('filter-this');
    });
  });

  // ─── mergeObservations() by_ids ───────────────────────────

  describe('mergeObservations() — by_ids', () => {
    it('#91 — should merge specific IDs', async () => {
      const obs1 = await seedObservation(engine, sessionId, { title: 'ID1', projectId: 'merge-project' });
      const obs2 = await seedObservation(engine, sessionId, { title: 'ID2', projectId: 'merge-project' });

      const results = await bench('#91 merge by_ids', 200, async () => {
        return engine.mergeObservations({
          projectId: 'merge-project',
          strategy: 'by_ids',
          observationIds: [obs1.id, obs2.id],
        });
      });

      expect(results).toHaveLength(1);
      expect(results[0].originalCount).toBe(2);
      expect(results[0].deletedIds).toContain(obs1.id);
      expect(results[0].deletedIds).toContain(obs2.id);
    });

    it('#92 — should validate project ownership', async () => {
      const otherSession = await seedSession(engine, 'other-project');
      const otherObs = await seedObservation(engine, otherSession.id, {
        projectId: 'other-project',
        title: 'Other',
      });
      const localObs = await seedObservation(engine, sessionId, { title: 'Local' });

      await expect(
        engine.mergeObservations({
          projectId: 'merge-project',
          strategy: 'by_ids',
          observationIds: [localObs.id, otherObs.id],
        })
      ).rejects.toThrow(/belongs to project/);
    });

    it('#93 — should reject soft-deleted observations', async () => {
      const obs1 = await seedObservation(engine, sessionId);
      const obs2 = await seedObservation(engine, sessionId);
      await engine.deleteObservation(obs2.id);

      // getObservationById excludes soft-deleted by default,
      // so deleted obs will throw "not found" in merge context
      await expect(
        engine.mergeObservations({
          projectId: 'merge-project',
          strategy: 'by_ids',
          observationIds: [obs1.id, obs2.id],
        })
      ).rejects.toThrow(/not found/);
    });

    it('#94 — should require at least 2 IDs', async () => {
      const obs = await seedObservation(engine, sessionId);

      // by_ids with < 2 should return empty (code checks length >= 2)
      const results = await engine.mergeObservations({
        projectId: 'merge-project',
        strategy: 'by_ids',
        observationIds: [obs.id],
      });

      expect(results).toHaveLength(0);
    });
  });

  // ─── mergeObservations() dry_run ──────────────────────────

  describe('mergeObservations() — dry_run', () => {
    it('#95 — should NOT modify data on dry_run', async () => {
      const obs1 = await seedObservation(engine, sessionId, { topicKey: 'dry-topic', title: 'DR1' });
      const obs2 = await seedObservation(engine, sessionId, { topicKey: 'dry-topic', title: 'DR2' });

      const results = await bench('#95 merge dry_run', 200, async () => {
        return engine.mergeObservations({
          projectId: 'merge-project',
          strategy: 'by_topic',
          dryRun: true,
        });
      });

      expect(results.length).toBeGreaterThanOrEqual(1);

      // Originals should still exist
      const after = await engine.search({ projectId: 'merge-project' });
      expect(after.observations.find((o) => o.id === obs1.id)).toBeDefined();
      expect(after.observations.find((o) => o.id === obs2.id)).toBeDefined();
    });

    it('#96 — should return empty with no candidates', async () => {
      await seedObservation(engine, sessionId, { topicKey: null });

      const results = await engine.mergeObservations({
        projectId: 'merge-project',
        strategy: 'by_topic',
      });

      expect(results).toHaveLength(0);
    });
  });

  // ─── Merged Observation Properties ────────────────────────

  describe('Merged observation properties', () => {
    it('#97 — merged obs has metadata with sourceIds and mergedAt', async () => {
      const obs1 = await seedObservation(engine, sessionId, { topicKey: 'meta-test' });
      const obs2 = await seedObservation(engine, sessionId, { topicKey: 'meta-test' });

      const results = await engine.mergeObservations({
        projectId: 'merge-project',
        strategy: 'by_ids',
        observationIds: [obs1.id, obs2.id],
      });

      const merged = results[0].mergedObservation;
      expect(merged.metadata.merged).toBe(true);
      expect(merged.metadata.sourceIds).toEqual([obs1.id, obs2.id]);
      expect(merged.metadata.mergedAt).toBeDefined();
    });

    it('#98 — merged obs uses most frequent type', async () => {
      await seedObservation(engine, sessionId, { topicKey: 'type-test', type: 'bug' });
      await seedObservation(engine, sessionId, { topicKey: 'type-test', type: 'bug' });
      await seedObservation(engine, sessionId, { topicKey: 'type-test', type: 'note' });

      const results = await engine.mergeObservations({
        projectId: 'merge-project',
        strategy: 'by_topic',
        topicKey: 'type-test',
      });

      expect(results[0].mergedObservation.type).toBe('bug');
    });

    it('#99 — merged obs uses most recent title', async () => {
      await seedObservation(engine, sessionId, { topicKey: 'title-test', title: 'Old Title' });
      await seedObservation(engine, sessionId, { topicKey: 'title-test', title: 'New Title' });

      const results = await engine.mergeObservations({
        projectId: 'merge-project',
        strategy: 'by_topic',
        topicKey: 'title-test',
      });

      expect(results[0].mergedObservation.title).toBe('New Title');
    });

    it('#100 — merged obs synthesizes content with timestamps', async () => {
      await seedObservation(engine, sessionId, { topicKey: 'content-test', title: 'C1', content: 'First part' });
      await seedObservation(engine, sessionId, { topicKey: 'content-test', title: 'C2', content: 'Second part' });

      const results = await engine.mergeObservations({
        projectId: 'merge-project',
        strategy: 'by_topic',
        topicKey: 'content-test',
      });

      const content = results[0].mergedObservation.content;
      expect(content).toContain('First part');
      expect(content).toContain('Second part');
      expect(content).toContain('---'); // separator format
    });
  });

  // ─── Benchmarks ───────────────────────────────────────────

  describe('Merge Benchmarks', () => {
    it('#106 — merge by_topic 50 obs in 5 topics (< 500ms)', async () => {
      // Create 5 topics with 10 observations each
      for (let t = 0; t < 5; t++) {
        for (let i = 0; i < 10; i++) {
          await seedObservation(engine, sessionId, {
            topicKey: `bench-topic-${t}`,
            title: `Bench ${t}-${i}`,
          });
        }
      }

      const { result, ms } = await measureTime(() =>
        engine.mergeObservations({
          projectId: 'merge-project',
          strategy: 'by_topic',
        })
      );

      expectUnder(ms, 500, '#106 merge 50 obs in 5 topics');
      expect(result.length).toBe(5);
    });

    it('#107 — merge by_similarity 100 obs (< 1000ms)', async () => {
      // Create 100 obs with some duplicates
      for (let i = 0; i < 50; i++) {
        await seedObservation(engine, sessionId, {
          title: `Sim ${i}`,
          content: `This is a very specific unique content number ${i} for similarity testing`,
        });
        await seedObservation(engine, sessionId, {
          title: `Sim copy ${i}`,
          content: `This is a very specific unique content number ${i} for similarity testing`,
        });
      }

      const { result, ms } = await measureTime(() =>
        engine.mergeObservations({
          projectId: 'merge-project',
          strategy: 'by_similarity',
        })
      );

      expectUnder(ms, 1000, '#107 merge by_similarity 100 obs');
      expect(result.length).toBeGreaterThanOrEqual(1);
    });

    it('#108 — findMergeCandidates with 1,000 obs by_topic (< 500ms)', async () => {
      // Create 1,000 observations in 10 topics
      for (let t = 0; t < 10; t++) {
        for (let i = 0; i < 100; i++) {
          await seedObservation(engine, sessionId, {
            topicKey: `thousand-${t}`,
            title: `T${t}-${i}`,
          });
        }
      }

      const { result, ms } = await measureTime(() =>
        engine.findMergeCandidates({
          projectId: 'merge-project',
          strategy: 'by_topic',
        })
      );

      expectUnder(ms, 500, '#108 findMergeCandidates 1K obs');
      expect(result.groups.length).toBe(10);
    });
  });
});

// Helper for sync timing
function measureTimeSync<T>(fn: () => T): { result: T; ms: number } {
  const start = performance.now();
  const result = fn();
  const ms = performance.now() - start;
  return { result, ms };
}
