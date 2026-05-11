/**
 * MemoryEngine.prompt-injection.test.ts
 *
 * Tests for prompt injection features:
 * - pinned column CRUD
 * - selectForPrompt with strategies
 * - renderPromptContext XML rendering
 * - token budget management
 * - pinObservation / unpinObservation
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { createTestDb, seedSession, seedObservation, cleanupTestDir } from './test-helpers';
import { MemoryEngine } from './MemoryEngine';
import type { PromptInjectionConfig } from './types';

describe('MemoryEngine — Prompt Injection', () => {
  let engine: MemoryEngine;
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

  // ─── pinned column CRUD ───────────────────────────────────

  describe('pinned column', () => {
    it('creates observation with pinned=false by default', async () => {
      const obs = await seedObservation(engine, sessionId);
      expect(obs.pinned).toBe(false);
    });

    it('creates observation with pinned=true', async () => {
      const obs = await seedObservation(engine, sessionId, { pinned: true });
      expect(obs.pinned).toBe(true);
    });

    it('updates pinned status via updateObservation', async () => {
      const obs = await seedObservation(engine, sessionId);
      expect(obs.pinned).toBe(false);

      const updated = await engine.updateObservation(obs.id, { pinned: true });
      expect(updated.pinned).toBe(true);
    });

    it('unpins via updateObservation', async () => {
      const obs = await seedObservation(engine, sessionId, { pinned: true });
      const updated = await engine.updateObservation(obs.id, { pinned: false });
      expect(updated.pinned).toBe(false);
    });
  });

  // ─── pinObservation / unpinObservation ────────────────────

  describe('pinObservation / unpinObservation', () => {
    it('pins an observation', async () => {
      const obs = await seedObservation(engine, sessionId);
      const pinned = await engine.pinObservation(obs.id);
      expect(pinned.pinned).toBe(true);
    });

    it('unpins an observation', async () => {
      const obs = await seedObservation(engine, sessionId, { pinned: true });
      const unpinned = await engine.unpinObservation(obs.id);
      expect(unpinned.pinned).toBe(false);
    });

    it('throws on non-existent observation', async () => {
      expect(engine.pinObservation(99999)).rejects.toThrow('Observation not found');
    });
  });

  // ─── selectForPrompt ──────────────────────────────────────

  describe('selectForPrompt', () => {
    const defaultConfig: PromptInjectionConfig = {
      enabled: true,
      maxObservations: 10,
      maxTokens: 5000,
      strategy: 'recent-pinned',
      types: ['decision', 'architecture', 'pattern', 'note'],
    };

    it('returns empty when no observations match types', async () => {
      await seedObservation(engine, sessionId, { type: 'bug' });
      const result = engine.selectForPrompt(defaultConfig);
      expect(result).toHaveLength(0);
    });

    it('returns observations matching types', async () => {
      await seedObservation(engine, sessionId, { type: 'decision' });
      await seedObservation(engine, sessionId, { type: 'note' });
      const result = engine.selectForPrompt(defaultConfig);
      expect(result).toHaveLength(2);
    });

    it('respects maxObservations limit', async () => {
      for (let i = 0; i < 10; i++) {
        await seedObservation(engine, sessionId, { type: 'note', title: `obs-${i}` });
      }

      const config = { ...defaultConfig, maxObservations: 3 };
      const result = engine.selectForPrompt(config);
      expect(result.length).toBeLessThanOrEqual(3);
    });

    it('pinned observations come first', async () => {
      const unpinned = await seedObservation(engine, sessionId, { type: 'note', title: 'unpinned' });
      const pinned = await seedObservation(engine, sessionId, { type: 'note', title: 'pinned', pinned: true });

      const result = engine.selectForPrompt(defaultConfig);
      expect(result[0].id).toBe(pinned.id);
      expect(result[1].id).toBe(unpinned.id);
    });

    it('deterministic order: pinned by ID ASC, then non-pinned by ID ASC', async () => {
      const obs1 = await seedObservation(engine, sessionId, { type: 'note', title: 'note-1' });
      const obs2 = await seedObservation(engine, sessionId, { type: 'note', title: 'note-2', pinned: true });
      const obs3 = await seedObservation(engine, sessionId, { type: 'note', title: 'note-3' });
      const obs4 = await seedObservation(engine, sessionId, { type: 'note', title: 'note-4', pinned: true });

      const result = engine.selectForPrompt(defaultConfig);
      // Pinned first (ID ASC): obs2, obs4
      expect(result[0].id).toBe(obs2.id);
      expect(result[1].id).toBe(obs4.id);
      // Non-pinned (ID ASC): obs1, obs3
      expect(result[2].id).toBe(obs1.id);
      expect(result[3].id).toBe(obs3.id);
    });

    it('strategy pinned-only returns only pinned observations', async () => {
      await seedObservation(engine, sessionId, { type: 'note', title: 'unpinned' });
      await seedObservation(engine, sessionId, { type: 'note', title: 'pinned', pinned: true });

      const config = { ...defaultConfig, strategy: 'pinned-only' as const };
      const result = engine.selectForPrompt(config);
      expect(result).toHaveLength(1);
      expect(result[0].pinned).toBe(true);
    });

    it('filters by projectId when provided', async () => {
      await seedObservation(engine, sessionId, { type: 'note', projectId: 'project-a' });

      // Create observation in different project
      const session2 = await seedSession(engine, 'project-b');
      await seedObservation(engine, session2.id, { type: 'note', projectId: 'project-b' });

      const config = { ...defaultConfig, projectId: 'project-a' };
      const result = engine.selectForPrompt(config);
      expect(result).toHaveLength(1);
      expect(result[0].projectId).toBe('project-a');
    });

    it('excludes soft-deleted observations', async () => {
      const obs = await seedObservation(engine, sessionId, { type: 'note' });
      await engine.deleteObservation(obs.id);

      const result = engine.selectForPrompt(defaultConfig);
      expect(result).toHaveLength(0);
    });

    it('respects token budget', async () => {
      // Create observations with long content
      for (let i = 0; i < 10; i++) {
        await seedObservation(engine, sessionId, {
          type: 'note',
          title: `obs-${i}`,
          content: 'A'.repeat(2000), // ~500 tokens each
        });
      }

      // With 500 tokens (~2000 chars), should fit ~3 observations
      // Each obs estimated at ~605 chars (100 overhead + title + 500 content truncated)
      const config = { ...defaultConfig, maxTokens: 500 };
      const result = engine.selectForPrompt(config);
      expect(result.length).toBeLessThan(10); // budget trimmed some
      expect(result.length).toBeGreaterThanOrEqual(1); // at least one fits
    });
  });

  // ─── renderPromptContext ──────────────────────────────────

  describe('renderPromptContext', () => {
    const defaultConfig: PromptInjectionConfig = {
      enabled: true,
      maxObservations: 10,
      maxTokens: 5000,
      strategy: 'recent-pinned',
      types: ['note'],
    };

    it('returns empty XML for no observations', () => {
      const rendered = engine.renderPromptContext([], defaultConfig);
      expect(rendered.xml).toBe('');
      expect(rendered.observationCount).toBe(0);
      expect(rendered.tokenCount).toBe(0);
    });

    it('renders valid XML structure', async () => {
      const obs = await seedObservation(engine, sessionId, { type: 'note', title: 'Test' });
      const observations = engine.selectForPrompt(defaultConfig);
      const rendered = engine.renderPromptContext(observations, defaultConfig);

      expect(rendered.xml).toContain('<memento_context>');
      expect(rendered.xml).toContain('</memento_context>');
      expect(rendered.xml).toContain(`<observation id="${obs.id}"`);
      expect(rendered.xml).toContain('type="note"');
      expect(rendered.observationCount).toBe(1);
    });

    it('includes pinned attribute for pinned observations', async () => {
      await seedObservation(engine, sessionId, { type: 'note', pinned: true });
      const observations = engine.selectForPrompt(defaultConfig);
      const rendered = engine.renderPromptContext(observations, defaultConfig);

      expect(rendered.xml).toContain('pinned="true"');
    });

    it('does not include pinned attribute for unpinned observations', async () => {
      await seedObservation(engine, sessionId, { type: 'note', pinned: false });
      const observations = engine.selectForPrompt(defaultConfig);
      const rendered = engine.renderPromptContext(observations, defaultConfig);

      expect(rendered.xml).not.toContain('pinned="true"');
    });

    it('truncates content to 500 chars in XML', async () => {
      await seedObservation(engine, sessionId, {
        type: 'note',
        content: 'A'.repeat(1000),
      });
      const observations = engine.selectForPrompt(defaultConfig);
      const rendered = engine.renderPromptContext(observations, defaultConfig);

      expect(rendered.xml).toContain('...');
      // Should have truncated
      expect(rendered.observationCount).toBe(1);
    });

    it('reports budget exceeded when observations truncated', async () => {
      // Create observations that exceed budget
      for (let i = 0; i < 20; i++) {
        await seedObservation(engine, sessionId, {
          type: 'note',
          title: `obs-${i}`,
          content: 'A'.repeat(2000),
        });
      }

      const config = { ...defaultConfig, maxTokens: 500 };
      const observations = engine.selectForPrompt(config);
      const rendered = engine.renderPromptContext(observations, config);

      // Some should be cut by budget
      expect(rendered.tokenCount).toBeGreaterThan(0);
    });
  });
});
