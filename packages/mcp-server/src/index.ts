#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { MemoryEngine } from '@slorenzot/memento-core';

const engine = new MemoryEngine('./data/memento.db');
let activeSessionId: number | null = null;

const server = new McpServer({
  name: 'memento-mcp-server',
  version: '0.4.0',
});

server.tool(
  'mem_save',
  'Save an observation to memory. Types: decision, bug, discovery, note.',
  {
    title: z.string().describe('Title of observation'),
    content: z.string().describe('Content of observation'),
    type: z
      .enum(['decision', 'bug', 'discovery', 'note'])
      .optional()
      .describe('Type of observation (default: note)'),
    topic_key: z.string().optional().describe('Topic key for grouping'),
    project_id: z.string().optional().describe('Project identifier'),
    metadata: z.record(z.unknown()).optional().describe('Additional metadata'),
  },
  async ({ title, content, type, topic_key, project_id, metadata }) => {
    let sessionId = activeSessionId;

    if (!sessionId) {
      const session = await engine.createSession({
        projectId: project_id || 'default',
        endedAt: null,
        metadata: {},
      });
      sessionId = session.id;
      activeSessionId = sessionId;
    }

    const obs = await engine.createObservation({
      sessionId,
      title,
      content,
      type: (type as any) || 'note',
      topicKey: topic_key || null,
      projectId: project_id || 'default',
      metadata: metadata || {},
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ id: obs.id, uuid: obs.uuid, success: true }, null, 2),
        },
      ],
    };
  }
);

server.tool(
  'mem_search',
  'Search observations using text matching.',
  {
    query: z.string().optional().describe('Search query'),
    type: z.enum(['decision', 'bug', 'discovery', 'note']).optional(),
    project_id: z.string().optional(),
    topic_key: z.string().optional(),
    limit: z.number().optional(),
    offset: z.number().optional(),
  },
  async ({ query, type, project_id, topic_key, limit, offset }) => {
    const result = await engine.search({
      query,
      type: type as any,
      projectId: project_id,
      topicKey: topic_key,
      limit,
      offset,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

server.tool(
  'mem_get_observation',
  'Get a specific observation by ID.',
  {
    id: z.number().describe('Observation ID'),
  },
  async ({ id }) => {
    const obs = await engine.getObservation(id);
    if (!obs) throw new Error(`Observation ${id} not found`);
    return {
      content: [{ type: 'text', text: JSON.stringify(obs, null, 2) }],
    };
  }
);

server.tool(
  'mem_update',
  'Update an existing observation.',
  {
    id: z.number().describe('Observation ID'),
    title: z.string().optional(),
    content: z.string().optional(),
    type: z.enum(['decision', 'bug', 'discovery', 'note']).optional(),
    topic_key: z.string().optional(),
  },
  async ({ id, title, content, type, topic_key }) => {
    const updated = await engine.updateObservation(id, {
      title,
      content,
      type: type as any,
      topicKey: topic_key,
    });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ id: updated.id, success: true }, null, 2),
        },
      ],
    };
  }
);

server.tool(
  'mem_delete',
  'Delete an observation.',
  {
    id: z.number().describe('Observation ID'),
  },
  async ({ id }) => {
    await engine.deleteObservation(id);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ id, success: true }, null, 2),
        },
      ],
    };
  }
);

server.tool(
  'mem_session_start',
  'Start a new memory session.',
  {
    project_id: z.string().describe('Project identifier'),
    metadata: z.record(z.unknown()).optional(),
  },
  async ({ project_id, metadata }) => {
    const session = await engine.createSession({
      projectId: project_id,
      endedAt: null,
      metadata: metadata || {},
    });
    activeSessionId = session.id;

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ id: session.id, uuid: session.uuid, success: true }, null, 2),
        },
      ],
    };
  }
);

server.tool('mem_session_end', 'End current active session.', {}, async () => {
  if (!activeSessionId) throw new Error('No active session');
  const ended = await engine.endSession(activeSessionId);
  activeSessionId = null;

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          { id: ended.id, uuid: ended.uuid, endedAt: ended.endedAt, success: true },
          null,
          2
        ),
      },
    ],
  };
});

server.tool(
  'mem_list_sessions',
  'List all sessions.',
  {
    project_id: z.string().optional(),
    limit: z.number().optional(),
  },
  async ({ project_id, limit }) => {
    const result = await engine.search({
      projectId: project_id,
      limit: limit || 20,
    });

    const uniqueSessions = new Set(result.observations.map((o) => o.sessionId));
    const sessions = await Promise.all(
      Array.from(uniqueSessions).map((id) => engine.getSession(id))
    );

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            { sessions: sessions.filter(Boolean), total: sessions.length },
            null,
            2
          ),
        },
      ],
    };
  }
);

server.tool(
  'mem_get_session',
  'Get a specific session by ID.',
  {
    id: z.number().describe('Session ID'),
  },
  async ({ id }) => {
    const s = await engine.getSession(id);
    if (!s) throw new Error(`Session ${id} not found`);
    return {
      content: [{ type: 'text', text: JSON.stringify(s, null, 2) }],
    };
  }
);

server.tool(
  'mem_timeline',
  'Get chronological timeline of observations.',
  {
    project_id: z.string().optional(),
    limit: z.number().optional(),
    offset: z.number().optional(),
  },
  async ({ project_id, limit, offset }) => {
    const result = await engine.search({
      projectId: project_id,
      limit,
      offset,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

server.tool('mem_stats', 'Get memory statistics.', {}, async () => {
  const result = await engine.search({});
  const byType: Record<string, number> = {};
  const byProject: Record<string, number> = {};

  for (const o of result.observations) {
    byType[o.type] = (byType[o.type] || 0) + 1;
    byProject[o.projectId] = (byProject[o.projectId] || 0) + 1;
  }

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            totalObservations: result.total,
            byType,
            byProject,
            activeSessionId,
          },
          null,
          2
        ),
      },
    ],
  };
});

server.tool('mem_health', 'Check system health.', {}, async () => {
  const result = await engine.search({});

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            status: 'healthy',
            version: '0.4.0',
            storage: 'sqlite-persistent',
            observations: result.total,
            activeSession: activeSessionId,
          },
          null,
          2
        ),
      },
    ],
  };
});

server.tool('mem_config', 'Get server configuration.', {}, async () => {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            name: 'memento-mcp-server',
            version: '0.4.0',
            storage: 'sqlite-persistent',
            tools: 13,
          },
          null,
          2
        ),
      },
    ],
  };
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Memento MCP Server v0.4.0 started (SQLite persistent storage)');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
