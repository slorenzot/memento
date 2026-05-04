#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { MemoryEngine, loadConfig, resolveDbPath, getProjectId } from '@slorenzot/memento-core';
import { existsSync } from 'fs';
import { join } from 'path';
import * as fs from 'fs';

// Helper function to handle errors in tool execution
function handleToolError(error: any): any {
  console.error('Tool execution error:', error.message);

  let hint = 'An error occurred during operation';
  if (!engine.isHealthy()) {
    const initError = engine.getInitError();
    hint = `Database initialization failed: ${initError?.message || 'Unknown error'}. Check configuration and permissions.`;
  }

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            success: false,
            error: error.message,
            hint,
          },
          null,
          2
        ),
      },
    ],
  };
}

const config = loadConfig();
const dbPath = resolveDbPath(config);
const projectId = getProjectId(config);

const engine = new MemoryEngine(dbPath);
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
    try {
      const currentProjectId = project_id || projectId;
      let sessionId = activeSessionId;

      if (!sessionId) {
        const session = await engine.createSession({
          projectId: currentProjectId,
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
        projectId: currentProjectId,
        metadata: metadata || {},
      });

      return {
        content: [
          {
            type: 'text',
            text: `✓ Observation #${obs.id} saved successfully`,
          },
        ],
      };
    } catch (error: any) {
      return handleToolError(error);
    }
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
    try {
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
    } catch (error: any) {
      return handleToolError(error);
    }
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
          text: `✓ Observation #${updated.id} updated successfully`,
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
          text: `✓ Observation #${id} deleted successfully`,
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
          text: `✓ Session #${session.id} started (project: ${project_id})`,
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
        text: `✓ Session #${ended.id} ended`,
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

    const uniqueSessions = new Set(result.observations.map((o: any) => o.sessionId));
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
  try {
    const isHealthy = engine.isHealthy();
    const result = isHealthy ? await engine.search({}) : { total: 0, observations: [] };
    const initError = engine.getInitError();

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              status: isHealthy ? 'healthy' : 'unhealthy',
              version: '0.7.0',
              storage: 'sqlite-persistent',
              databasePath: dbPath,
              projectId: projectId,
              databaseHealth: isHealthy ? 'ok' : 'failed',
              ...(initError && { initError: initError.message }),
              observations: result.total,
              activeSession: activeSessionId,
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error: any) {
    return handleToolError(error);
  }
});

server.tool('mem_config', 'Get current memento configuration and system status.', {}, async () => {
  const searchResult = await engine.search({});
  const dbPath = engine.getDatabasePath();

  const byType: Record<string, number> = {};
  for (const o of searchResult.observations) {
    byType[o.type] = (byType[o.type] || 0) + 1;
  }

  const dbStats = getDatabaseStats(dbPath);

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            name: 'memento-mcp-server',
            version: '0.5.0',
            config: {
              storagePath: dbPath,
              projectId: projectId,
              projectRoot: process.cwd(),
              hasConfigFile: existsSync(join(process.cwd(), '.mementorc')),
            },
            storage: {
              type: 'SQLite Persistent',
              method: 'bun:sqlite',
              databasePath: dbPath,
              walEnabled: true,
            },
            diskUsage: dbStats,
            statistics: {
              totalObservations: searchResult.total,
              byType,
              activeSession: activeSessionId,
            },
            environment: {
              nodeVersion: process.version,
              platform: process.platform,
              arch: process.arch,
              bunVersion: process.versions?.bun || 'unknown',
            },
          },
          null,
          2
        ),
      },
    ],
  };
});

function getDatabaseStats(dbPath: string) {
  let totalSize = 0;
  let walSize = 0;
  let shmSize = 0;

  try {
    const mainDb = fs.statSync(dbPath);
    totalSize += mainDb.size;
  } catch (e) {
    totalSize += 0;
  }

  try {
    const walFile = fs.statSync(`${dbPath}-wal`);
    walSize = walFile.size;
    totalSize += walSize;
  } catch (e) {
    walSize = 0;
  }

  try {
    const shmFile = fs.statSync(`${dbPath}-shm`);
    shmSize = shmFile.size;
    totalSize += shmSize;
  } catch (e) {
    shmSize = 0;
  }

  return {
    totalBytes: totalSize,
    totalSizeHuman: formatBytes(totalSize),
    mainDbBytes: totalSize - walSize - shmSize,
    mainDbSizeHuman: formatBytes(totalSize - walSize - shmSize),
    walBytes: walSize,
    walSizeHuman: formatBytes(walSize),
    shmBytes: shmSize,
    shmSizeHuman: formatBytes(shmSize),
  };
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const m = k * 1024;
  const g = m * 1024;

  if (bytes < k) return `${bytes} B`;
  if (bytes < m) return `${(bytes / k).toFixed(2)} KB`;
  if (bytes < g) return `${(bytes / m).toFixed(2)} MB`;
  return `${(bytes / g).toFixed(2)} GB`;
}

const BANNER = `
 ╔═════════════════════════════════════════════════════════╗
 ║                                                               ║
 ║     ██╗    ██╗███████╗██╗   ██╗██╗███╗   ███████╗               ║
 ║     ██║    ██║██╔════╝██║   ██║██║██╔██╗ ██╔════╝               ║
 ║     ██║ █╗ ██║█████╗  ██║   ██║██║███████║███████╗                ║
 ║     ╚███╔╝██╚════██╗██║   ██║██║╚════██║╚════██║                ║
 ║      ╚══╝ ╚███████╔╝╚█████╔╝╚█████╔╝ ╚███████╔╝               ║
 ║                  ╚═════╝     ╚═════╝     ╚═════╝                ║
 ║                                                               ║
 ║              ╔═══════════════════════════════════════╗   ║
 ║              ║                                           ║   ║
 ║              ║    MEMENTO - Persistent Memory System      ║   ║
 ║              ║                                           ║   ║
 ║              ║    Version: 0.5.0                         ║   ║
 ║              ║    Storage: SQLite Persistent              ║   ║
 ║              ╚═══════════════════════════════════════╝   ║
 ╚═════════════════════════════════════════════════════════╝
`;

async function main() {
  console.error(BANNER);

  // Check database health and show warnings if needed
  if (!engine.isHealthy()) {
    const initError = engine.getInitError();
    console.error('\n⚠️  WARNING: Database initialization failed');
    console.error(`   Error: ${initError?.message || 'Unknown error'}`);
    console.error(`   Database path: ${dbPath}`);
    console.error('\n   The server will start, but database operations will fail.');
    console.error('   Please check:');
    console.error('   - Directory permissions');
    console.error('   - Disk space');
    console.error('   - Path configuration in .mementorc\n');
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('\n✓ Memento MCP Server started successfully');
  console.error(`  Database: ${dbPath}`);
  console.error(`  Project: ${projectId}`);
  console.error(`  Health: ${engine.isHealthy() ? '✓ Healthy' : '✗ Unhealthy'}`);
  console.error(`  Ready to accept connections...\n`);
}

main().catch((err) => {
  console.error('Fatal error during server startup:', err);
  console.error('\nThe server failed to start. Please check the error above.');
  process.exit(1);
});
