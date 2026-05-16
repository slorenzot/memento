import { Command } from 'commander';
import { MemoryEngine, resolveDbPath, getProjectId, normalizeProjectId, ensureGlobalDir } from '@slorenzot/memento-core';
import { SyncEngine, TokenStore, DeviceFlowClient } from '@slorenzot/memento-core';
import type { Observation } from '@slorenzot/memento-core';

// @ts-ignore
export class CLI {
  private program: Command;
  private memory: MemoryEngine;
  private activeSessionId: number | null = null;
  private projectId: string;

  constructor() {
    ensureGlobalDir();
    const dbPath = resolveDbPath();
    this.projectId = getProjectId();

    this.program = new Command();
    this.memory = new MemoryEngine(dbPath);
    if (this.memory.isHealthy()) {
      console.error(`✓ Database initialized successfully at: ${dbPath}`);
    } else {
      const initError = this.memory.getInitError();
      console.error(`✗ Failed to initialize database at ${dbPath}:`, initError?.message);
    }
    this.setupCommands();
  }

  private setupCommands() {
    this.program
      .name('memento')
      .description('Persistent memory system for AI coding agents')
      .version('0.1.0');

    this.program
      .command('setup [agent]')
      .description('Setup configuration for an AI agent')
      .action((agent) => {
        console.log(`Setup for agent: ${agent || 'default'}`);
        console.log('Configuration saved to ~/.memento/config.json');
      });

    this.program
      .command('serve [port]')
      .description('Start API server')
      .option('-d, --db <path>', 'Database path', './data/memento.db')
      .action((port, options) => {
        console.log(`Starting API server on port ${port || 3000}`);
        console.log(`Database: ${options.db}`);
        console.log('Note: API server not implemented in CLI mode');
      });

    this.program
      .command('mcp')
      .description('Start MCP server')
      .option('-d, --db <path>', 'Database path', './data/memento.db')
      .action((options) => {
        console.log(`Starting MCP server`);
        console.log(`Database: ${options.db}`);
        console.log('Note: MCP server not implemented in CLI mode');
      });

    this.program
      .command('search <query>')
      .description('Search observations')
      .option('-t, --type <type>', 'Filter by type')
      .option('-p, --project <project>', 'Filter by project')
      .option('--limit <number>', 'Limit results')
      .action(async (query, options) => {
        const result = await this.memory.search({
          query,
          type: options.type as Observation['type'] | undefined,
          projectId: options.project as string | undefined,
          limit: options.limit ? parseInt(options.limit as string) : undefined,
        });
        console.log(`Found ${result.total} observations:`);
        result.observations.forEach((obs) => {
          console.log(`  [${obs.type}] ${obs.title}`);
          console.log(`    ${obs.content.substring(0, 100)}...`);
        });
      });

    this.program
      .command('save <title> <content>')
      .description('Save an observation')
      .option('-t, --type <type>', 'Observation type', 'note')
      .option('-k, --topic <topic>', 'Topic key')
      .option('-p, --project <project>', 'Project ID', this.projectId)
      .action(async (title, content, options) => {
        const sessionId = await this.getOrCreateSessionId(options.project as string);
        const observation = await this.memory.createObservation({
          sessionId,
          title,
          content,
          type: options.type as Observation['type'],
          topicKey: options.topic || null,
          projectId: options.project as string,
          metadata: {},
        });
        console.log(`Saved observation: ${observation.uuid}`);
      });

    this.program
      .command('get <id>')
      .description('Get observation by ID')
      .action(async (id) => {
        const observation = await this.memory.getObservation(parseInt(id));
        if (!observation) {
          console.error('Observation not found');
          return;
        }
        console.log(`[${observation.type}] ${observation.title}`);
        console.log(observation.content);
        console.log(`Topic: ${observation.topicKey || 'none'}`);
        console.log(`Created: ${observation.createdAt.toISOString()}`);
      });

    this.program
      .command('update <id>')
      .description('Update observation')
      .option('-t, --title <title>', 'New title')
      .option('-c, --content <content>', 'New content')
      .option('-k, --topic <topic>', 'New topic key')
      .action(async (id, options) => {
        const updates: Partial<Observation> = {};
        if (options.title) updates.title = options.title;
        if (options.content) updates.content = options.content;
        if (options.topic) updates.topicKey = options.topic;

        const observation = await this.memory.updateObservation(parseInt(id), updates);
        console.log(`Updated observation: ${observation.uuid}`);
      });

    this.program
      .command('delete <id>')
      .description('Delete observation')
      .action(async (id) => {
        await this.memory.deleteObservation(parseInt(id));
        console.log(`Deleted observation ${id}`);
      });

    this.program
      .command('timeline [project]')
      .description('Show timeline of observations')
      .option('-l, --limit <number>', 'Limit results', '20')
      .action(async (project, options) => {
        const result = await this.memory.search({
          projectId: project,
          limit: parseInt(options.limit as string),
        });
        console.log(`Timeline (${result.total} observations):`);
        result.observations.forEach((obs) => {
          const date = obs.createdAt.toLocaleDateString();
          console.log(`  ${date} [${obs.type}] ${obs.title}`);
        });
      });

    this.program
      .command('stats')
      .description('Show statistics')
      .action(async () => {
        const result = await this.memory.search({});
        const byType = result.observations.reduce(
          (acc, obs) => {
            acc[obs.type] = (acc[obs.type] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        );
        console.log('Statistics:');
        console.log(`  Total observations: ${result.total}`);
        console.log('  By type:');
        Object.entries(byType).forEach(([type, count]) => {
          console.log(`    ${type}: ${count}`);
        });
      });

    // ─── Pin / Unpin commands ──────────────────────────────────

    this.program
      .command('pin <id>')
      .description('Pin an observation for system prompt injection')
      .action(async (id) => {
        const obs = await this.memory.pinObservation(parseInt(id));
        console.log(`📌 Observation #${obs.id} "${obs.title}" pinned — will be included in system prompt`);
      });

    this.program
      .command('unpin <id>')
      .description('Unpin an observation')
      .action(async (id) => {
        const obs = await this.memory.unpinObservation(parseInt(id));
        console.log(`Observation #${obs.id} "${obs.title}" unpinned`);
      });

    // ─── Lock / Unlock commands ──────────────────────────────

    this.program
      .command('lock <id>')
      .description('Lock an observation as read-only')
      .action(async (id) => {
        const obs = await this.memory.lockObservation(parseInt(id));
        console.log(`🔒 Observation #${obs.id} "${obs.title}" locked (read-only)`);
      });

    this.program
      .command('unlock <id>')
      .description('Unlock a read-only observation')
      .action(async (id) => {
        const obs = await this.memory.unlockObservation(parseInt(id));
        console.log(`Observation #${obs.id} "${obs.title}" unlocked`);
      });

    // ─── Embedding commands ──────────────────────────────────

    this.program
      .command('backfill-embeddings')
      .description('Generate embeddings for observations that do not have them')
      .option('-b, --batch-size <number>', 'Batch size', '50')
      .action(async (options) => {
        const batchSize = parseInt(options.batchSize as string);
        console.log('Starting embedding backfill...');
        const status = await this.memory.getEmbeddingStatus();
        if (!status.available) {
          console.error(`Embedding service unavailable: ${status.error || 'model not loaded'}`);
          console.error('Install @huggingface/transformers to enable semantic search');
          return;
        }
        console.log(`Using model: ${status.model}`);
        const result = await this.memory.backfillEmbeddings(batchSize);
        console.log(`Backfill complete: ${result.processed} embeddings generated, ${result.failed} failed`);
      });

    // ─── Project commands (Issue #177) ─────────────────────────

    const project = this.program.command('project').description('Manage project identifiers and fix fragmentation');

    project
      .command('list')
      .description('List all projects with observation counts')
      .action(async () => {
        const projects = await this.memory.listProjects();
        if (projects.length === 0) {
          console.log('No projects found.');
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
      });

    project
      .command('merge <source> <target>')
      .description('Move all observations from source project to target')
      .action(async (source, target) => {
        const normalizedSource = normalizeProjectId(source);
        const normalizedTarget = normalizeProjectId(target);

        if (normalizedSource === normalizedTarget) {
          console.error(`Error: Source and target are the same after normalization: "${normalizedSource}"`);
          return;
        }

        console.log(`Merging "${source}" → "${target}" (normalized: "${normalizedSource}" → "${normalizedTarget}")`);
        const result = this.memory.mergeProject(source, target);
        console.log(`  Observations moved: ${result.observationsMoved}`);
        console.log(`  Sessions moved: ${result.sessionsMoved}`);
        console.log(`  Journal entries moved: ${result.journalMoved}`);
        console.log(`  Prompts moved: ${result.promptsMoved}`);
      });

    project
      .command('normalize')
      .description('Normalize all project_id values in the database (lowercase, hyphens, no spaces)')
      .action(async () => {
        console.log('Normalizing all project_id values...');
        const result = this.memory.normalizeAllProjectIds();
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
      });

    project
      .command('registered')
      .description('List registered (canonical) projects')
      .action(async () => {
        const projects = this.memory.listRegisteredProjects();
        if (projects.length === 0) {
          console.log('No projects registered. Start an MCP server to auto-register.');
          return;
        }

        console.log(`\nRegistered Projects (${projects.length}):\n`);
        for (const p of projects) {
          console.log(`  ${p.name}`);
          if (p.workingDir) console.log(`    Working dir: ${p.workingDir}`);
          if (p.aliases.length > 0) console.log(`    Aliases: ${p.aliases.join(', ')}`);
        }
        console.log('');
      });

    // ─── Journal commands (append-only evidence) ──────────────

    const journal = this.program.command('journal').description('Append-only journal for evidence capture');

    journal
      .command('write <title> <body>')
      .description('Write a journal entry (immutable, append-only)')
      .option('--tags <tags>', 'Comma-separated tags (e.g. debugging,perf)')
      .option('-p, --project <project>', 'Project ID', this.projectId)
      .option('--supersedes <id>', 'ID of entry this correction supersedes')
      .action(async (title, body, options) => {
        const tags = options.tags ? (options.tags as string).split(',').map((t: string) => t.trim()) : [];
        const supersedes = options.supersedes ? parseInt(options.supersedes as string) : null;

        const entry = await this.memory.writeJournal({
          projectId: options.project as string,
          title,
          body,
          tags,
          supersedes,
        });

        console.log(`Journal entry #${entry.id}: "${entry.title}"`);
        if (tags.length > 0) {
          console.log(`Tags: ${entry.tags.join(', ')}`);
        }
        if (supersedes) {
          console.log(`Supersedes entry #${supersedes}`);
        }
      });

    journal
      .command('search [query]')
      .description('Search journal entries')
      .option('--tags <tags>', 'Comma-separated tags (AND logic)')
      .option('-p, --project <project>', 'Filter by project')
      .option('--active-only', 'Exclude invalidated entries')
      .option('-l, --limit <number>', 'Limit results', '20')
      .action(async (query, options) => {
        const tags = options.tags ? (options.tags as string).split(',').map((t: string) => t.trim()) : undefined;

        const result = await this.memory.searchJournal({
          query: query || undefined,
          tags,
          projectId: options.project as string | undefined,
          activeOnly: options.activeOnly as boolean | undefined,
          limit: parseInt(options.limit as string),
        });

        console.log(`Found ${result.total} journal entr${result.total !== 1 ? 'ies' : 'y'}`);
        for (const entry of result.entries) {
          const date = entry.createdAt.toLocaleDateString();
          const status = entry.invalidatedAt ? '⚠' : ' ';
          console.log(`  ${status} #${entry.id} ${date} ${entry.title}`);
          if (entry.tags.length > 0) {
            console.log(`     Tags: ${entry.tags.join(', ')}`);
          }
        }
      });

    journal
      .command('read <id>')
      .description('Read a journal entry by ID')
      .action(async (id) => {
        const entry = await this.memory.readJournal(parseInt(id));
        if (!entry) {
          console.error('Journal entry not found');
          return;
        }

        console.log(`#${entry.id} ${entry.title}`);
        console.log(`Project: ${entry.projectId} | Created: ${entry.createdAt.toISOString()}`);
        if (entry.tags.length > 0) console.log(`Tags: ${entry.tags.join(', ')}`);
        if (entry.model) console.log(`Model: ${entry.model} | Provider: ${entry.provider} | Agent: ${entry.agent}`);
        if (entry.invalidatedAt) {
          console.log(`⚠ INVALIDATED at ${entry.invalidatedAt.toISOString()} — Superseded by #${entry.supersededBy}`);
        }
        console.log('');
        console.log(entry.body);
      });

    // ─── Auth commands ──────────────────────────────────────────

    this.program
      .command('login')
      .description('Authenticate with a Memento server (OAuth Device Flow)')
      .option('-s, --server <url>', 'Server URL', 'https://memento-hub.vercel.app')
      .action(async (options) => {
        const tokenStore = new TokenStore();

        // Check if already authenticated
        if (tokenStore.isAuthenticated()) {
          const user = tokenStore.getUser();
          const serverUrl = tokenStore.getServerUrl();
          console.log(`Already authenticated as ${user?.email || 'unknown'} on ${serverUrl}`);
          console.log('Run `memento logout` first to switch accounts.');
          return;
        }

        const serverUrl = options.server.replace(/\/+$/, '');

        try {
          const client = new DeviceFlowClient({ serverUrl });

          console.log(`\nRequesting device code from ${serverUrl}...\n`);

          const codeResponse = await client.requestDeviceCode();

          const verificationUrl = codeResponse.verification_uri_complete
            || `${serverUrl}${codeResponse.verification_uri}?user_code=${codeResponse.user_code}`;

          console.log('── Memento Login ──\n');
          console.log(`  1. Open this URL in your browser:`);
          console.log(`     ${verificationUrl}\n`);
          console.log(`  2. Enter the code: ${codeResponse.user_code}\n`);

          // Try to open browser automatically
          try {
            const { exec } = await import('child_process');
            const openCmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
            exec(`${openCmd} "${verificationUrl}"`);
          } catch {
            // Browser couldn't be opened — user can copy the URL
          }

          console.log('  Waiting for authorization...');

          const result = await client.pollForToken(
            codeResponse.device_code,
            (attempt) => {
              if (attempt > 1 && attempt % 6 === 0) {
                console.log(`  Still waiting... (attempt ${attempt})`);
              }
            },
          );

          if (!result.success) {
            console.error(`\n✗ Authentication failed: ${result.errorDescription || result.error}`);
            return;
          }

          // Save token
          tokenStore.setToken(result.token!, serverUrl);

          console.log(`\n✅ Authenticated!`);
          if (result.token?.user) {
            console.log(`   User: ${result.token.user.email}`);
            if (result.token.user.name) {
              console.log(`   Name: ${result.token.user.name}`);
            }
          }
          console.log(`   Server: ${serverUrl}\n`);

        } catch (err) {
          console.error(`\n✗ Connection failed: ${err instanceof Error ? err.message : err}`);
          console.error('   Check that the server URL is correct and the server is running.\n');
        }
      });

    this.program
      .command('logout')
      .description('Clear stored authentication token')
      .action(async () => {
        const tokenStore = new TokenStore();
        const cleared = tokenStore.clearToken();
        if (cleared) {
          console.log('✅ Logged out successfully.');
        } else {
          console.log('Not currently authenticated.');
        }
      });

    // ─── Sync commands ──────────────────────────────────────────

    const sync = this.program.command('sync').description('Sync observations with a remote Memento server');

    sync
      .command('status')
      .description('Show sync status and authentication state')
      .option('-s, --server <url>', 'Server URL (overrides stored token server)')
      .action(async (options) => {
        const tokenStore = new TokenStore();
        const token = tokenStore.getToken();

        console.log('\n── Sync Status ──\n');

        // Auth status
        if (!token) {
          console.log('  Auth: ❌ Not authenticated');
          console.log('  Run `memento login` to authenticate.');
          return;
        }

        const expiresIn = tokenStore.getTimeUntilExpiry();
        const expired = expiresIn <= 0;
        const user = tokenStore.getUser();

        console.log(`  Auth: ${expired ? '⚠️ Token expired' : '✅ Authenticated'}`);
        console.log(`  User: ${user?.email || 'unknown'}`);
        console.log(`  Server: ${token.serverUrl}`);
        console.log(`  Token expires in: ${expired ? 'EXPIRED' : formatDuration(expiresIn)}`);

        // Local stats
        const localResult = await this.memory.search({ limit: 0 });
        console.log(`  Local: ${localResult.total} observations`);

        // Remote stats
        try {
          const serverUrl = options.server || token.serverUrl;
          const syncEngine = new SyncEngine({ serverUrl, projectId: this.projectId });
          const status = await syncEngine.getStatus(this.memory);

          if (status.remote) {
            console.log(`  Remote: ${status.remote.totalMementos} mementos`);
          } else {
            console.log('  Remote: ❌ Unreachable');
          }

          if (status.meta) {
            const lastSync = new Date(status.meta.lastSyncAt!);
            const ago = Date.now() - status.meta.lastSyncAt!;
            console.log(`  Last sync: ${lastSync.toISOString()} (${formatDuration(Math.floor(ago / 1000))} ago)`);
            console.log(`    Pulled: ${status.meta.lastPullCount}, Pushed: ${status.meta.lastPushCount}, Conflicts: ${status.meta.lastConflictCount}`);
          } else {
            console.log('  Last sync: Never');
          }
        } catch (err) {
          console.log(`  Remote: ❌ Error — ${err instanceof Error ? err.message : err}`);
        }

        console.log('');
      });

    sync
      .command('pull')
      .description('Download remote observations to local DB')
      .option('-s, --server <url>', 'Server URL (overrides stored token server)')
      .action(async (options) => {
        const tokenStore = new TokenStore();
        if (!tokenStore.isAuthenticated()) {
          console.error('❌ Not authenticated. Run `memento login` first.');
          return;
        }

        const serverUrl = options.server || tokenStore.getServerUrl()!;
        const syncEngine = new SyncEngine({ serverUrl, projectId: this.projectId });

        console.log('⠋ Pulling observations...');
        const result = await syncEngine.pull(this.memory);

        console.log(`\n── Pull Complete ──\n`);
        console.log(`  Pulled: ${result.pulled} observations`);
        console.log(`  Conflicts: ${result.conflicts.length}`);
        if (result.errors.length > 0) {
          console.log(`  Errors: ${result.errors.length}`);
          result.errors.forEach(e => console.log(`    ⚠ ${e}`));
        }
        console.log(`  Duration: ${(result.durationMs / 1000).toFixed(1)}s\n`);
      });

    sync
      .command('push')
      .description('Upload local observations to remote server')
      .option('-s, --server <url>', 'Server URL (overrides stored token server)')
      .action(async (options) => {
        const tokenStore = new TokenStore();
        if (!tokenStore.isAuthenticated()) {
          console.error('❌ Not authenticated. Run `memento login` first.');
          return;
        }

        const serverUrl = options.server || tokenStore.getServerUrl()!;
        const syncEngine = new SyncEngine({ serverUrl, projectId: this.projectId });

        console.log('⠋ Pushing observations...');
        const result = await syncEngine.push(this.memory);

        console.log(`\n── Push Complete ──\n`);
        console.log(`  Pushed: ${result.pushed} observations`);
        console.log(`  Conflicts: ${result.conflicts.length}`);
        if (result.errors.length > 0) {
          console.log(`  Errors: ${result.errors.length}`);
          result.errors.forEach(e => console.log(`    ⚠ ${e}`));
        }
        console.log(`  Duration: ${(result.durationMs / 1000).toFixed(1)}s\n`);
      });

    sync
      .command('now', { isDefault: true })
      .description('Bidirectional sync (pull then push)')
      .option('-s, --server <url>', 'Server URL (overrides stored token server)')
      .action(async (options) => {
        const tokenStore = new TokenStore();
        if (!tokenStore.isAuthenticated()) {
          console.error('❌ Not authenticated. Run `memento login` first.');
          return;
        }

        const serverUrl = options.server || tokenStore.getServerUrl()!;
        const syncEngine = new SyncEngine({ serverUrl, projectId: this.projectId });

        console.log('⠋ Syncing observations...');
        const result = await syncEngine.sync(this.memory);

        console.log(`\n── Sync Complete ──\n`);
        console.log(`  Pulled: ${result.pulled}`);
        console.log(`  Pushed: ${result.pushed}`);
        console.log(`  Conflicts: ${result.conflicts.length}`);
        if (result.conflicts.length > 0) {
          result.conflicts.forEach(c => {
            console.log(`    ${c.uuid}: ${c.resolution} (v${c.localVersion} vs v${c.serverVersion})`);
          });
        }
        if (result.errors.length > 0) {
          console.log(`  Errors: ${result.errors.length}`);
          result.errors.forEach(e => console.log(`    ⚠ ${e}`));
        }
        console.log(`  Duration: ${(result.durationMs / 1000).toFixed(1)}s\n`);
      });
  }

  private async getOrCreateSessionId(projectId: string): Promise<number> {
    if (this.activeSessionId) {
      return this.activeSessionId;
    }
    const session = await this.memory.createSession({
      projectId,
      endedAt: null,
      metadata: {},
    });
    this.activeSessionId = session.id;
    return session.id;
  }

  async run(argv: string[] = process.argv) {
    await this.program.parseAsync(argv);
  }

  close() {
    this.memory.close();
  }
}

/**
 * Format a duration in seconds to a human-readable string.
 */
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hours < 24) return `${hours}h ${mins}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}
