#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { MemoryEngine } from '@slorenzot/memento-core';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';

interface MementoConfig {
  storagePath: string;
  projectId?: string;
}

const DEFAULT_CONFIG: MementoConfig = {
  storagePath: 'database/storage',
};

function loadJSONFile<T>(path: string): T | null {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as T;
  } catch {
    return null;
  }
}

function findProjectConfig(startDir: string = process.cwd()): MementoConfig | null {
  let currentDir = startDir;
  for (let depth = 0; depth < 10; depth++) {
    const configPath = join(currentDir, '.mementorc');
    if (existsSync(configPath)) {
      const config = loadJSONFile<MementoConfig>(configPath);
      if (config) return config;
    }
    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) break;
    currentDir = parentDir;
  }
  return null;
}

function loadConfig(): MementoConfig {
  let config: MementoConfig = { ...DEFAULT_CONFIG };
  const projectConfig = findProjectConfig();
  if (projectConfig) config = { ...config, ...projectConfig };
  const globalConfig = loadJSONFile<MementoConfig>(join(homedir(), '.memento', 'config'));
  if (globalConfig) config = { ...config, ...globalConfig };
  if (process.env.MEMENTO_STORAGE_PATH) config.storagePath = process.env.MEMENTO_STORAGE_PATH;
  if (process.env.MEMENTO_PROJECT_ID) config.projectId = process.env.MEMENTO_PROJECT_ID;
  return config;
}

function resolveStoragePath(config: MementoConfig): string {
  if (config.storagePath.startsWith('/')) return config.storagePath;
  if (config.storagePath.startsWith('~/')) return join(homedir(), config.storagePath.slice(2));
  return join(process.cwd(), config.storagePath);
}

function getProjectId(config: MementoConfig): string {
  if (config.projectId) return config.projectId;
  const packageJson = loadJSONFile<{ name?: string }>(join(process.cwd(), 'package.json'));
  return packageJson?.name || 'default';
}

const config = loadConfig();
const dbPath = resolveStoragePath(config);
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
    let sessionId = activeSessionId;

    if (!sessionId) {
      const session = await engine.createSession({
        projectId,
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
      projectId,
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
            version: '0.5.0',
            storage: 'sqlite-persistent',
            databasePath: dbPath,
            projectId: projectId,
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
  const path = require('path');
  const fs = require('fs');

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

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('\n✓ Memento MCP Server started successfully');
  console.error(`  Database: ${dbPath}`);
  console.error(`  Project: ${projectId}`);
  console.error(`  Ready to accept connections...\n`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
