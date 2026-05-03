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
    it('should save with valid params and return { id, uuid, success }', async () => {
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

      const result = parseResult(response);
      expect(result.success).toBe(true);
      expect(result.id).toBeDefined();
      expect(result.uuid).toBeDefined();
      expect(typeof result.id).toBe('number');
    });

    it('should use default project_id when not provided', async () => {
      const response = await setup.client.callTool({
        name: 'mem_save',
        arguments: {
          title: 'Note without project',
          content: 'Some content',
        },
      });

      const result = parseResult(response);
      expect(result.success).toBe(true);
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

      const result = parseResult(response);
      expect(result.success).toBe(true);
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
    it('should search with FTS5 query and return { total, observations }', async () => {
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

      const result = parseResult(response);
      expect(result.total).toBe(1);
      expect(result.observations).toHaveLength(1);
      expect(result.observations[0].title).toBe('React patterns');
    });

    it('should filter by type', async () => {
      const session = await seedSession(setup.engine, 'test-project');
      await seedObservation(setup.engine, session.id, { type: 'bug', projectId: 'test-project' });
      await seedObservation(setup.engine, session.id, { type: 'decision', projectId: 'test-project' });

      const response = await setup.client.callTool({
        name: 'mem_search',
        arguments: { type: 'bug', project_id: 'test-project' },
      });

      const result = parseResult(response);
      expect(result.total).toBe(1);
      expect(result.observations[0].type).toBe('bug');
    });

    it('should return all when no query provided', async () => {
      const session = await seedSession(setup.engine, 'test-project');
      await seedObservation(setup.engine, session.id, { projectId: 'test-project' });
      await seedObservation(setup.engine, session.id, { projectId: 'test-project' });

      const response = await setup.client.callTool({
        name: 'mem_search',
        arguments: { project_id: 'test-project' },
      });

      const result = parseResult(response);
      expect(result.total).toBe(2);
    });
  });

  // ─── mem_get_observation ──────────────────────────────────

  describe('mem_get_observation', () => {
    it('should return full observation by ID', async () => {
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

      const result = parseResult(response);
      expect(result.id).toBe(obs.id);
      expect(result.title).toBe('Full Content Test');
      expect(result.content).toContain('full content');
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

      const result = parseResult(response);
      expect(result.success).toBe(true);

      // Verify via get
      const getResponse = await setup.client.callTool({
        name: 'mem_get_observation',
        arguments: { id: obs.id },
      });
      const updated = parseResult(getResponse);
      expect(updated.title).toBe('Updated Title');
      expect(updated.type).toBe('bug');
      expect(updated.content).toBe('Original content'); // unchanged
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

      const delResult = parseResult(delResponse);
      expect(delResult.success).toBe(true);
      expect(delResult.deleted).toBe(true);

      // Excluded from search
      const searchResponse = await setup.client.callTool({
        name: 'mem_search',
        arguments: { project_id: 'test-project' },
      });
      const searchResult = parseResult(searchResponse);
      expect(searchResult.total).toBe(0);
    });

    it('should restore soft-deleted observation', async () => {
      const session = await seedSession(setup.engine, 'test-project');
      const obs = await seedObservation(setup.engine, session.id, { projectId: 'test-project' });

      await setup.client.callTool({ name: 'mem_delete', arguments: { id: obs.id } });

      const restoreResponse = await setup.client.callTool({
        name: 'mem_restore',
        arguments: { id: obs.id },
      });

      const restoreResult = parseResult(restoreResponse);
      expect(restoreResult.success).toBe(true);
      expect(restoreResult.restored).toBe(true);

      // Visible in search again
      const searchResponse = await setup.client.callTool({
        name: 'mem_search',
        arguments: { project_id: 'test-project' },
      });
      const searchResult = parseResult(searchResponse);
      expect(searchResult.total).toBe(1);
    });

    it('should reject purge without confirm', async () => {
      const session = await seedSession(setup.engine, 'test-project');
      const obs = await seedObservation(setup.engine, session.id, { projectId: 'test-project' });
      await setup.client.callTool({ name: 'mem_delete', arguments: { id: obs.id } });

      const response = await setup.client.callTool({
        name: 'mem_purge',
        arguments: { confirm: false },
      });

      const result = parseResult(response);
      expect(result.success).toBe(false);
      expect(result.error).toContain('confirm must be true');
    });

    it('should purge with confirm: true', async () => {
      const session = await seedSession(setup.engine, 'test-project');
      const obs = await seedObservation(setup.engine, session.id, { projectId: 'test-project' });
      await setup.client.callTool({ name: 'mem_delete', arguments: { id: obs.id } });

      const response = await setup.client.callTool({
        name: 'mem_purge',
        arguments: { confirm: true, project_id: 'test-project' },
      });

      const result = parseResult(response);
      expect(result.success).toBe(true);
      expect(result.purgedCount).toBe(1);

      // Gone from deleted list
      const deletedResponse = await setup.client.callTool({
        name: 'mem_list_deleted',
        arguments: { project_id: 'test-project' },
      });
      const deleted = parseResult(deletedResponse);
      expect(deleted.total).toBe(0);
    });
  });

  // ─── mem_list_deleted ─────────────────────────────────────

  describe('mem_list_deleted', () => {
    it('should list deleted observations', async () => {
      const session = await seedSession(setup.engine, 'test-project');
      const obs = await seedObservation(setup.engine, session.id, { projectId: 'test-project' });
      await setup.client.callTool({ name: 'mem_delete', arguments: { id: obs.id } });

      const response = await setup.client.callTool({
        name: 'mem_list_deleted',
        arguments: { project_id: 'test-project' },
      });

      const result = parseResult(response);
      expect(result.total).toBe(1);
      expect(result.observations[0].id).toBe(obs.id);
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

      const result = parseResult(response);
      expect(result.success).toBe(true);
      expect(result.dryRun).toBe(true);
      expect(result.mergeCount).toBe(1);
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

      const result = parseResult(response);
      expect(result.success).toBe(true);
      expect(result.dryRun).toBe(false);
      expect(result.mergeCount).toBe(1);
      expect(result.results[0].originalCount).toBe(2);
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

      const result = parseResult(response);
      expect(result.success).toBe(true);
      expect(result.id).toBeDefined();
      expect(result.uuid).toBeDefined();
      expect(setup.ctx.activeSessionId).toBe(result.id);
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

      const result = parseResult(response);
      expect(result.success).toBe(true);
      expect(result.endedAt).toBeDefined();
      expect(result.endedAt).not.toBeNull();
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
    it('should return chronological observations', async () => {
      const session = await seedSession(setup.engine, 'test-project');
      await seedObservation(setup.engine, session.id, { title: 'First', projectId: 'test-project' });
      await seedObservation(setup.engine, session.id, { title: 'Second', projectId: 'test-project' });

      const response = await setup.client.callTool({
        name: 'mem_timeline',
        arguments: { project_id: 'test-project' },
      });

      const result = parseResult(response);
      expect(result.total).toBe(2);
      expect(result.observations).toHaveLength(2);
    });
  });

  describe('mem_stats', () => {
    it('should return memory statistics', async () => {
      const session = await seedSession(setup.engine, 'test-project');
      await seedObservation(setup.engine, session.id, { type: 'bug', projectId: 'test-project' });
      await seedObservation(setup.engine, session.id, { type: 'note', projectId: 'test-project' });

      const response = await setup.client.callTool({
        name: 'mem_stats',
        arguments: {},
      });

      const result = parseResult(response);
      expect(result.totalObservations).toBe(2);
      expect(result.byType).toBeDefined();
      expect(result.byProject).toBeDefined();
    });
  });

  describe('mem_health', () => {
    it('should report healthy status', async () => {
      const response = await setup.client.callTool({
        name: 'mem_health',
        arguments: {},
      });

      const result = parseResult(response);
      expect(result.status).toBe('healthy');
      expect(result.version).toBe('1.0.0');
      expect(result.databaseHealth).toBe('ok');
    });
  });

  describe('mem_config', () => {
    it('should return full configuration', async () => {
      const response = await setup.client.callTool({
        name: 'mem_config',
        arguments: {},
      });

      const result = parseResult(response);
      expect(result.name).toBe('memento');
      expect(result.version).toBe('1.0.0');
      expect(result.storage).toBeDefined();
      expect(result.tools).toHaveLength(18);
    });
  });
});
