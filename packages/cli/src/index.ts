#!/usr/bin/env node

import { Command } from 'commander';
import { MemoryEngine, resolveDbPath, getProjectId, getStaleThresholdMs, DEFAULT_STALE_THRESHOLD_MS, normalizeProjectId, DeviceFlowClient, TokenStore, ensureGlobalDir, GLOBAL_DB_PATH } from '@slorenzot/memento-core';
import type { Observation, ExportFormat } from '@slorenzot/memento-core';
import { existsSync, mkdirSync, copyFileSync, readdirSync, statSync, writeFileSync, readFileSync, appendFileSync } from 'fs';
import { join, dirname, basename } from 'path';
import { homedir } from 'os';
import { execSync } from 'child_process';

// ─── Lazy Memory Initialization ────────────────────────────
// MemoryEngine is NOT constructed at module scope so that
// `memento init` can run before any DB exists.

let _memory: MemoryEngine | null = null;
let _dbPath: string | null = null;
let _projectId: string | null = null;
let activeSessionId: number | null = null;

function getDbPath(): string {
  if (!_dbPath) _dbPath = resolveDbPath();
  return _dbPath;
}

function getProjectIdCached(): string {
  if (!_projectId) _projectId = getProjectId();
  return _projectId;
}

function getMemory(): MemoryEngine {
  if (!_memory) {
    _memory = new MemoryEngine(getDbPath());
    if (_memory.isHealthy()) {
      console.error(`✓ Database initialized at: ${getDbPath()}`);
    } else {
      const initError = _memory.getInitError();
      console.error(`✗ Failed to initialize database at ${getDbPath()}:`, initError?.message);
    }
  }
  return _memory;
}

function resetState(): void {
  _dbPath = null;
  _projectId = null;
  _memory = null;
  activeSessionId = null;
}

/**
 * Parse human-readable duration string (e.g. '30m', '2h', '1d', '24h') to milliseconds.
 * Returns null if the format is invalid.
 */
function parseDuration(input: string): number | null {
  const match = input.match(/^(\d+(?:\.\d+)?)\s*(ms|s|m|h|d)$/i);
  if (!match) return null;
  const value = parseFloat(match[1]);
  const unit = match[2].toLowerCase();
  switch (unit) {
    case 'ms': return value;
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: return null;
  }
}

async function getOrCreateSessionId(projectId: string): Promise<number> {
  if (activeSessionId) return activeSessionId;
  const session = await getMemory().createSession({ projectId, endedAt: null, metadata: {} });
  activeSessionId = session.id;
  return session.id;
}

const program = new Command();
program
  .name('memento')
  .description('Persistent memory system for AI coding agents')
  .version('1.0.0');

// ─── Search ─────────────────────────────────────────────────

program
  .command('search <query>')
  .description('Search observations')
  .option('-t, --type <type>', 'Filter by type')
  .option('-p, --project <project>', 'Filter by project')
  .option('--limit <number>', 'Limit results')
  .option('--include-deleted', 'Include soft-deleted observations')
  .action(async (query: string, options: any) => {
    const result = await getMemory().search({
      query,
      type: options.type,
      projectId: options.project,
      limit: options.limit ? parseInt(options.limit) : undefined,
      includeDeleted: options.includeDeleted,
    });
    console.log(`Found ${result.total} observations:`);
    result.observations.forEach((obs: Observation) => {
      const deleted = obs.deletedAt ? ' [DELETED]' : '';
      console.log(
        `  [${obs.type}] ${obs.title}${deleted}\n    ${obs.content.substring(0, 100)}...`
      );
    });
    getMemory().close();
  });

// ─── Save ───────────────────────────────────────────────────

program
  .command('save <title> <content>')
  .description('Save an observation')
  .option('-t, --type <type>', 'Observation type', 'note')
  .option('-k, --topic <topic>', 'Topic key')
  .option('-p, --project <project>', 'Project ID', getProjectIdCached())
  .action(async (title: string, content: string, options: any) => {
    const sessionId = await getOrCreateSessionId(options.project);
    const observation = await getMemory().createObservation({
      sessionId,
      title,
      content,
      type: options.type,
      topicKey: options.topic || null,
      projectId: options.project,
      metadata: {},
    });
    console.log(`Saved observation: ${observation.uuid}`);
    getMemory().close();
  });

// ─── Get ────────────────────────────────────────────────────

program
  .command('get <id>')
  .description('Get observation by ID')
  .action(async (id: string) => {
    const observation = await getMemory().getObservation(parseInt(id));
    if (!observation) {
      console.error('Observation not found');
      getMemory().close();
      return;
    }
    console.log(
      `[${observation.type}] ${observation.title}\n${observation.content}\nTopic: ${observation.topicKey || 'none'}\nCreated: ${observation.createdAt.toISOString()}`
    );
    getMemory().close();
  });

// ─── Update ─────────────────────────────────────────────────

program
  .command('update <id>')
  .description('Update observation')
  .option('-t, --title <title>', 'New title')
  .option('-c, --content <content>', 'New content')
  .option('-k, --topic <topic>', 'New topic key')
  .action(async (id: string, options: any) => {
    const updates: any = {};
    if (options.title) updates.title = options.title;
    if (options.content) updates.content = options.content;
    if (options.topic) updates.topicKey = options.topic;
    const observation = await getMemory().updateObservation(parseInt(id), updates);
    console.log(`Updated observation: ${observation.uuid}`);
    getMemory().close();
  });

// ─── Delete (soft) ──────────────────────────────────────────

program
  .command('delete <id>')
  .description('Soft-delete observation (can be restored)')
  .option('-r, --reason <reason>', 'Reason for deletion')
  .action(async (id: string, options: any) => {
    await getMemory().deleteObservation(parseInt(id), options.reason);
    console.log(
      `Soft-deleted observation ${id} (use 'restore' to undo, 'purge' to permanently delete)`
    );
    getMemory().close();
  });

// ─── Restore ────────────────────────────────────────────────

program
  .command('restore <id>')
  .description('Restore a soft-deleted observation')
  .action(async (id: string) => {
    const obs = await getMemory().restoreObservation(parseInt(id));
    console.log(`Restored observation: ${obs.uuid} — "${obs.title}"`);
    getMemory().close();
  });

// ─── Purge ──────────────────────────────────────────────────

program
  .command('purge')
  .description('Permanently delete soft-deleted observations (IRREVERSIBLE)')
  .option('-p, --project <project>', 'Purge only for this project')
  .option('--yes', 'Skip confirmation')
  .action(async (options: any) => {
    if (!options.yes) {
      console.error('⚠️  This will PERMANENTLY delete all soft-deleted observations.');
      console.error('   Use --yes to confirm.');
      getMemory().close();
      return;
    }

    const result = await getMemory().purgeObservations({ projectId: options.project });
    console.log(`Purged ${result.purgedCount} observations permanently.`);
    if (result.purgedIds.length > 0) {
      console.log(`IDs: ${result.purgedIds.join(', ')}`);
    }
    getMemory().close();
  });

// ─── List Deleted ───────────────────────────────────────────

program
  .command('list-deleted')
  .description('List soft-deleted observations')
  .option('-p, --project <project>', 'Filter by project')
  .option('-l, --limit <number>', 'Limit results', '20')
  .action(async (options: any) => {
    const result = await getMemory().listDeleted({
      projectId: options.project,
      limit: parseInt(options.limit),
    });
    console.log(`Soft-deleted observations (${result.total} total):`);
    result.observations.forEach((obs: Observation) => {
      console.log(`  [#${obs.id}] ${obs.title} — deleted: ${obs.deletedAt?.toISOString()}`);
    });
    getMemory().close();
  });

// ─── Merge ──────────────────────────────────────────────────

program
  .command('merge')
  .description('Merge related observations')
  .requiredOption('-p, --project <project>', 'Project ID')
  .option('-s, --strategy <strategy>', 'Strategy: by_topic, by_similarity, by_ids', 'by_topic')
  .option('-k, --topic <topic>', 'Merge only this topic key')
  .option('--dry-run', 'Preview candidates without executing')
  .action(async (options: any) => {
    const results = await getMemory().mergeObservations({
      projectId: options.project,
      topicKey: options.topic,
      strategy: options.strategy,
      dryRun: options.dryRun,
    });

    if (options.dryRun) {
      console.log(`Merge candidates (dry run — no changes made):`);
    } else {
      console.log(`Merge results:`);
    }

    for (const r of results) {
      console.log(
        `  Merged ${r.originalCount} obs → #${r.mergedObservation.id} "${r.mergedObservation.title}" (deleted: ${r.deletedIds.join(', ')})`
      );
    }

    if (results.length === 0) {
      console.log('  No candidates found for merging.');
    }

    getMemory().close();
  });

// ─── Export ─────────────────────────────────────────────────

program
  .command('export')
  .description('Export observations to JSON, XML, or TXT')
  .option('-f, --format <format>', 'Format: json, xml, txt', 'json')
  .option('-p, --project <project>', 'Filter by project')
  .option('-t, --type <type>', 'Filter by type')
  .option('-k, --topic <topic>', 'Filter by topic key')
  .option('--from <date>', 'Export from this date (ISO format)')
  .option('--to <date>', 'Export until this date (ISO format)')
  .option('--include-deleted', 'Include soft-deleted observations')
  .option('-o, --output <file>', 'Output file path (default: stdout)')
  .action(async (options: any) => {
    const result = await getMemory().exportObservations({
      format: options.format as ExportFormat,
      projectId: options.project,
      type: options.type,
      topicKey: options.topic,
      dateFrom: options.from ? new Date(options.from) : undefined,
      dateTo: options.to ? new Date(options.to) : undefined,
      includeDeleted: options.includeDeleted,
    });

    if (options.output) {
      const { writeFileSync } = await import('fs');
      writeFileSync(options.output, result.content, 'utf-8');
      console.error(
        `Exported ${result.recordCount} observations to ${options.output} (${result.format})`
      );
    } else {
      console.log(result.content);
    }

    getMemory().close();
  });

// ─── Timeline ───────────────────────────────────────────────

program
  .command('timeline [project]')
  .description('Show timeline')
  .option('-l, --limit <number>', 'Limit results', '20')
  .action(async (project: string, options: any) => {
    const result = await getMemory().search({ projectId: project, limit: parseInt(options.limit) });
    console.log(`Timeline (${result.total} observations):`);
    result.observations.forEach((obs: Observation) => {
      console.log(`  ${obs.createdAt.toLocaleDateString()} [${obs.type}] ${obs.title}`);
    });
    getMemory().close();
  });

// ─── Stats ──────────────────────────────────────────────────

program
  .command('stats')
  .description('Show statistics')
  .action(async () => {
    const result = await getMemory().search({});
    const deleted = await getMemory().listDeleted({});
    const byType: Record<string, number> = {};
    result.observations.forEach((obs: Observation) => {
      byType[obs.type] = (byType[obs.type] || 0) + 1;
    });
    console.log(`Statistics:`);
    console.log(`  Total observations: ${result.total}`);
    console.log(`  Soft-deleted: ${deleted.total}`);
    console.log(`  By type:`);
    Object.entries(byType).forEach(([type, count]) => {
      console.log(`    ${type}: ${count}`);
    });
    getMemory().close();
  });

// ─── Install Skill ──────────────────────────────────────────

program
  .command('install-skill')
  .description('Install Memento AI skill and slash commands for coding agents')
  .option('--target <target>', 'Target: opencode, claude, or a custom path', 'opencode')
  .action(async (options: any) => {
    const target = options.target;

    // Resolve SKILL.md source — try multiple locations
    const skillPaths: string[] = [];

    // npm package location
    try {
      const pkgRoot = dirname(require.resolve('@slorenzot/memento-mcp-server/package.json'));
      skillPaths.push(join(pkgRoot, 'skills', 'memento', 'SKILL.md'));
    } catch { /* not installed as package */ }

    // Fallback: relative to this CLI package (monorepo dev)
    skillPaths.push(
      join(__dirname, '..', '..', 'mcp-server', 'skills', 'memento', 'SKILL.md'),
      join(__dirname, '..', '..', '..', 'packages', 'mcp-server', 'skills', 'memento', 'SKILL.md')
    );

    let sourcePath: string | null = null;
    for (const p of skillPaths) {
      if (existsSync(p)) { sourcePath = p; break; }
    }

    // Determine destination directories
    let skillDestDir: string;
    let commandsDestDir: string;

    switch (target) {
      case 'opencode':
        skillDestDir = join(homedir(), '.config', 'opencode', 'skills', 'memento');
        commandsDestDir = join(homedir(), '.config', 'opencode', 'commands');
        break;
      case 'claude':
        skillDestDir = join(homedir(), '.claude', 'skills', 'memento');
        commandsDestDir = join(homedir(), '.claude', 'commands');
        break;
      default:
        skillDestDir = join(target, 'skills', 'memento');
        commandsDestDir = join(target, 'commands');
        break;
    }

    // Install SKILL.md
    if (sourcePath) {
      mkdirSync(skillDestDir, { recursive: true });
      copyFileSync(sourcePath, join(skillDestDir, 'SKILL.md'));
      console.log(`  ✓ Skill: ${join(skillDestDir, 'SKILL.md')}`);
    } else {
      console.error('  ⚠ SKILL.md not found (skill skipped)');
    }

    // Install slash commands
    const cmdPaths: string[] = [];

    try {
      const pkgRoot = dirname(require.resolve('@slorenzot/memento-mcp-server/package.json'));
      cmdPaths.push(join(pkgRoot, 'commands'));
    } catch { /* not installed as package */ }

    cmdPaths.push(
      join(__dirname, '..', '..', 'mcp-server', 'commands'),
      join(__dirname, '..', '..', '..', 'packages', 'mcp-server', 'commands')
    );

    let commandsDir: string | null = null;
    for (const d of cmdPaths) {
      if (existsSync(d)) { commandsDir = d; break; }
    }

    if (commandsDir) {
      const commandFiles = readdirSync(commandsDir).filter((f: string) => f.endsWith('.md'));
      if (commandFiles.length > 0) {
        mkdirSync(commandsDestDir, { recursive: true });
        for (const file of commandFiles) {
          const src = join(commandsDir, file);
          const dest = join(commandsDestDir, file);
          copyFileSync(src, dest);
          console.log(`  ✓ Command: /${file.replace('.md', '')}`);
        }
      } else {
        console.error('  ⚠ No command files found in commands/');
      }
    } else {
      console.error('  ⚠ commands/ directory not found (commands skipped)');
    }

    console.log(`\n  Target: ${target}`);
    console.log('  The AI agent will now know how to use all mem_* tools.');
  });

// ─── Helpers ────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function getDbSize(path: string): string {
  try {
    let total = statSync(path).size;
    try { total += statSync(`${path}-wal`).size; } catch { /* no WAL */ }
    try { total += statSync(`${path}-shm`).size; } catch { /* no SHM */ }
    return formatBytes(total);
  } catch {
    return 'unknown';
  }
}

function relativeTime(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

// ─── Status ─────────────────────────────────────────────────

program
  .command('status')
  .description('Quick health check and executive summary')
  .action(async () => {
    const mem = getMemory();
    const healthy = mem.isHealthy();
    const currentDbPath = getDbPath();
    const dbSize = getDbSize(currentDbPath);
    const dashboard = healthy ? await mem.getDashboardStats() : null;
    const initError = mem.getInitError();

    const W = 42;
    const line = (s: string) => `│ ${s.padEnd(W - 2)}│`;
    const border = (l: string, r: string) => l + '─'.repeat(W - 2) + r;

    console.log(border('╭', '╮'));
    console.log(line('MEMENTO STATUS'));
    console.log(border('├', '┤'));
    console.log(line(`Database:   ${healthy ? '✓' : '✗'} ${healthy ? 'healthy' : 'unhealthy'}`));

    if (!healthy && initError) {
      console.log(line(`Error:      ${initError.message.substring(0, W - 14)}`));
    }

    console.log(line(`Path:       ${currentDbPath}`));
    console.log(line(`Project:    ${getProjectIdCached()}`));

    if (dashboard) {
      console.log(line(`Session:    ${dashboard.activeSessions > 0 ? `#${dashboard.activeSessions} (active)` : 'none'}`));
      console.log(line(''));
      console.log(line(`Observations: ${dashboard.activeObservations} active, ${dashboard.deletedObservations} deleted`));

      const types = Object.entries(dashboard.byType)
        .filter(([, c]) => c > 0)
        .map(([t, c]) => `${t}: ${c}`)
        .join('  │  ');
      if (types) console.log(line(`  ${types}`));

      if (dashboard.recentObservations.length > 0) {
        const last = dashboard.recentObservations[0];
        console.log(line(''));
        console.log(line(`Last activity: ${last.createdAt.toLocaleString()}`));
      }
    }

    console.log(line(`DB size:    ${dbSize}`));
    console.log(border('╰', '╯'));

    mem.close();
  });

// ─── Recents ────────────────────────────────────────────────

program
  .command('recents')
  .description('Show recent observations in compact format')
  .option('-l, --limit <n>', 'Max results', '10')
  .option('-p, --project <project>', 'Filter by project')
  .option('-t, --type <type>', 'Filter by type')
  .option('--hours <n>', 'Only observations from last N hours', '24')
  .action(async (options: any) => {
    const hours = parseInt(options.hours);
    const limit = parseInt(options.limit);
    const since = new Date(Date.now() - hours * 3600000);

    const result = await getMemory().search({
      projectId: options.project,
      type: options.type,
      limit,
    });

    const observations = result.observations.filter((obs: Observation) => obs.createdAt >= since);

    const W = 58;
    const line = (s: string) => `│ ${s.padEnd(W - 2)}│`;
    const border = (l: string, r: string) => l + '─'.repeat(W - 2) + r;

    console.log(border('╭', '╮'));
    console.log(line(`RECENT OBSERVATIONS (last ${hours}h)`));
    console.log(border('├', '┤'));

    if (observations.length === 0) {
      console.log(line('  No observations in this period.'));
    } else {
      for (const obs of observations) {
        const badge = `[${obs.type}]`.padEnd(12);
        const time = relativeTime(obs.createdAt).padStart(12);
        const maxTitleLen = W - badge.length - time.length - 6;
        const title = obs.title.length > maxTitleLen
          ? obs.title.substring(0, maxTitleLen - 1) + '…'
          : obs.title;
        console.log(line(`#${obs.id} ${badge}${title.padEnd(maxTitleLen)}${time}`));
      }
    }

    console.log(border('╰', '╯'));
    console.log(`  Showing ${observations.length} of ${result.total} total observations.`);

    getMemory().close();
  });

// ─── Sessions ───────────────────────────────────────────────

const sessionsCommand = program
  .command('sessions')
  .description('Manage memory sessions');

sessionsCommand
  .command('list')
  .description('List sessions')
  .option('-p, --project <project>', 'Filter by project')
  .option('--active', 'Show only active (unclosed) sessions')
  .option('-l, --limit <number>', 'Max results', '20')
  .action(async (options: any) => {
    const result = await getMemory().listSessions({
      projectId: options.project,
      activeOnly: options.active || false,
      limit: parseInt(options.limit),
    });

    const W = 60;
    const line = (s: string) => `│ ${s.padEnd(W - 2)}│`;
    const border = (l: string, r: string) => l + '─'.repeat(W - 2) + r;

    console.log(border('╭', '╮'));
    console.log(line(`SESSIONS${options.active ? ' (active only)' : ''}`));
    console.log(border('├', '┤'));

    if (result.sessions.length === 0) {
      console.log(line('  No sessions found.'));
    } else {
      for (const s of result.sessions) {
        const status = s.endedAt ? 'closed' : 'active';
        const autoClosed = s.metadata?.auto_closed ? ' [auto-closed]' : '';
        const time = relativeTime(s.startedAt).padStart(10);
        const maxProjectLen = W - 14 - time.length - 4;
        const project = s.projectId.length > maxProjectLen
          ? s.projectId.substring(0, maxProjectLen - 1) + '…'
          : s.projectId;
        console.log(line(`#${s.id} ${project} │ ${status}${autoClosed} │ ${time}`));
      }
    }

    console.log(border('╰', '╯'));
    console.log(`  Showing ${result.sessions.length} of ${result.total} total sessions.`);

    getMemory().close();
  });

sessionsCommand
  .command('cleanup')
  .description('Close stale (orphaned) sessions')
  .option('--max-age <duration>', 'Max age before considering stale (e.g. 30m, 2h, 1d)', '24h')
  .option('--all', 'Close ALL active sessions regardless of age')
  .option('-p, --project <project>', 'Only close sessions for a specific project')
  .action(async (options: any) => {
    const engine = getMemory();

    let maxAgeMs: number;
    if (options.all) {
      maxAgeMs = Infinity; // Will match all sessions
    } else {
      maxAgeMs = parseDuration(options.maxAge) ?? getStaleThresholdMs();
    }

    let result: { closed: number };

    if (options.project) {
      result = engine.closeStaleSessionsForProject(
        options.project,
        options.all ? 0 : maxAgeMs
      );
    } else {
      if (options.all) {
        // Close ALL active sessions — use maxAge=0 (anything older than "now" is stale)
        result = engine.closeStaleSessions(0);
      } else {
        result = engine.closeStaleSessions(maxAgeMs);
      }
    }

    if (result.closed > 0) {
      console.log(`Closed ${result.closed} stale session(s).`);
    } else {
      console.log('No stale sessions found.');
    }

    engine.close();
  });

// ─── Project Management (Issue #177) ─────────────────────────

const projectCommand = program
  .command('project')
  .description('Manage project identifiers and fix fragmentation');

projectCommand
  .command('list')
  .description('List all projects with observation counts')
  .action(async () => {
    const mem = getMemory();
    const projects = await mem.listProjects();
    if (projects.length === 0) {
      console.log('No projects found.');
      mem.close();
      return;
    }

    console.log(`\nProjects (${projects.length}):\n`);
    console.log('  Project Name'.padEnd(45) + 'Active  Deleted  Last Activity');
    console.log('  ' + '─'.repeat(75));
    for (const p of projects) {
      const lastActivity = p.lastActivity
        ? p.lastActivity.toISOString().split('T')[0]
        : 'never';
      const name = p.name.length > 40 ? p.name.substring(0, 37) + '...' : p.name;
      console.log(
        `  ${name.padEnd(43)}${String(p.activeCount).padStart(5)}  ${String(p.deletedCount).padStart(7)}  ${lastActivity}`
      );
    }
    console.log('');
    mem.close();
  });

projectCommand
  .command('merge <source> <target>')
  .description('Move all observations from source project to target')
  .action(async (source, target) => {
    const mem = getMemory();
    const normalizedSource = normalizeProjectId(source);
    const normalizedTarget = normalizeProjectId(target);

    if (normalizedSource === normalizedTarget) {
      console.error(`Error: Source and target are the same after normalization: "${normalizedSource}"`);
      mem.close();
      return;
    }

    console.log(`Merging "${source}" → "${target}" (normalized: "${normalizedSource}" → "${normalizedTarget}")`);
    try {
      const result = mem.mergeProject(source, target);
      console.log(`  Observations moved: ${result.observationsMoved}`);
      console.log(`  Sessions moved: ${result.sessionsMoved}`);
      console.log(`  Journal entries moved: ${result.journalMoved}`);
      console.log(`  Prompts moved: ${result.promptsMoved}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Error: ${message}`);
    }
    mem.close();
  });

projectCommand
  .command('normalize')
  .description('Normalize all project_id values in the database (lowercase, hyphens, no spaces)')
  .action(async () => {
    const mem = getMemory();
    console.log('Normalizing all project_id values...');
    const result = mem.normalizeAllProjectIds();
    if (result.normalized === 0) {
      console.log('All project names are already normalized.');
    } else {
      console.log(`Normalized ${result.normalized} record(s).`);
      if (result.merged.length > 0) {
        for (const m of result.merged) {
          console.log(`  Merged "${m.from}" → "${m.to}" (${m.observationsMoved} observations)`);
        }
      }
    }
    mem.close();
  });

projectCommand
  .command('registered')
  .description('List registered (canonical) projects')
  .action(async () => {
    const mem = getMemory();
    const projects = mem.listRegisteredProjects();
    if (projects.length === 0) {
      console.log('No projects registered. Start an MCP server to auto-register.');
      mem.close();
      return;
    }

    console.log(`\nRegistered Projects (${projects.length}):\n`);
    for (const p of projects) {
      console.log(`  ${p.name}`);
      if (p.workingDir) console.log(`    Working dir: ${p.workingDir}`);
      if (p.aliases.length > 0) console.log(`    Aliases: ${p.aliases.join(', ')}`);
    }
    console.log('');
    mem.close();
  });

// ─── Init ──────────────────────────────────────────────────

program
  .command('init [path]')
  .description('Initialize Memento (creates centralized DB at ~/.memento/memento.db)')
  .option('--no-seed', 'Skip seed observations')
  .action(async (path: string | undefined, options: any) => {
    const seed = options.seed !== false; // --no-seed → options.seed = false
    const steps: { label: string; status: 'ok' | 'skip' | 'error'; detail?: string }[] = [];

    try {
      // ── Step 1: Ensure global dir ────────────────────────
      const initResult = ensureGlobalDir();
      steps.push({
        label: `Global dir: ${join(homedir(), '.memento')}`,
        status: 'ok',
        detail: initResult.created ? 'created' : 'already exists',
      });

      // ── Step 2: Initialize centralized database ──────────
      const dbPath = resolveDbPath();
      const engine = new MemoryEngine(dbPath);

      if (engine.isHealthy()) {
        steps.push({ label: `Database: ${dbPath}`, status: 'ok' });
      } else {
        const err = engine.getInitError();
        steps.push({ label: `Database: ${dbPath}`, status: 'error', detail: err?.message });
      }

      // ── Step 3: Seed observations ─────────────────────────
      if (seed && engine.isHealthy()) {
        const projectName = getProjectId();
        const session = await engine.createSession({
          projectId: projectName,
          endedAt: null,
          metadata: { source: 'memento-init' },
          seedIfEmpty: true,
        });
        await engine.endSession(session.id);

        // Check how many seeds were created
        const searchResult = await engine.search({ projectId: projectName, limit: 10 });
        const seedCount = searchResult.observations.filter(
          (obs: Observation) => obs.metadata?.seed === true
        ).length;

        if (seedCount > 0) {
          steps.push({ label: `Seeded ${seedCount} observations for project "${projectName}"`, status: 'ok' });
        } else {
          steps.push({ label: 'Seeded observations (project already has data)', status: 'skip' });
        }
      } else if (!seed) {
        steps.push({ label: 'Seed observations', status: 'skip', detail: '--no-seed' });
      }

      engine.close();

      printInitSummary(steps);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`\n  ✗ Init failed: ${message}`);
      process.exit(1);
    }
  });

function printInitSummary(
  steps: { label: string; status: 'ok' | 'skip' | 'error'; detail?: string }[]
): void {
  console.log('');
  const W = 54;
  const lr = '│';
  const line = (s: string) => `  ${lr} ${s.padEnd(W - 2)}${lr}`;
  const border = (l: string, r: string) => '  ' + l + '─'.repeat(W - 2) + r;

  console.log(border('╭', '╮'));
  console.log(line('MEMENTO INIT'));
  console.log(border('├', '┤'));
  console.log(line(`Database: ~/.memento/memento.db`));
  console.log(border('├', '┤'));

  for (const step of steps) {
    const icon = step.status === 'ok' ? '✓' : step.status === 'skip' ? '⊘' : '✗';
    const text = step.detail
      ? `${icon} ${step.label} (${step.detail})`
      : `${icon} ${step.label}`;
    // Truncate to fit box width
    const truncated = text.length > W - 4 ? text.substring(0, W - 5) + '…' : text;
    console.log(line(truncated));
  }

  // Setup instructions
  console.log(border('├', '┤'));
  console.log(line('Ready! Add to opencode.json:'));
  console.log(line(''));
  console.log(line('  "mcp": {'));
  console.log(line('    "servers": {'));
  console.log(line('      "memento": {'));
  console.log(line('        "command": "bun",'));
  console.log(line('        "args": ["run", "mcp"]'));
  console.log(line('      }'));
  console.log(line('    }'));
  console.log(line('  }'));
  console.log(border('╰', '╯'));
  console.log('');
}

// ─── Auth Commands (Issue #211) ──────────────────────────────

const authCommand = program
  .command('auth')
  .description('Manage authentication with memento-web');

authCommand
  .command('status')
  .description('Show authentication state')
  .action(async () => {
    const store = new TokenStore();
    const W = 48;
    const lr = '│';
    const line = (s: string) => `  ${lr} ${s.padEnd(W - 2)}${lr}`;
    const border = (l: string, r: string) => '  ' + l + '─'.repeat(W - 2) + r;

    console.log(border('╭', '╮'));
    console.log(line('MEMENTO AUTH'));
    console.log(border('├', '┤'));

    if (store.isAuthenticated()) {
      const user = store.getUser();
      const serverUrl = store.getServerUrl();
      const remaining = store.getTimeUntilExpiry();
      const hours = Math.floor(remaining / 3600);
      const minutes = Math.floor((remaining % 3600) / 60);

      console.log(line('  Status:    ✓ Authenticated'));
      if (user?.email) console.log(line(`  User:      ${user.email}`));
      if (user?.name) console.log(line(`  Name:      ${user.name}`));
      if (serverUrl) console.log(line(`  Server:    ${serverUrl}`));
      console.log(line(`  Expires:   ${hours}h ${minutes}m remaining`));
      console.log(line(`  Token:     ${store.getFilePath()}`));
    } else {
      const token = store.getToken();
      if (token) {
        console.log(line('  Status:    ✗ Token expired'));
        console.log(line(`  Server:    ${token.serverUrl || 'unknown'}`));
        console.log(line('  Run `memento login` to re-authenticate'));
      } else {
        console.log(line('  Status:    ✗ Not authenticated'));
        console.log(line('  Run `memento login` to get started'));
      }
    }

    console.log(border('╰', '╯'));
  });

// ─── Login ─────────────────────────────────────────────────

program
  .command('login')
  .description('Authenticate with memento-web using OAuth device flow')
  .option('-s, --server <url>', 'Server URL', 'https://memento-web.app')
  .action(async (options: any) => {
    const serverUrl = options.server;
    const store = new TokenStore();

    // Check if already authenticated
    if (store.isAuthenticated()) {
      const user = store.getUser();
      console.log(`Already authenticated as ${user?.email || 'unknown user'}`);
      console.log(`Run \`memento logout\` first to switch accounts.`);
      return;
    }

    const client = new DeviceFlowClient({ serverUrl });

    try {
      const result = await client.authorize({
        onCode: (code) => {
          const W = 46;
          const lr = '│';
          const line = (s: string) => `  ${lr} ${s.padEnd(W - 2)}${lr}`;
          const border = (l: string, r: string) => '  ' + l + '─'.repeat(W - 2) + r;

          console.log(border('╭', '╮'));
          console.log(line('MEMENTO LOGIN'));
          console.log(border('├', '┤'));
          console.log(line(''));
          console.log(line('  Abre en tu navegador:'));
          console.log(line(`  ${code.verification_uri}`));
          console.log(line(''));
          console.log(line('  E ingresa el código:'));
          console.log(line(''));
          console.log(line(`    ${code.user_code}`));
          console.log(line(''));
          console.log(border('╰', '╯'));

          // Try to open browser automatically
          try {
            const url = code.verification_uri_complete || code.verification_uri;
            const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
            execSync(`${cmd} "${url}"`, { stdio: 'ignore' });
            console.log('  Opening browser...');
          } catch {
            // Couldn't open browser — user will copy URL manually
          }

          console.log('');
          process.stdout.write('  ⠋ Esperando autorización');
        },
        onPoll: (attempt: number) => {
          const spinners = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
          const spinner = spinners[attempt % spinners.length];
          process.stdout.write(`\r  ${spinner} Esperando autorización (${attempt})`);
        },
      });

      console.log(''); // New line after spinner

      if (result.success && result.token) {
        const auth = store.setToken(result.token, serverUrl);
        const user = auth.user;
        console.log(`  ✅ Autenticado como ${user?.email || 'usuario'}`);
        console.log(`  Token guardado en ${store.getFilePath()}`);
      } else {
        console.error(`  ✗ Error: ${result.errorDescription || result.error || 'Unknown error'}`);
        process.exit(1);
      }
    } catch (error: unknown) {
      console.error('');
      if (error instanceof Error) {
        console.error(`  ✗ Error: ${error.message}`);
      } else {
        console.error(`  ✗ Error: ${String(error)}`);
      }
      process.exit(1);
    }
  });

// ─── Logout ────────────────────────────────────────────────

program
  .command('logout')
  .description('Clear stored authentication token')
  .action(async () => {
    const store = new TokenStore();

    if (!store.getToken()) {
      console.log('No active session to logout from.');
      return;
    }

    store.clearToken();
    console.log('✅ Sesión cerrada. Token eliminado.');
    console.log(`Run \`memento login\` to authenticate again.`);
  });

program.parseAsync(process.argv);
