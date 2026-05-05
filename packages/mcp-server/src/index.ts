#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { MemoryEngine, loadConfig, resolveDbPath, getProjectId } from '@slorenzot/memento-core';
import { existsSync } from 'fs';
import { join } from 'path';
import * as fs from 'fs';

// Helper: pluralize a type word based on count
function pluralize(count: number, word: string): string {
  if (count === 1) return `1 ${word}`;
  if (word === 'discovery') return `${count} discoveries`;
  return `${count} ${word}s`;
}

// Helper: format type breakdown from observations
function formatTypeBreakdown(observations: any[]): string {
  if (observations.length === 0) return '0 observations';
  const counts: Record<string, number> = {};
  for (const o of observations) {
    counts[o.type] = (counts[o.type] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([type, count]) => pluralize(count, type))
    .join(', ');
}

// Helper: build two-part response (clean summary for user + full data for agent)
function buildResponse(summary: string, data: any): any {
  return {
    content: [
      { type: 'text', text: summary },
      { type: 'text', text: JSON.stringify(data, null, 2) },
    ],
  };
}

// Helper function to handle errors in tool execution
function handleToolError(error: any): any {
  console.error('Tool execution error:', error.message);

  return {
    content: [
      {
        type: 'text',
        text: `✗ Error: ${error.message} — project: ${projectId}`,
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
            text: `✓ Observation #${obs.id} saved — project: ${currentProjectId}`,
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

      const searchProject = project_id || projectId;

      if (result.total === 0) {
        return buildResponse(`No observations found — project: ${searchProject}`, result);
      }
      if (result.total === 1) {
        const obs = result.observations[0];
        return buildResponse(`✓ Found 1 ${obs.type}: "${obs.title}" — project: ${searchProject}`, result);
      }
      return buildResponse(
        `✓ Found ${result.total} observations (${formatTypeBreakdown(result.observations)}) — project: ${searchProject}`,
        result
      );
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
    return buildResponse(
      `✓ Observation #${obs.id}: "${obs.title}" (${obs.type}, project: ${obs.projectId || projectId})`,
      obs
    );
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
            text: `✓ Observation #${updated.id} updated — project: ${projectId}`,
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
            text: `✓ Observation #${id} deleted — project: ${projectId}`,
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
        text: `✓ Session #${ended.id} ended — project: ${projectId}`,
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

    const validSessions = sessions.filter(Boolean);
    const sessionProject = project_id || projectId;
    return buildResponse(
      `✓ Found ${validSessions.length} sessions — project: ${sessionProject}`,
      { sessions: validSessions, total: validSessions.length }
    );
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
    return buildResponse(
      `✓ Session #${s.id} (project: ${s.projectId}, started: ${s.startedAt})`,
      s
    );
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

    const timelineProject = project_id || projectId;

    if (result.total === 0) {
      return buildResponse(`No observations in timeline — project: ${timelineProject}`, result);
    }
    if (result.total === 1) {
      const obs = result.observations[0];
      return buildResponse(`✓ Timeline: 1 ${obs.type}: "${obs.title}" — project: ${timelineProject}`, result);
    }
    return buildResponse(
      `✓ Timeline: ${result.total} observations (${formatTypeBreakdown(result.observations)}) — project: ${timelineProject}`,
      result
    );
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

  const breakdown = formatTypeBreakdown(result.observations);

  return buildResponse(
    `✓ Stats: ${result.total} total (${breakdown}) — project: ${projectId}`,
    { totalObservations: result.total, byType, byProject, activeSessionId }
  );
});

server.tool('mem_health', 'Check system health.', {}, async () => {
  try {
    const isHealthy = engine.isHealthy();
    const result = isHealthy ? await engine.search({}) : { total: 0, observations: [] };
    const initError = engine.getInitError();

    const statusIcon = isHealthy ? '✓' : '✗';
    const statusText = isHealthy ? 'Healthy' : 'Unhealthy';

    return buildResponse(
      `${statusIcon} ${statusText} | SQLite | ${result.total} observations — project: ${projectId}`,
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
      }
    );
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

  return buildResponse(
    `✓ Memento v0.5.0 | SQLite | ${searchResult.total} obs | ${dbStats.totalSizeHuman} — project: ${projectId}`,
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
    }
  );
});

server.tool(
  'mem_export',
  'Export observations to a JSON file.',
  {
    file_path: z.string().describe('Absolute path to export file'),
    project_id: z.string().optional().describe('Export only this project'),
    include_sessions: z.boolean().optional().describe('Include session data (default: false)'),
  },
  async ({ file_path, project_id, include_sessions }) => {
    try {
      const data = await engine.exportToJson({
        projectId: project_id,
        includeSessions: include_sessions,
      });

      const dir = join(file_path, '..');
      if (!existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(file_path, JSON.stringify(data, null, 2));

      const exportProject = project_id || projectId;
      return buildResponse(
        `✓ Exported ${data.observations.length} observations to ${file_path} — project: ${exportProject}`,
        { filePath: file_path, exported: data.observations.length, project: exportProject }
      );
    } catch (error: any) {
      return handleToolError(error);
    }
  }
);

server.tool(
  'mem_import',
  'Import observations from a JSON file.',
  {
    file_path: z.string().describe('Absolute path to import file'),
    project_id: z.string().optional().describe('Override project_id for all imported records'),
    conflict_strategy: z
      .enum(['skip', 'overwrite', 'fail'])
      .optional()
      .describe('How to handle duplicates (default: skip)'),
    dry_run: z.boolean().optional().describe('Validate without importing (default: false)'),
  },
  async ({ file_path, project_id, conflict_strategy, dry_run }) => {
    try {
      if (!existsSync(file_path)) {
        throw new Error(`File not found: ${file_path}`);
      }

      const raw = fs.readFileSync(file_path, 'utf-8');
      const data = JSON.parse(raw);

      const result = await engine.importFromJson(data, {
        projectId: project_id,
        conflictStrategy: conflict_strategy || 'skip',
        dryRun: dry_run || false,
      });

      const importProject = project_id || data.project || projectId;

      if (dry_run) {
        return buildResponse(
          `✓ Dry run: ${result.imported} valid, ${result.skipped} duplicates, ${result.failed} invalid — project: ${importProject}`,
          result
        );
      }

      if (result.imported === 0 && result.overwritten === 0) {
        return buildResponse(
          `No records imported (${result.skipped} skipped, ${result.failed} invalid) — project: ${importProject}`,
          result
        );
      }

      const parts: string[] = [];
      if (result.imported > 0) parts.push(`${result.imported} imported`);
      if (result.overwritten > 0) parts.push(`${result.overwritten} overwritten`);
      if (result.skipped > 0) parts.push(`${result.skipped} skipped`);
      if (result.failed > 0) parts.push(`${result.failed} failed`);

      return buildResponse(
        `✓ Import complete: ${parts.join(', ')} — project: ${importProject}`,
        result
      );
    } catch (error: any) {
      return handleToolError(error);
    }
  }
);

server.tool(
  'mem_reset',
  'Reset database (full or by project). DESTRUCTIVE — requires explicit confirmation.',
  {
    mode: z.enum(['full', 'project']).describe('Reset scope: "full" or "project"'),
    project_id: z.string().optional().describe('Required when mode = "project"'),
    confirm: z.string().describe('"FULL_RESET" for full mode, "true" for project mode'),
    create_backup: z.boolean().optional().describe('Auto-export before reset (default: true)'),
    dry_run: z.boolean().optional().describe('Preview what will be deleted (default: false)'),
  },
  async ({ mode, project_id, confirm, create_backup, dry_run }) => {
    try {
      // Safety: validate confirm parameter
      if (mode === 'full') {
        if (confirm !== 'FULL_RESET') {
          return {
            content: [{ type: 'text', text: `✗ Full reset requires confirm: "FULL_RESET" — project: ${projectId}` }],
          };
        }
      } else if (mode === 'project') {
        if (!project_id) {
          return {
            content: [{ type: 'text', text: `✗ Project reset requires project_id — project: ${projectId}` }],
          };
        }
        if (confirm !== 'true') {
          return {
            content: [{ type: 'text', text: `✗ Project reset requires confirm: "true" — project: ${projectId}` }],
          };
        }
      }

      // Dry run: just count
      if (dry_run) {
        if (mode === 'full') {
          const allObs = await engine.search({ limit: 100000 });
          return buildResponse(
            `✓ Dry run: ${allObs.total} observations would be deleted (full reset) — project: ${projectId}`,
            { mode, wouldDelete: allObs.total }
          );
        } else {
          const counts = await engine.countByProject(project_id!);
          return buildResponse(
            `✓ Dry run: ${counts.observations} observations, ${counts.prompts} prompts would be deleted — project: ${project_id}`,
            { mode, project: project_id, ...counts }
          );
        }
      }

      // Backup before reset (default: true)
      let backupPath: string | null = null;
      if (create_backup !== false) {
        const backupDir = join(process.env.HOME || '/tmp', '.memento', 'backups');
        if (!existsSync(backupDir)) {
          fs.mkdirSync(backupDir, { recursive: true });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const scopeLabel = mode === 'full' ? 'full' : project_id;
        backupPath = join(backupDir, `reset-${scopeLabel}-${timestamp}.json`);

        const exportData = await engine.exportToJson({
          projectId: mode === 'project' ? project_id : undefined,
          includeSessions: true,
        });
        fs.writeFileSync(backupPath, JSON.stringify(exportData, null, 2));
      }

      // Execute reset
      if (mode === 'full') {
        const result = await engine.resetFull();
        return buildResponse(
          `✓ Full reset complete: ${result.deleted} records deleted — project: ${projectId}` +
          (backupPath ? ` | Backup: ${backupPath}` : ''),
          { mode, deleted: result.deleted, backupPath }
        );
      } else {
        const result = await engine.resetProject(project_id!);
        return buildResponse(
          `✓ Project reset complete: ${result.deleted} records deleted, ${result.orphanSessions} orphan sessions cleaned — project: ${project_id}` +
          (backupPath ? ` | Backup: ${backupPath}` : ''),
          { mode, project: project_id, ...result, backupPath }
        );
      }
    } catch (error: any) {
      return handleToolError(error);
    }
  }
);

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
