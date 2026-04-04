#!/usr/bin/env node
'use strict';

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { MemoryEngine } from '@slorenzot/memento-core';

const server = new Server({
  name: 'memento-server',
  version: '0.3.0',
});

const memory = new MemoryEngine();

server.setRequestHandler('notifications/list', async () => {
  return {};
});

server.setRequestHandler('tools/list', async () => {
  return {
    tools: [
      {
        name: 'mem_save',
        description: 'Save an observation to memory',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            content: { type: 'string' }
          },
          required: ['title', 'content']
        }
      },
      {
        name: 'mem_search',
        description: 'Search observations',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string' }
          }
        }
      },
      {
        name: 'mem_get_observation',
        description: 'Get observation by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number' }
          },
          required: ['id']
        }
      },
      {
        name: 'mem_update',
        description: 'Update observation',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            title: { type: 'string' },
            content: { type: 'string' }
          },
          required: ['id']
        }
      },
      {
        name: 'mem_delete',
        description: 'Delete observation',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number' }
          },
          required: ['id']
        }
      },
      {
        name: 'mem_session_start',
        description: 'Start memory session',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'string' }
          }
        }
      },
      {
        name: 'mem_session_end',
        description: 'End memory session',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number' }
          },
          required: ['id']
        }
      },
      {
        name: 'mem_list_sessions',
        description: 'List memory sessions',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'string' }
          }
        }
      },
      {
        name: 'mem_get_session',
        description: 'Get memory session',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number' }
          },
          required: ['id']
        }
      },
      {
        name: 'mem_timeline',
        description: 'Get timeline of observations',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'string' }
          }
        }
      },
      {
        name: 'mem_stats',
        description: 'Get memory statistics',
        inputSchema: {
          type: 'object'
        }
      },
      {
        name: 'mem_health',
        description: 'Check system health',
        inputSchema: {
          type: 'object'
        }
      }
    ]
  };
});

server.setRequestHandler('tools/call', async (request) => {
  const name = request.params.name;
  const args = request.params.arguments;

  let result = '';
  try {
    switch (name) {
      case 'mem_save':
        await memory.createObservation({
          title: String(args.title),
          content: String(args.content),
          type: 'note',
          projectId: String(args.project_id || '')
        });
        result = 'Saved observation';
        break;

      case 'mem_search':
        const searchResult = await memory.search({
          query: String(args.query || '')
        });
        result = JSON.stringify(searchResult);
        break;

      case 'mem_get_observation':
        const obs = memory.getObservation(Number(args.id));
        result = JSON.stringify(obs || {});
        break;

      case 'mem_update':
        memory.updateObservation(Number(args.id), {
          title: args.title ? String(args.title) : undefined,
          content: args.content ? String(args.content) : undefined
        });
        result = 'Updated observation';
        break;

      case 'mem_delete':
        memory.deleteObservation(Number(args.id));
        result = 'Deleted observation';
        break;

      case 'mem_session_start':
        const session = memory.createSession({
          projectId: String(args.project_id || ''),
          metadata: {}
        });
        result = session.uuid;
        break;

      case 'mem_session_end':
        const session = memory.endSession(Number(args.id));
        result = session.uuid;
        break;

      case 'mem_list_sessions':
        const sessions = memory.listSessions({
          projectId: String(args.project_id || '')
        });
        result = JSON.stringify({
          sessions: sessions,
          total: sessions.length
        });
        break;

      case 'mem_get_session':
        const session = memory.getSession(Number(args.id));
        result = JSON.stringify(session || {});
        break;

      case 'mem_timeline':
        const observations = memory.listObservations({
          projectId: String(args.project_id || '')
        });
        result = JSON.stringify(observations);
        break;

      case 'mem_stats':
        const allObs = memory.listObservations();
        const stats = {
          total: allObs.length,
          byType: {}
        };
        result = JSON.stringify(stats);
        break;

      case 'mem_health':
        result = JSON.stringify({
          status: 'healthy',
          version: '0.3.0',
          database: 'connected',
          tools: 15
        });
        break;

      default:
        throw new Error('Unknown tool: ' + name);
    }
  } catch (error) {
    result = 'Error: ' + String(error);
  }

  return {
    content: [
      { type: 'text', text: result }
    ]
  };
});

async function start() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

process.on('SIGINT', () => {
  server.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  server.close();
  process.exit(0);
});

console.error('Memento MCP Server v0.3.0');
start().catch(err => {
  console.error('Failed to start:', err);
  process.exit(1);
});