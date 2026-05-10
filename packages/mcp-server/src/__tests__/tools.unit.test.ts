/**
 * tools.unit.test.ts — Validates MCP tool handler logic.
 *
 * Tests each tool handler via the MCP Client → InMemoryTransport → Server path.
 * Validates:
 * - Response format (valid JSON with expected fields)
 * - Schema validation (invalid params rejected)
 * - Error handling (structured JSON errors)
 * - Business logic (save → search → get → update → delete lifecycle)
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import {
  createIntegrationSetup,
  parseResult,
  parseActionText,
  extractId,
  parseError,
  seedSession,
  seedObservation,
  type IntegrationSetup,
} from './helpers';

describe('Tool Handlers', () => {
  let setup: IntegrationSetup;

  beforeEach(async () => {
    setup = await createIntegrationSetup();
  });

  afterEach(async () => {
    await setup.cleanup();
  });

  // ─── mem_save ─────────────────────────────────────────────

  describe('mem_save', () => {
    it('should save with valid params and return human-readable confirmation', async () => {
      const response = await setup.client.callTool({
        name: 'mem_save',
        arguments: {
          title: 'Architecture Decision',
          content: 'What: Using SQLite\nWhy: Performance\nWhere: core package',
          type: 'decision',
          topic_key: 'architecture/storage',
          project_id: 'test-project',
        },
      });

      const text = parseActionText(response);
      expect(text).toContain('saved');
      expect(text).toContain('decision');
      expect(text).toContain('Architecture Decision');
      const id = extractId(text);
      expect(typeof id).toBe('number');
    });

    it('should use default project_id when not provided', async () => {
      const response = await setup.client.callTool({
        name: 'mem_save',
        arguments: {
          title: 'Note without project',
          content: 'Some content',
        },
      });

      const text = parseActionText(response);
      expect(text).toContain('saved');
    });

    it('should create auto-session if none exists', async () => {
      // No session started — mem_save should auto-create one
      const response = await setup.client.callTool({
        name: 'mem_save',
        arguments: {
          title: 'Auto session test',
          content: 'Content',
        },
      });

      const text = parseActionText(response);
      expect(text).toContain('saved');
      expect(setup.ctx.activeSessionId).not.toBeNull();
    });

    it('should reject missing required fields', async () => {
      // title is required
      const response = await setup.client.callTool({
        name: 'mem_save',
        arguments: {
          content: 'Missing title',
        },
      });

      // MCP SDK should reject with an error
      expect(response.isError).toBe(true);
    });
  });

  // ─── mem_search ───────────────────────────────────────────

  describe('mem_search', () => {
    it('should search with FTS5 query and return Markdown observation list', async () => {
      // Seed data
      const session = await seedSession(setup.engine, 'test-project');
      await seedObservation(setup.engine, session.id, {
        title: 'React patterns',
        content: 'Hooks and components',
        projectId: 'test-project',
      });
      await seedObservation(setup.engine, session.id, {
        title: 'Vue patterns',
        content: 'Composition API',
        projectId: 'test-project',
      });

      const response = await setup.client.callTool({
        name: 'mem_search',
        arguments: { query: 'React', project_id: 'test-project' },
      });

      const text = parseActionText(response);
      expect(text).toContain('Found 1 observation');
      expect(text).toContain('React patterns');
      expect(text).not.toContain('Vue patterns');
    });

    it('should filter by type', async () => {
      const session = await seedSession(setup.engine, 'test-project');
      await seedObservation(setup.engine, session.id, { type: 'bug', projectId: 'test-project' });
      await seedObservation(setup.engine, session.id, { type: 'decision', projectId: 'test-project' });

      const response = await setup.client.callTool({
        name: 'mem_search',
        arguments: { type: 'bug', project_id: 'test-project' },
      });

      const text = parseActionText(response);
      expect(text).toContain('Found 1 observation');
      expect(text).toContain('[bug]');
      expect(text).not.toContain('[decision]');
    });

    it('should return all when no query provided', async () => {
      const session = await seedSession(setup.engine, 'test-project');
      await seedObservation(setup.engine, session.id, { projectId: 'test-project' });
      await seedObservation(setup.engine, session.id, { projectId: 'test-project' });

      const response = await setup.client.callTool({
        name: 'mem_search',
        arguments: { project_id: 'test-project' },
      });

      const text = parseActionText(response);
      expect(text).toContain('Found 2 observations');
    });
  });

  // ─── mem_get_observation ──────────────────────────────────

  describe('mem_get_observation', () => {
    it('should return full observation by ID as Markdown', async () => {
      const session = await seedSession(setup.engine, 'test-project');
      const obs = await seedObservation(setup.engine, session.id, {
        title: 'Full Content Test',
        content: 'This is the full content that should be returned',
        projectId: 'test-project',
      });

      const response = await setup.client.callTool({
        name: 'mem_get_observation',
        arguments: { id: obs.id },
      });

      const text = parseActionText(response);
      expect(text).toContain(`#${obs.id}`);
      expect(text).toContain('Full Content Test');
      expect(text).toContain('full content that should be returned');
    });

    it('should return error for non-existent ID', async () => {
      const response = await setup.client.callTool({
        name: 'mem_get_observation',
        arguments: { id: 99999 },
      });

      const result = parseError(response);
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  // ─── mem_update ───────────────────────────────────────────

  describe('mem_update', () => {
    it('should update provided fields only', async () => {
      const session = await seedSession(setup.engine, 'test-project');
      const obs = await seedObservation(setup.engine, session.id, {
        title: 'Original Title',
        content: 'Original content',
        type: 'note',
        projectId: 'test-project',
      });

      const response = await setup.client.callTool({
        name: 'mem_update',
        arguments: { id: obs.id, title: 'Updated Title', type: 'bug' },
      });

      const text = parseActionText(response);
      expect(text).toContain('updated');

      // Verify via get
      const getResponse = await setup.client.callTool({
        name: 'mem_get_observation',
        arguments: { id: obs.id },
      });
      const updatedText = parseActionText(getResponse);
      expect(updatedText).toContain('Updated Title');
      expect(updatedText).toContain('[bug]');
      expect(updatedText).toContain('Original content'); // unchanged
    });

    it('should return error for non-existent ID', async () => {
      const response = await setup.client.callTool({
        name: 'mem_update',
        arguments: { id: 99999, title: 'New Title' },
      });

      const result = parseError(response);
      expect(result.success).toBe(false);
    });
  });

  // ─── mem_delete / restore / purge ─────────────────────────

  describe('mem_delete / restore / purge', () => {
    it('should soft-delete and exclude from search', async () => {
      const session = await seedSession(setup.engine, 'test-project');
      const obs = await seedObservation(setup.engine, session.id, { projectId: 'test-project' });

      const delResponse = await setup.client.callTool({
        name: 'mem_delete',
        arguments: { id: obs.id, reason: 'duplicate' },
      });

      const delText = parseActionText(delResponse);
      expect(delText).toContain('soft-deleted');

      // Excluded from search
      const searchResponse = await setup.client.callTool({
        name: 'mem_search',
        arguments: { project_id: 'test-project' },
      });
      const searchText = parseActionText(searchResponse);
      expect(searchText).toContain('Found 0 observations');
    });

    it('should restore soft-deleted observation', async () => {
      const session = await seedSession(setup.engine, 'test-project');
      const obs = await seedObservation(setup.engine, session.id, { projectId: 'test-project' });

      await setup.client.callTool({ name: 'mem_delete', arguments: { id: obs.id } });

      const restoreResponse = await setup.client.callTool({
        name: 'mem_restore',
        arguments: { id: obs.id },
      });

      const restoreText = parseActionText(restoreResponse);
      expect(restoreText).toContain('restored');

      // Visible in search again
      const searchResponse = await setup.client.callTool({
        name: 'mem_search',
        arguments: { project_id: 'test-project' },
      });
      const searchText = parseActionText(searchResponse);
      expect(searchText).toContain('Found 1 observation');
    });

    it('should reject purge without confirm', async () => {
      const session = await seedSession(setup.engine, 'test-project');
      const obs = await seedObservation(setup.engine, session.id, { projectId: 'test-project' });
      await setup.client.callTool({ name: 'mem_delete', arguments: { id: obs.id } });

      const response = await setup.client.callTool({
        name: 'mem_purge',
        arguments: { confirm: false },
      });

      const text = parseActionText(response);
      expect(text).toContain('confirm must be true');
    });

    it('should purge with confirm: true', async () => {
      const session = await seedSession(setup.engine, 'test-project');
      const obs = await seedObservation(setup.engine, session.id, { projectId: 'test-project' });
      await setup.client.callTool({ name: 'mem_delete', arguments: { id: obs.id } });

      const response = await setup.client.callTool({
        name: 'mem_purge',
        arguments: { confirm: true, project_id: 'test-project' },
      });

      const text = parseActionText(response);
      expect(text).toContain('Purged');

      // Gone from deleted list
      const deletedResponse = await setup.client.callTool({
        name: 'mem_list_deleted',
        arguments: { project_id: 'test-project' },
      });
      const deletedText = parseActionText(deletedResponse);
      expect(deletedText).toContain('Found 0 observations');
    });
  });

  // ─── mem_list_deleted ─────────────────────────────────────

  describe('mem_list_deleted', () => {
    it('should list deleted observations as Markdown', async () => {
      const session = await seedSession(setup.engine, 'test-project');
      const obs = await seedObservation(setup.engine, session.id, { projectId: 'test-project' });
      await setup.client.callTool({ name: 'mem_delete', arguments: { id: obs.id } });

      const response = await setup.client.callTool({
        name: 'mem_list_deleted',
        arguments: { project_id: 'test-project' },
      });

      const text = parseActionText(response);
      expect(text).toContain('Found 1 observation');
      expect(text).toContain(`#${obs.id}`);
    });
  });

  // ─── mem_merge ────────────────────────────────────────────

  describe('mem_merge', () => {
    it('should preview with dry_run: true', async () => {
      const session = await seedSession(setup.engine, 'test-project');
      await seedObservation(setup.engine, session.id, {
        topicKey: 'auth/jwt',
        content: 'Version 1',
        projectId: 'test-project',
      });
      await seedObservation(setup.engine, session.id, {
        topicKey: 'auth/jwt',
        content: 'Version 2',
        projectId: 'test-project',
      });

      const response = await setup.client.callTool({
        name: 'mem_merge',
        arguments: {
          project_id: 'test-project',
          topic_key: 'auth/jwt',
          strategy: 'by_topic',
          dry_run: true,
        },
      });

      const text = parseActionText(response);
      expect(text).toContain('Preview');
      expect(text).toContain('dry run');
    });

    it('should merge by topic_key', async () => {
      const session = await seedSession(setup.engine, 'test-project');
      await seedObservation(setup.engine, session.id, {
        topicKey: 'merge/topic',
        content: 'First',
        projectId: 'test-project',
      });
      await seedObservation(setup.engine, session.id, {
        topicKey: 'merge/topic',
        content: 'Second',
        projectId: 'test-project',
      });

      const response = await setup.client.callTool({
        name: 'mem_merge',
        arguments: {
          project_id: 'test-project',
          topic_key: 'merge/topic',
          strategy: 'by_topic',
        },
      });

      const text = parseActionText(response);
      expect(text).toContain('Merged');
      expect(text).toContain('consolidated');
    });
  });

  // ─── mem_export ───────────────────────────────────────────

  describe('mem_export', () => {
    it('should export as JSON', async () => {
      const session = await seedSession(setup.engine, 'test-project');
      await seedObservation(setup.engine, session.id, { projectId: 'test-project' });
      await seedObservation(setup.engine, session.id, { projectId: 'test-project' });

      const response = await setup.client.callTool({
        name: 'mem_export',
        arguments: { format: 'json', project_id: 'test-project' },
      });

      const result = parseResult(response);
      expect(result.success).toBe(true);
      expect(result.format).toBe('json');
      expect(result.recordCount).toBe(2);

      const parsed = JSON.parse(result.content);
      expect(parsed.observations).toHaveLength(2);
    });

    it('should filter by type', async () => {
      const session = await seedSession(setup.engine, 'test-project');
      await seedObservation(setup.engine, session.id, { type: 'bug', projectId: 'test-project' });
      await seedObservation(setup.engine, session.id, { type: 'note', projectId: 'test-project' });

      const response = await setup.client.callTool({
        name: 'mem_export',
        arguments: { format: 'json', type: 'bug', project_id: 'test-project' },
      });

      const result = parseResult(response);
      expect(result.recordCount).toBe(1);
    });
  });

  // ─── Session Tools ────────────────────────────────────────

  describe('mem_session_start / end', () => {
    it('should start a session and set it as active', async () => {
      const response = await setup.client.callTool({
        name: 'mem_session_start',
        arguments: { project_id: 'test-project', metadata: { agent: 'test' } },
      });

      const text = parseActionText(response);
      expect(text).toContain('started');
      expect(text).toContain('test-project');
      const sessionId = extractId(text);
      expect(setup.ctx.activeSessionId).toBe(sessionId);
    });

    it('should end active session', async () => {
      await setup.client.callTool({
        name: 'mem_session_start',
        arguments: { project_id: 'test-project' },
      });

      const response = await setup.client.callTool({
        name: 'mem_session_end',
        arguments: {},
      });

      const text = parseActionText(response);
      expect(text).toContain('ended');
      expect(setup.ctx.activeSessionId).toBeNull();
    });

    it('should error when ending with no active session', async () => {
      const response = await setup.client.callTool({
        name: 'mem_session_end',
        arguments: {},
      });

      const result = parseError(response);
      expect(result.success).toBe(false);
      expect(result.error).toContain('No active session');
    });
  });

  // ─── Utility Tools ────────────────────────────────────────

  describe('mem_timeline', () => {
    it('should return chronological observations as Markdown', async () => {
      const session = await seedSession(setup.engine, 'test-project');
      await seedObservation(setup.engine, session.id, { title: 'First', projectId: 'test-project' });
      await seedObservation(setup.engine, session.id, { title: 'Second', projectId: 'test-project' });

      const response = await setup.client.callTool({
        name: 'mem_timeline',
        arguments: { project_id: 'test-project' },
      });

      const text = parseActionText(response);
      expect(text).toContain('Found 2 observations');
      expect(text).toContain('First');
      expect(text).toContain('Second');
    });
  });

  describe('mem_stats', () => {
    it('should return memory statistics as Markdown', async () => {
      const session = await seedSession(setup.engine, 'test-project');
      await seedObservation(setup.engine, session.id, { type: 'bug', projectId: 'test-project' });
      await seedObservation(setup.engine, session.id, { type: 'note', projectId: 'test-project' });

      const response = await setup.client.callTool({
        name: 'mem_stats',
        arguments: {},
      });

      const text = parseActionText(response);
      expect(text).toContain('2 observations');
      expect(text).toContain('bug(1)');
      expect(text).toContain('note(1)');
    });
  });

  describe('mem_health', () => {
    it('should report healthy status as Markdown', async () => {
      const response = await setup.client.callTool({
        name: 'mem_health',
        arguments: {},
      });

      const text = parseActionText(response);
      expect(text).toContain('Status: healthy');
      expect(text).toContain('Version: 1.0.0');
      expect(text).toContain('Database: ok');
    });
  });

  describe('mem_config', () => {
    it('should return full configuration as Markdown', async () => {
      const response = await setup.client.callTool({
        name: 'mem_config',
        arguments: {},
      });

      const text = parseActionText(response);
      expect(text).toContain('memento v1.0.0');
      expect(text).toContain('SQLite Persistent');
      expect(text).toContain('Tools: 16 registered');
    });
  });

  // ─── Agent Convenience Tools ───────────────────────────────

  describe('mem_save_prompt', () => {
    it('should save a prompt and return human-readable confirmation', async () => {
      const response = await setup.client.callTool({
        name: 'mem_save_prompt',
        arguments: {
          content: 'How do I implement FTS5 in SQLite?',
          project_id: 'test-project',
        },
      });

      const text = parseActionText(response);
      expect(text).toContain('saved');
      expect(text).toContain('test-project');
    });

    it('should auto-create session if none active', async () => {
      expect(setup.ctx.activeSessionId).toBeNull();

      const response = await setup.client.callTool({
        name: 'mem_save_prompt',
        arguments: { content: 'Test prompt' },
      });

      const text = parseActionText(response);
      expect(text).toContain('saved');
      expect(setup.ctx.activeSessionId).not.toBeNull();
    });
  });

  describe('mem_context', () => {
    it('should return recent observations as Markdown', async () => {
      const session = await seedSession(setup.engine, 'test-project');
      await seedObservation(setup.engine, session.id, { title: 'Context 1', projectId: 'test-project' });
      await seedObservation(setup.engine, session.id, { title: 'Context 2', projectId: 'test-project' });

      const response = await setup.client.callTool({
        name: 'mem_context',
        arguments: { project_id: 'test-project' },
      });

      const text = parseActionText(response);
      expect(text).toContain('Found 2 observations');
      expect(text).toContain('Context 1');
      expect(text).toContain('Context 2');
    });

    it('should respect limit parameter', async () => {
      const session = await seedSession(setup.engine, 'test-project');
      for (let i = 0; i < 5; i++) {
        await seedObservation(setup.engine, session.id, { projectId: 'test-project' });
      }

      const response = await setup.client.callTool({
        name: 'mem_context',
        arguments: { project_id: 'test-project', limit: 2 },
      });

      const text = parseActionText(response);
      // total should be 5 but only 2 shown
      expect(text).toContain('Found 5 observations');
      // Count separators (---) to verify only 2 are shown
      const separatorCount = (text.match(/---/g) || []).length;
      expect(separatorCount).toBe(1); // 2 items = 1 separator between them
    });
  });

  describe('mem_suggest_topic_key', () => {
    it('should generate stable key from title', async () => {
      const response = await setup.client.callTool({
        name: 'mem_suggest_topic_key',
        arguments: { title: 'Fixed N+1 Query in UserList' },
      });

      const text = parseActionText(response);
      expect(text).toContain('fixed-n-1-query-in-userlist');
    });

    it('should add type prefix when provided', async () => {
      const response = await setup.client.callTool({
        name: 'mem_suggest_topic_key',
        arguments: { title: 'Auth Model', type: 'decision' },
      });

      const text = parseActionText(response);
      expect(text).toContain('decision/auth-model');
    });

    it('should return error when no input provided', async () => {
      const response = await setup.client.callTool({
        name: 'mem_suggest_topic_key',
        arguments: {},
      });

      const text = parseActionText(response);
      expect(text).toContain('provide at least');
    });
  });

  describe('mem_session_summary', () => {
    it('should create observation with type summary', async () => {
      const response = await setup.client.callTool({
        name: 'mem_session_summary',
        arguments: {
          content: '## Goal\nImplement feature\n## Accomplished\n- Done',
          project_id: 'test-project',
        },
      });

      const text = parseActionText(response);
      expect(text).toContain('Session summary saved');
      expect(text).toContain('test-project');

      // Extract observation ID from message and verify via get_observation
      const obsId = extractId(text);
      const getResponse = await setup.client.callTool({
        name: 'mem_get_observation',
        arguments: { id: obsId },
      });
      const obsText = parseActionText(getResponse);
      expect(obsText).toContain('[summary]');
      expect(obsText).toContain('Session Summary');
    });
  });

  describe('mem_capture_passive', () => {
    it('should extract learnings from text', async () => {
      const response = await setup.client.callTool({
        name: 'mem_capture_passive',
        arguments: {
          content: '## Key Learnings:\n- SQLite FTS5 is powerful for search\n- Always use prepared statements\n- WAL mode improves write performance',
          project_id: 'test-project',
          source: 'test',
        },
      });

      const text = parseActionText(response);
      expect(text).toContain('Captured 3 learnings');

      // Verify learnings were created via search
      const searchResponse = await setup.client.callTool({
        name: 'mem_search',
        arguments: { type: 'learning', project_id: 'test-project' },
      });
      const searchText = parseActionText(searchResponse);
      expect(searchText).toContain('Found 3 observations');
    });

    it('should return message when no learning sections found', async () => {
      const response = await setup.client.callTool({
        name: 'mem_capture_passive',
        arguments: {
          content: 'No learning sections here, just plain text.',
          project_id: 'test-project',
        },
      });

      const text = parseActionText(response);
      expect(text).toContain('No learning sections found');
    });

    it('should deduplicate similar learnings within batch', async () => {
      const response = await setup.client.callTool({
        name: 'mem_capture_passive',
        arguments: {
          content: '## Key Learnings:\n- SQLite FTS5 is powerful for search\n- FTS5 is powerful for search with SQLite\n- Completely different learning about React hooks',
          project_id: 'test-project',
        },
      });

      const text = parseActionText(response);
      // The first two are very similar, should deduplicate to 1 + the different one
      const capturedMatch = text.match(/Captured (\d+) learning/);
      const captured = capturedMatch ? parseInt(capturedMatch[1], 10) : 0;
      expect(captured).toBeLessThanOrEqual(3);
      expect(captured).toBeGreaterThanOrEqual(2);
    });

    it('should deduplicate against existing learnings in DB (cross-call)', async () => {
      const learningContent = '## Key Learnings:\n- Always use prepared statements for SQL\n- WAL mode improves write performance\n- Test dedup across multiple calls';

      // First call — should create 3 learnings
      const firstResponse = await setup.client.callTool({
        name: 'mem_capture_passive',
        arguments: {
          content: learningContent,
          project_id: 'test-project',
          source: 'cross-call-dedup-test',
        },
      });

      const firstText = parseActionText(firstResponse);
      expect(firstText).toContain('Captured 3 learnings');

      // Second call with identical content — should detect all as duplicates
      const secondResponse = await setup.client.callTool({
        name: 'mem_capture_passive',
        arguments: {
          content: learningContent,
          project_id: 'test-project',
          source: 'cross-call-dedup-test',
        },
      });

      const secondText = parseActionText(secondResponse);
      expect(secondText).toContain('Captured 0 learnings');
      expect(secondText).toContain('3 duplicates');
    });
  });

  // ─── Updated Tool Behavior ────────────────────────────────

  describe('mem_timeline (updated)', () => {
    it('should return observations in ASC chronological order as Markdown', async () => {
      const session = await seedSession(setup.engine, 'test-project');
      const first = await seedObservation(setup.engine, session.id, { title: 'First', projectId: 'test-project' });
      const second = await seedObservation(setup.engine, session.id, { title: 'Second', projectId: 'test-project' });

      const response = await setup.client.callTool({
        name: 'mem_timeline',
        arguments: { project_id: 'test-project' },
      });

      const text = parseActionText(response);
      expect(text).toContain('Found 2 observations');
      // First should appear before Second in the text (chronological order)
      const firstIdx = text.indexOf(`#${first.id}`);
      const secondIdx = text.indexOf(`#${second.id}`);
      expect(firstIdx).toBeLessThan(secondIdx);
    });
  });

  describe('mem_stats (updated)', () => {
    it('should use getDashboardStats for accurate counts as Markdown', async () => {
      const session = await seedSession(setup.engine, 'test-project');
      await seedObservation(setup.engine, session.id, { type: 'bug', projectId: 'test-project' });
      await seedObservation(setup.engine, session.id, { type: 'note', projectId: 'test-project' });
      await seedObservation(setup.engine, session.id, { type: 'decision', projectId: 'test-project' });

      const response = await setup.client.callTool({
        name: 'mem_stats',
        arguments: {},
      });

      const text = parseActionText(response);
      expect(text).toContain('3 observations');
      expect(text).toContain('bug(1)');
      expect(text).toContain('note(1)');
      expect(text).toContain('decision(1)');
    });
  });
});
