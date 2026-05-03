#!/usr/bin/env node

import { Command } from 'commander';
import { MemoryEngine, loadConfig, resolveDbPath, getProjectId } from '@slorenzot/memento-core';
import type { Observation } from '@slorenzot/memento-core';
import { existsSync, mkdirSync, copyFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';

const config = loadConfig();
const dbPath = resolveDbPath(config);
const projectId = getProjectId(config);
const memory = new MemoryEngine(dbPath);
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
  .version('0.2.0');

program
  .command('search <query>')
  .description('Search observations')
  .option('-t, --type <type>', 'Filter by type')
  .option('-p, --project <project>', 'Filter by project')
  .option('--limit <number>', 'Limit results')
  .action(async (query: string, options: any) => {
    const result = await memory.search({
      query,
      type: options.type,
      projectId: options.project,
      limit: options.limit ? parseInt(options.limit) : undefined,
    });
    console.log(`Found ${result.total} observations:`);
    result.observations.forEach((obs: Observation) => {
      console.log(`  [${obs.type}] ${obs.title}\n    ${obs.content.substring(0, 100)}...`);
    });
    memory.close();
  });

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

program
  .command('delete <id>')
  .description('Delete observation')
  .action(async (id: string) => {
    await memory.deleteObservation(parseInt(id));
    console.log(`Deleted observation ${id}`);
    memory.close();
  });

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

program
  .command('stats')
  .description('Show statistics')
  .action(async () => {
    const result = await memory.search({});
    const byType: Record<string, number> = {};
    result.observations.forEach((obs: Observation) => {
      byType[obs.type] = (byType[obs.type] || 0) + 1;
    });
    console.log(`Statistics:\n  Total observations: ${result.total}\n  By type:`);
    Object.entries(byType).forEach(([type, count]) => {
      console.log(`    ${type}: ${count}`);
    });
    memory.close();
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

program.parseAsync(process.argv);
