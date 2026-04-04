import { Command } from 'commander';
import { MemoryEngine } from '@slorenzot/memento-core';
import type { Observation } from '@slorenzot/memento-core';

// @ts-ignore
export class CLI {
  private program: Command;
  private memory: MemoryEngine;
  private activeSessionId: number | null = null;

  constructor(dbPath: string = './data/memento.db') {
    this.program = new Command();
    this.memory = new MemoryEngine(dbPath);
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
      .option('-p, --project <project>', 'Project ID', 'default')
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
