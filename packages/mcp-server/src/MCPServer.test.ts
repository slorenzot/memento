import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { MCPServer } from './MCPServer';

describe('MCPServer', () => {
  let server: MCPServer;
  let testDbPath: string;

  beforeEach(() => {
    testDbPath = `/tmp/test-mcp-${Date.now()}.db`;
    server = new MCPServer(testDbPath);
  });

  afterEach(() => {
    server.close();
  });

  it('should initialize without errors', () => {
    expect(server).toBeDefined();
  });

  describe('Tool Handling', () => {
    it('should have all required tools', async () => {
      const tools = server['getToolDefinitions']();
      const toolNames = tools.map((t) => t.name);

      expect(toolNames).toContain('mem_save');
      expect(toolNames).toContain('mem_update');
      expect(toolNames).toContain('mem_delete');
      expect(toolNames).toContain('mem_search');
      expect(toolNames).toContain('mem_get_observation');
      expect(toolNames).toContain('mem_save_prompt');
      expect(toolNames).toContain('mem_session_summary');
      expect(toolNames).toContain('mem_context');
      expect(toolNames).toContain('mem_timeline');
      expect(toolNames).toContain('mem_stats');
      expect(toolNames).toContain('mem_session_start');
      expect(toolNames).toContain('mem_session_end');
      expect(toolNames).toContain('mem_suggest_topic_key');
      expect(toolNames).toContain('mem_capture_passive');
    });

    it('should handle mem_save tool', async () => {
      const result = await server['handleToolCall']('mem_save', {
        title: 'Test Observation',
        content: 'Test content',
        type: 'note',
        project_id: 'test-project',
      });

      expect(result.isError).toBeFalse();
      const data = JSON.parse(result.content[0].text as string);
      expect(data.success).toBeTrue();
      expect(data.id).toBeDefined();
    });

    it('should handle mem_search tool', async () => {
      const result = await server['handleToolCall']('mem_search', {
        query: 'test',
      });

      expect(result.content).toBeDefined();
      expect(result.content[0].text).toBeDefined();
    });

    it('should handle mem_suggest_topic_key tool', async () => {
      const result = await server['handleToolCall']('mem_suggest_topic_key', {
        title: 'Authentication Bug Fix',
        content: 'Fixed JWT token validation',
      });

      expect(result.isError).toBeFalse();
      const data = JSON.parse(result.content[0].text as string);
      expect(data.topicKey).toBeDefined();
      expect(data.confidence).toBeNumber();
    });

    it('should handle mem_session_start tool', async () => {
      const result = await server['handleToolCall']('mem_session_start', {
        project_id: 'test-project',
      });

      expect(result.isError).toBeFalse();
      const data = JSON.parse(result.content[0].text as string);
      expect(data.success).toBeTrue();
      expect(data.id).toBeDefined();
    });

    it('should handle mem_stats tool', async () => {
      const result = await server['handleToolCall']('mem_stats', {});

      expect(result.isError).toBeFalse();
      const data = JSON.parse(result.content[0].text as string);
      expect(data.totalObservations).toBeNumber();
      expect(data.byType).toBeDefined();
      expect(data.byProject).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid tool name', async () => {
      const result = await server['handleToolCall']('invalid_tool', {});

      expect(result.isError).toBeTrue();
      const data = JSON.parse(result.content[0].text as string);
      expect(data.error).toBeDefined();
    });

    it('should handle missing required parameters', async () => {
      const result = await server['handleToolCall']('mem_save', {
        title: 'Missing required fields',
      });

      expect(result.isError).toBeTrue();
    });
  });
});
