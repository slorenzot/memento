#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { MemoryEngine, loadConfig, resolveDbPath, getProjectId } from '@slorenzot/memento-core';
import type { ExportFormat, MergeStrategy } from '@slorenzot/memento-core';
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
        text: JSON.stringify({ success: false, error: error.message, hint }, null, 2),
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
  name: 'memento',
  version: '1.0.0',
});

// ─── Observation Tools ──────────────────────────────────────

server.tool(
  'mem_save',
  'Save an observation to persistent memory. Types: decision, bug, discovery, note. Call this PROACTIVELY after making decisions, fixing bugs, or discovering something non-obvious.',
  {
    title: z.string().describe('Short, searchable title (e.g. "Fixed N+1 in UserList")'),
    content: z.string().describe('Structured content: What/Why/Where/Learned format'),
    type: z
      .enum(['decision', 'bug', 'discovery', 'note'])
      .optional()
      .describe('Type of observation (default: note)'),
    topic_key: z
      .string()
      .optional()
      .describe('Stable topic key for grouping (e.g. "architecture/auth-model")'),
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
            text: JSON.stringify({ id: obs.id, uuid: obs.uuid, success: true }, null, 2),
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
  'Search observations using full-text search (FTS5). Start with small limits and expand only if needed.',
  {
    query: z.string().optional().describe('Search query (FTS5 syntax)'),
    type: z.enum(['decision', 'bug', 'discovery', 'note']).optional(),
    project_id: z.string().optional(),
    topic_key: z.string().optional(),
    limit: z.number().optional().describe('Max results (default: 10)'),
    offset: z.number().optional(),
    include_deleted: z.boolean().optional().describe('Include soft-deleted observations'),
  },
  async ({ query, type, project_id, topic_key, limit, offset, include_deleted }) => {
    try {
      const result = await engine.search({
        query,
        type: type as any,
        projectId: project_id,
        topicKey: topic_key,
        limit: limit || 10,
        offset,
        includeDeleted: include_deleted,
      });

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (error: any) {
      return handleToolError(error);
    }
  }
);

server.tool(
  'mem_get_observation',
  'Get full content of a specific observation by ID.',
  {
    id: z.number().describe('Observation ID'),
  },
  async ({ id }) => {
    try {
      const obs = await engine.getObservation(id);
      if (!obs) throw new Error(`Observation ${id} not found`);
      return {
        content: [{ type: 'text', text: JSON.stringify(obs, null, 2) }],
      };
    } catch (error: any) {
      return handleToolError(error);
    }
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
    try {
      const updated = await engine.updateObservation(id, {
        title,
        content,
        type: type as any,
        topicKey: topic_key,
      });
      return {
        content: [
          { type: 'text', text: JSON.stringify({ id: updated.id, success: true }, null, 2) },
        ],
      };
    } catch (error: any) {
      return handleToolError(error);
    }
  }
);

// ─── Soft Delete / Restore / Purge ──────────────────────────

server.tool(
  'mem_delete',
  'Soft-delete an observation. The record is hidden from searches but can be restored with mem_restore. Use mem_purge for permanent deletion.',
  {
    id: z.number().describe('Observation ID to soft-delete'),
    reason: z.string().optional().describe('Reason for deletion (stored in metadata)'),
  },
  async ({ id, reason }) => {
    try {
      await engine.deleteObservation(id, reason);
      return {
        content: [
          { type: 'text', text: JSON.stringify({ id, deleted: true, success: true }, null, 2) },
        ],
      };
    } catch (error: any) {
      return handleToolError(error);
    }
  }
);

server.tool(
  'mem_restore',
  'Restore a soft-deleted observation back to active state.',
  {
    id: z.number().describe('Observation ID to restore'),
  },
  async ({ id }) => {
    try {
      const restored = await engine.restoreObservation(id);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ id: restored.id, restored: true, success: true }, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return handleToolError(error);
    }
  }
);

server.tool(
  'mem_purge',
  'PERMANENTLY delete soft-deleted observations. This is IRREVERSIBLE. Requires confirm: true.',
  {
    confirm: z.boolean().describe('Must be true to execute purge'),
    project_id: z.string().optional().describe('Purge all deleted obs in this project'),
    observation_ids: z
      .array(z.number())
      .optional()
      .describe('Specific soft-deleted observation IDs to purge'),
  },
  async ({ confirm, project_id, observation_ids }) => {
    try {
      if (!confirm) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                { success: false, error: 'confirm must be true to execute purge' },
                null,
                2
              ),
            },
          ],
        };
      }

      const result = await engine.purgeObservations({
        projectId: project_id,
        observationIds: observation_ids,
      });

      return {
        content: [{ type: 'text', text: JSON.stringify({ ...result, success: true }, null, 2) }],
      };
    } catch (error: any) {
      return handleToolError(error);
    }
  }
);

server.tool(
  'mem_list_deleted',
  'List soft-deleted observations that can be restored or purged.',
  {
    project_id: z.string().optional(),
    limit: z.number().optional().describe('Max results (default: 20)'),
  },
  async ({ project_id, limit }) => {
    try {
      const result = await engine.listDeleted({ projectId: project_id, limit });
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (error: any) {
      return handleToolError(error);
    }
  }
);

// ─── Merge ──────────────────────────────────────────────────

server.tool(
  'mem_merge',
  'Merge related observations into a single synthesized record. Identifies candidates automatically by topic_key or content similarity (Jaccard > 0.85). Use dry_run to preview without executing.',
  {
    project_id: z.string().describe('Project to merge observations in (required)'),
    topic_key: z.string().optional().describe('Merge all observations with this topic_key'),
    observation_ids: z
      .array(z.number())
      .optional()
      .describe('Specific observation IDs to merge (overrides auto-detection)'),
    strategy: z
      .enum(['by_topic', 'by_similarity', 'by_ids'])
      .optional()
      .describe('Merge strategy (default: by_topic)'),
    dry_run: z.boolean().optional().describe('If true, returns candidates without executing merge'),
  },
  async ({ project_id, topic_key, observation_ids, strategy, dry_run }) => {
    try {
      const results = await engine.mergeObservations({
        projectId: project_id,
        topicKey: topic_key,
        observationIds: observation_ids,
        strategy: (strategy as MergeStrategy) || 'by_topic',
        dryRun: dry_run,
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                dryRun: dry_run || false,
                mergeCount: results.length,
                results: results.map((r) => ({
                  mergedObservationId: r.mergedObservation.id,
                  deletedIds: r.deletedIds,
                  originalCount: r.originalCount,
                  strategy: r.strategy,
                })),
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
  }
);

// ─── Export ──────────────────────────────────────────────────

server.tool(
  'mem_export',
  'Export observations to JSON, XML, or TXT format. Use filters to reduce scope.',
  {
    format: z.enum(['json', 'xml', 'txt']).optional().describe('Export format (default: json)'),
    project_id: z.string().optional().describe('Filter by project'),
    type: z.enum(['decision', 'bug', 'discovery', 'note']).optional(),
    topic_key: z.string().optional(),
    date_from: z.string().optional().describe('ISO date string — export from this date'),
    date_to: z.string().optional().describe('ISO date string — export until this date'),
    include_deleted: z.boolean().optional().describe('Include soft-deleted observations'),
  },
  async ({ format, project_id, type, topic_key, date_from, date_to, include_deleted }) => {
    try {
      const result = await engine.exportObservations({
        format: (format as ExportFormat) || 'json',
        projectId: project_id,
        type: type as any,
        topicKey: topic_key,
        dateFrom: date_from ? new Date(date_from) : undefined,
        dateTo: date_to ? new Date(date_to) : undefined,
        includeDeleted: include_deleted,
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                format: result.format,
                recordCount: result.recordCount,
                exportedAt: result.exportedAt.toISOString(),
                content: result.content,
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
  }
);

// ─── Session Tools ──────────────────────────────────────────

server.tool(
  'mem_session_start',
  'Start a new memory session for tracking a coding conversation.',
  {
    project_id: z.string().describe('Project identifier'),
    metadata: z.record(z.unknown()).optional(),
  },
  async ({ project_id, metadata }) => {
    try {
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
    } catch (error: any) {
      return handleToolError(error);
    }
  }
);

server.tool('mem_session_end', 'End current active session.', {}, async () => {
  try {
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
  } catch (error: any) {
    return handleToolError(error);
  }
});

server.tool(
  'mem_list_sessions',
  'List all sessions.',
  {
    project_id: z.string().optional(),
    limit: z.number().optional(),
  },
  async ({ project_id, limit }) => {
    try {
      const result = await engine.search({ projectId: project_id, limit: limit || 20 });
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
    } catch (error: any) {
      return handleToolError(error);
    }
  }
);

server.tool(
  'mem_get_session',
  'Get a specific session by ID.',
  {
    id: z.number().describe('Session ID'),
  },
  async ({ id }) => {
    try {
      const s = await engine.getSession(id);
      if (!s) throw new Error(`Session ${id} not found`);
      return {
        content: [{ type: 'text', text: JSON.stringify(s, null, 2) }],
      };
    } catch (error: any) {
      return handleToolError(error);
    }
  }
);

// ─── Utility Tools ──────────────────────────────────────────

server.tool(
  'mem_timeline',
  'Get chronological timeline of observations.',
  {
    project_id: z.string().optional(),
    limit: z.number().optional(),
    offset: z.number().optional(),
  },
  async ({ project_id, limit, offset }) => {
    try {
      const result = await engine.search({ projectId: project_id, limit, offset });
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (error: any) {
      return handleToolError(error);
    }
  }
);

server.tool('mem_stats', 'Get memory statistics.', {}, async () => {
  try {
    const result = await engine.search({});
    const deleted = await engine.listDeleted({});
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
              deletedObservations: deleted.total,
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
  } catch (error: any) {
    return handleToolError(error);
  }
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
              version: '1.0.0',
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

server.tool(
  'mem_config',
  'Get current memento configuration and system status.',
  {},
  async () => {
    try {
      const searchResult = await engine.search({});
      const currentDbPath = engine.getDatabasePath();

      const byType: Record<string, number> = {};
      for (const o of searchResult.observations) {
        byType[o.type] = (byType[o.type] || 0) + 1;
      }

      const dbStats = getDatabaseStats(currentDbPath);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                name: 'memento',
                version: '1.0.0',
                config: {
                  storagePath: currentDbPath,
                  projectId: projectId,
                  projectRoot: process.cwd(),
                  hasConfigFile: existsSync(join(process.cwd(), '.mementorc')),
                },
                storage: {
                  type: 'SQLite Persistent',
                  method: 'bun:sqlite',
                  databasePath: currentDbPath,
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
                  bunVersion: (process as any).versions?.bun || 'unknown',
                },
                tools: [
                  'mem_save',
                  'mem_search',
                  'mem_get_observation',
                  'mem_update',
                  'mem_delete',
                  'mem_restore',
                  'mem_purge',
                  'mem_list_deleted',
                  'mem_merge',
                  'mem_export',
                  'mem_session_start',
                  'mem_session_end',
                  'mem_list_sessions',
                  'mem_get_session',
                  'mem_timeline',
                  'mem_stats',
                  'mem_health',
                  'mem_config',
                ],
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
  }
);

// ─── Helpers ────────────────────────────────────────────────

function getDatabaseStats(dbPath: string) {
  let totalSize = 0;
  let walSize = 0;
  let shmSize = 0;

  try {
    totalSize += fs.statSync(dbPath).size;
  } catch {
    /* empty */
  }
  try {
    walSize = fs.statSync(`${dbPath}-wal`).size;
    totalSize += walSize;
  } catch {
    /* empty */
  }
  try {
    shmSize = fs.statSync(`${dbPath}-shm`).size;
    totalSize += shmSize;
  } catch {
    /* empty */
  }

  return {
    totalBytes: totalSize,
    totalSizeHuman: formatBytes(totalSize),
    mainDbBytes: totalSize - walSize - shmSize,
    mainDbSizeHuman: formatBytes(totalSize - walSize - shmSize),
    walBytes: walSize,
    walSizeHuman: formatBytes(walSize),
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

// ─── Server Startup ─────────────────────────────────────────

const BANNER = `
 ╔══════════════════════════════════════════════════╗
 ║                                                  ║
 ║     MEMENTO — Persistent Memory System           ║
 ║                                                  ║
 ║     Version: 1.0.0                               ║
 ║     MCP Server: memento                          ║
 ║     Storage: SQLite Persistent                   ║
 ║     Tools: mem_*                         ║
 ║                                                  ║
 ╚══════════════════════════════════════════════════╝
`;

async function main() {
  console.error(BANNER);

  if (!engine.isHealthy()) {
    const initError = engine.getInitError();
    console.error('\n⚠️  WARNING: Database initialization failed');
    console.error(`   Error: ${initError?.message || 'Unknown error'}`);
    console.error(`   Database path: ${dbPath}`);
    console.error('\n   The server will start, but database operations will fail.');
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('\n✓ Memento MCP Server started successfully');
  console.error(`  Database: ${dbPath}`);
  console.error(`  Project: ${projectId}`);
  console.error(`  Health: ${engine.isHealthy() ? '✓ Healthy' : '✗ Unhealthy'}`);
  console.error(`  Tools: 18 (mem_*)`);
  console.error(`  Ready to accept connections...\n`);
}

main().catch((err) => {
  console.error('Fatal error during server startup:', err);
  process.exit(1);
});
