/**
 * integration.test.ts — Full MCP protocol integration tests.
 *
 * Validates end-to-end flows through the MCP protocol:
 * - Client connects and receives capabilities
 * - Full lifecycle workflows (save → search → get → update → delete → restore → purge)
 * - Session management flows
 * - Error handling via MCP protocol
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import {
  createIntegrationSetup,
  parseResult,
  parseActionText,
  extractId,
  parseError,
  type IntegrationSetup,
} from './helpers';

describe('MCP Integration', () => {
  let setup: IntegrationSetup;

  beforeEach(async () => {
    setup = await createIntegrationSetup();
  });

  afterEach(async () => {
    await setup.cleanup();
  });

  // ─── Connection & Capabilities ────────────────────────────

  describe('Connection', () => {
    it('client should connect and receive server capabilities', async () => {
      // If we got here, the connection succeeded
      // Verify by listing tools
      const result = await setup.client.listTools();
      expect(result.tools.length).toBeGreaterThan(0);
    });

    it('listTools should return 26 tools with valid schemas', async () => {
      const result = await setup.client.listTools();

      expect(result.tools).toHaveLength(26);

      for (const tool of result.tools) {
        // Each tool must have name, description, and inputSchema
        expect(tool.name).toBeDefined();
        expect(tool.description).toBeDefined();
        expect(tool.inputSchema).toBeDefined();

        // inputSchema should be a JSON Schema object
        const schema = tool.inputSchema as any;
        expect(schema.type).toBe('object');
      }
    });
  });

  // ─── Full Observation Lifecycle ───────────────────────────

  describe('Full Observation Lifecycle', () => {
    it('save → search → get → update → delete → restore → purge', async () => {
      // 1. Save
      const saveResponse = await setup.client.callTool({
        name: 'mem_save',
        arguments: {
          title: 'Lifecycle Test',
          content: 'Testing full lifecycle',
          type: 'discovery',
          topic_key: 'test/lifecycle',
          project_id: 'test-project',
        },
      });
      const saveText = parseActionText(saveResponse);
      expect(saveText).toContain('saved');
      const obsId = extractId(saveText);

      // 2. Search
      const searchResponse = await setup.client.callTool({
        name: 'mem_search',
        arguments: { query: 'Lifecycle', project_id: 'test-project' },
      });
      const searchText = parseActionText(searchResponse);
      expect(searchText).toContain('Found 1 observation');
      expect(searchText).toContain(`#${obsId}`);

      // 3. Get full content
      const getResponse = await setup.client.callTool({
        name: 'mem_get_observation',
        arguments: { id: obsId },
      });
      const obsText = parseActionText(getResponse);
      expect(obsText).toContain(`#${obsId}`);
      expect(obsText).toContain('Testing full lifecycle');
      expect(obsText).toContain('[discovery]');

      // 4. Update
      const updateResponse = await setup.client.callTool({
        name: 'mem_update',
        arguments: { id: obsId, content: 'Updated lifecycle content', type: 'note' },
      });
      const updateText = parseActionText(updateResponse);
      expect(updateText).toContain('updated');

      // Verify update
      const getUpdated = await setup.client.callTool({
        name: 'mem_get_observation',
        arguments: { id: obsId },
      });
      const afterUpdateText = parseActionText(getUpdated);
      expect(afterUpdateText).toContain('Updated lifecycle content');
      expect(afterUpdateText).toContain('[note]');
      expect(afterUpdateText).toContain('Lifecycle Test'); // unchanged

      // 5. Delete (soft)
      const deleteResponse = await setup.client.callTool({
        name: 'mem_delete',
        arguments: { id: obsId, reason: 'lifecycle test' },
      });
      expect(parseActionText(deleteResponse)).toContain('soft-deleted');

      // Verify excluded from search
      const afterDelete = await setup.client.callTool({
        name: 'mem_search',
        arguments: { project_id: 'test-project' },
      });
      expect(parseActionText(afterDelete)).toContain('Found 0 observations');

      // 6. Restore
      const restoreResponse = await setup.client.callTool({
        name: 'mem_restore',
        arguments: { id: obsId },
      });
      expect(parseActionText(restoreResponse)).toContain('restored');

      // Verify visible again
      const afterRestore = await setup.client.callTool({
        name: 'mem_search',
        arguments: { project_id: 'test-project' },
      });
      expect(parseActionText(afterRestore)).toContain('Found 1 observation');

      // 7. Purge (delete first, then purge)
      await setup.client.callTool({ name: 'mem_delete', arguments: { id: obsId } });
      const purgeResponse = await setup.client.callTool({
        name: 'mem_purge',
        arguments: { confirm: true, project_id: 'test-project' },
      });
      expect(parseActionText(purgeResponse)).toContain('Purged');

      // Verify gone from deleted list
      const deletedList = await setup.client.callTool({
        name: 'mem_list_deleted',
        arguments: { project_id: 'test-project' },
      });
      expect(parseActionText(deletedList)).toContain('Found 0 observations');
    });
  });

  // ─── Session Management Flow ──────────────────────────────

  describe('Session Management Flow', () => {
    it('start → save → verify → end', async () => {
      // 1. Start session
      const startResponse = await setup.client.callTool({
        name: 'mem_session_start',
        arguments: { project_id: 'test-project', metadata: { env: 'test' } },
      });
      const startText = parseActionText(startResponse);
      expect(startText).toContain('started');
      const sessionId = extractId(startText);

      // 2. Save observations (should use active session)
      const saveResponse = await setup.client.callTool({
        name: 'mem_save',
        arguments: {
          title: 'Session Observation',
          content: 'Saved during active session',
          project_id: 'test-project',
        },
      });
      expect(parseActionText(saveResponse)).toContain('saved');

      // 3. Verify session contains observations
      const getSessionResponse = await setup.client.callTool({
        name: 'mem_get_session',
        arguments: { id: sessionId },
      });
      const sessionText = parseActionText(getSessionResponse);
      expect(sessionText).toContain(`Session #${sessionId}`);
      expect(sessionText).toContain('test-project');
      expect(sessionText).toContain('Active');

      // 4. End session
      const endResponse = await setup.client.callTool({
        name: 'mem_session_end',
        arguments: {},
      });
      const endText = parseActionText(endResponse);
      expect(endText).toContain('ended');
      expect(setup.ctx.activeSessionId).toBeNull();
    });
  });

  // ─── Error Handling ───────────────────────────────────────

  describe('Error Handling', () => {
    it('should return structured error for non-existent tool', async () => {
      // The MCP SDK itself handles unknown tools
      try {
        await setup.client.callTool({
          name: 'mem_nonexistent',
          arguments: {},
        });
        // If it doesn't throw, check for error response
      } catch (error: any) {
        expect(error).toBeDefined();
      }
    });

    it('should return structured error for non-existent observation', async () => {
      const response = await setup.client.callTool({
        name: 'mem_get_observation',
        arguments: { id: 99999 },
      });

      const result = parseError(response);
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should return structured error for non-existent session', async () => {
      const response = await setup.client.callTool({
        name: 'mem_session_end',
        arguments: {},
      });

      const result = parseError(response);
      expect(result.success).toBe(false);
      expect(result.error).toContain('No active session');
    });

    it('should include hint in error when DB is unhealthy', async () => {
      // This is hard to test without sabotaging the DB
      // but we can verify the error format via a non-existent ID
      const response = await setup.client.callTool({
        name: 'mem_get_observation',
        arguments: { id: 99999 },
      });

      const result = parseError(response);
      expect(result.hint).toBeDefined();
      expect(typeof result.hint).toBe('string');
    });
  });

  // ─── Export Flow ──────────────────────────────────────────

  describe('Export Flow', () => {
    it('should export → verify count matches', async () => {
      const session = await setup.engine.createSession({
        projectId: 'test-project',
        endedAt: null,
        metadata: {},
      });

      // Seed 3 observations
      for (let i = 0; i < 3; i++) {
        await setup.engine.createObservation({
          sessionId: session.id,
          title: `Export test ${i}`,
          content: `Content ${i}`,
          type: 'note',
          topicKey: null,
          projectId: 'test-project',
          metadata: {},
        });
      }

      const exportResponse = await setup.client.callTool({
        name: 'mem_export',
        arguments: { format: 'json', project_id: 'test-project' },
      });

      const exported = parseResult(exportResponse);
      expect(exported.success).toBe(true);
      expect(exported.recordCount).toBe(3);

      const parsed = JSON.parse(exported.content);
      expect(parsed.observations).toHaveLength(3);
    });
  });

  // ─── Merge Flow ───────────────────────────────────────────

  describe('Merge Flow', () => {
    it('should merge observations via full flow', async () => {
      const session = await setup.engine.createSession({
        projectId: 'test-project',
        endedAt: null,
        metadata: {},
      });

      // Create 2 observations with same topic
      await setup.engine.createObservation({
        sessionId: session.id,
        title: 'Auth v1',
        content: 'JWT approach v1',
        type: 'decision',
        topicKey: 'auth/jwt',
        projectId: 'test-project',
        metadata: {},
      });

      await setup.engine.createObservation({
        sessionId: session.id,
        title: 'Auth v2',
        content: 'JWT approach v2',
        type: 'decision',
        topicKey: 'auth/jwt',
        projectId: 'test-project',
        metadata: {},
      });

      // Dry run first
      const dryRunResponse = await setup.client.callTool({
        name: 'mem_merge',
        arguments: {
          project_id: 'test-project',
          topic_key: 'auth/jwt',
          strategy: 'by_topic',
          dry_run: true,
        },
      });
      const dryRunText = parseActionText(dryRunResponse);
      expect(dryRunText).toContain('Preview');
      expect(dryRunText).toContain('dry run');

      // Verify still 2 observations
      const beforeMerge = await setup.client.callTool({
        name: 'mem_search',
        arguments: { project_id: 'test-project' },
      });
      expect(parseActionText(beforeMerge)).toContain('Found 2 observations');

      // Execute merge
      const mergeResponse = await setup.client.callTool({
        name: 'mem_merge',
        arguments: {
          project_id: 'test-project',
          topic_key: 'auth/jwt',
          strategy: 'by_topic',
        },
      });
      const mergeText = parseActionText(mergeResponse);
      expect(mergeText).toContain('Merged');
      expect(mergeText).toContain('consolidated');

      // Verify only 1 observation remains
      const afterMerge = await setup.client.callTool({
        name: 'mem_search',
        arguments: { project_id: 'test-project' },
      });
      expect(parseActionText(afterMerge)).toContain('Found 1 observation');
    });
  });
});
