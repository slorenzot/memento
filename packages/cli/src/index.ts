#!/usr/bin/env node

import { Command } from 'commander';
import { MemoryEngine, loadConfig, resolveDbPath, getProjectId } from '@slorenzot/memento-core';
import type { Observation, ExportFormat } from '@slorenzot/memento-core';
import { existsSync, mkdirSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';

const config = loadConfig();
const dbPath = resolveDbPath(config);
const projectId = getProjectId(config);
const memory = new MemoryEngine(dbPath);
if (memory.isHealthy()) {
  console.error(`✓ Database initialized successfully at: ${dbPath}`);
} else {
  const initError = memory.getInitError();
  console.error(`✗ Failed to initialize database at ${dbPath}:`, initError?.message);
}
let activeSessionId: number | null = null;

async function getOrCreateSessionId(projectId: string): Promise<number> {
  if (activeSessionId) return activeSessionId;
  const session = await memory.createSession({ projectId, endedAt: null, metadata: {} });
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
    const result = await memory.search({
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
    memory.close();
  });

// ─── Save ───────────────────────────────────────────────────

program
  .command('save <title> <content>')
  .description('Save an observation')
  .option('-t, --type <type>', 'Observation type', 'note')
  .option('-k, --topic <topic>', 'Topic key')
  .option('-p, --project <project>', 'Project ID', projectId)
  .action(async (title: string, content: string, options: any) => {
    const sessionId = await getOrCreateSessionId(options.project);
    const observation = await memory.createObservation({
      sessionId,
      title,
      content,
      type: options.type,
      topicKey: options.topic || null,
      projectId: options.project,
      metadata: {},
    });
    console.log(`Saved observation: ${observation.uuid}`);
    memory.close();
  });

// ─── Get ────────────────────────────────────────────────────

program
  .command('get <id>')
  .description('Get observation by ID')
  .action(async (id: string) => {
    const observation = await memory.getObservation(parseInt(id));
    if (!observation) {
      console.error('Observation not found');
      memory.close();
      return;
    }
    console.log(
      `[${observation.type}] ${observation.title}\n${observation.content}\nTopic: ${observation.topicKey || 'none'}\nCreated: ${observation.createdAt.toISOString()}`
    );
    memory.close();
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
    const observation = await memory.updateObservation(parseInt(id), updates);
    console.log(`Updated observation: ${observation.uuid}`);
    memory.close();
  });

// ─── Delete (soft) ──────────────────────────────────────────

program
  .command('delete <id>')
  .description('Soft-delete observation (can be restored)')
  .option('-r, --reason <reason>', 'Reason for deletion')
  .action(async (id: string, options: any) => {
    await memory.deleteObservation(parseInt(id), options.reason);
    console.log(
      `Soft-deleted observation ${id} (use 'restore' to undo, 'purge' to permanently delete)`
    );
    memory.close();
  });

// ─── Restore ────────────────────────────────────────────────

program
  .command('restore <id>')
  .description('Restore a soft-deleted observation')
  .action(async (id: string) => {
    const obs = await memory.restoreObservation(parseInt(id));
    console.log(`Restored observation: ${obs.uuid} — "${obs.title}"`);
    memory.close();
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
      memory.close();
      return;
    }

    const result = await memory.purgeObservations({ projectId: options.project });
    console.log(`Purged ${result.purgedCount} observations permanently.`);
    if (result.purgedIds.length > 0) {
      console.log(`IDs: ${result.purgedIds.join(', ')}`);
    }
    memory.close();
  });

// ─── List Deleted ───────────────────────────────────────────

program
  .command('list-deleted')
  .description('List soft-deleted observations')
  .option('-p, --project <project>', 'Filter by project')
  .option('-l, --limit <number>', 'Limit results', '20')
  .action(async (options: any) => {
    const result = await memory.listDeleted({
      projectId: options.project,
      limit: parseInt(options.limit),
    });
    console.log(`Soft-deleted observations (${result.total} total):`);
    result.observations.forEach((obs: Observation) => {
      console.log(`  [#${obs.id}] ${obs.title} — deleted: ${obs.deletedAt?.toISOString()}`);
    });
    memory.close();
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
    const results = await memory.mergeObservations({
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

    memory.close();
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
    const result = await memory.exportObservations({
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

    memory.close();
  });

// ─── Timeline ───────────────────────────────────────────────

program
  .command('timeline [project]')
  .description('Show timeline')
  .option('-l, --limit <number>', 'Limit results', '20')
  .action(async (project: string, options: any) => {
    const result = await memory.search({ projectId: project, limit: parseInt(options.limit) });
    console.log(`Timeline (${result.total} observations):`);
    result.observations.forEach((obs: Observation) => {
      console.log(`  ${obs.createdAt.toLocaleDateString()} [${obs.type}] ${obs.title}`);
    });
    memory.close();
  });

// ─── Stats ──────────────────────────────────────────────────

program
  .command('stats')
  .description('Show statistics')
  .action(async () => {
    const result = await memory.search({});
    const deleted = await memory.listDeleted({});
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
    memory.close();
  });

// ─── Install Skill ──────────────────────────────────────────

program
  .command('install-skill')
  .description('Install Memento AI skill for coding agents')
  .option('--target <target>', 'Target: opencode, claude, or a custom path', 'opencode')
  .action(async (options: any) => {
    const target = options.target;

    // Resolve SKILL.md source — try multiple locations
    const possiblePaths = [
      // When installed as npm package
      join(
        dirname(require.resolve('@slorenzot/memento-mcp-server/package.json')),
        'skills',
        'memento',
        'SKILL.md'
      ),
    ].filter(() => {
      try {
        require.resolve('@slorenzot/memento-mcp-server/package.json');
        return true;
      } catch {
        return false;
      }
    });

    // Fallback: relative to this CLI package (monorepo dev)
    possiblePaths.push(
      join(__dirname, '..', '..', 'mcp-server', 'skills', 'memento', 'SKILL.md'),
      join(__dirname, '..', '..', '..', 'packages', 'mcp-server', 'skills', 'memento', 'SKILL.md')
    );

    let sourcePath: string | null = null;
    for (const p of possiblePaths) {
      if (existsSync(p)) {
        sourcePath = p;
        break;
      }
    }

    if (!sourcePath) {
      console.error('Error: Could not find SKILL.md file.');
      console.error('Searched in:', possiblePaths);
      console.error('Make sure @slorenzot/memento-mcp-server is installed.');
      process.exit(1);
    }

    // Determine destination
    let destDir: string;

    switch (target) {
      case 'opencode':
        destDir = join(homedir(), '.config', 'opencode', 'skills', 'memento');
        break;
      case 'claude':
        destDir = join(homedir(), '.claude', 'skills', 'memento');
        break;
      default:
        // Custom path
        destDir = join(target, 'memento');
        break;
    }

    const destPath = join(destDir, 'SKILL.md');

    // Create directory and copy
    mkdirSync(destDir, { recursive: true });
    copyFileSync(sourcePath, destPath);

    console.log(`✓ Memento skill installed successfully!`);
    console.log(`  Source: ${sourcePath}`);
    console.log(`  Target: ${destPath}`);
    console.log(`  Agent: ${target}`);
    console.log(`\n  The AI agent will now know how to use all mem_* tools.`);
  });

program.parseAsync(process.argv);
