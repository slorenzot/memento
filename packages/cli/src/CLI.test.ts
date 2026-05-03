import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { CLI } from './CLI';

describe('CLI', () => {
  let cli: CLI;
  let testDbPath: string;

  beforeEach(() => {
    testDbPath = `/tmp/test-cli-${Date.now()}.db`;
    cli = new CLI(testDbPath);
  });

  afterEach(() => {
    cli.close();
  });

  it('should initialize without errors', () => {
    expect(cli).toBeDefined();
  });

  describe('Commands', () => {
    it('should have all required commands', () => {
      const commands = cli['program'].commands;

      const commandNames = commands.map((c) => c.name());
      expect(commandNames).toContain('setup');
      expect(commandNames).toContain('serve');
      expect(commandNames).toContain('mcp');
      expect(commandNames).toContain('search');
      expect(commandNames).toContain('save');
      expect(commandNames).toContain('get');
      expect(commandNames).toContain('update');
      expect(commandNames).toContain('delete');
      expect(commandNames).toContain('timeline');
      expect(commandNames).toContain('stats');
    });

    it('should have proper descriptions', () => {
      const commands = cli['program'].commands;

      const setupCommand = commands.find((c) => c.name() === 'setup');
      expect(setupCommand).toBeDefined();
      expect(setupCommand?.description()).toContain('Setup');

      const searchCommand = commands.find((c) => c.name() === 'search');
      expect(searchCommand).toBeDefined();
      expect(searchCommand?.description()).toContain('Search');

      const saveCommand = commands.find((c) => c.name() === 'save');
      expect(saveCommand).toBeDefined();
      expect(saveCommand?.description()).toContain('Save');

      const deleteCommand = commands.find((c) => c.name() === 'delete');
      expect(deleteCommand).toBeDefined();
      expect(deleteCommand?.description()).toContain('Delete');

      const timelineCommand = commands.find((c) => c.name() === 'timeline');
      expect(timelineCommand).toBeDefined();
      expect(timelineCommand?.description()).toContain('timeline');
    });

    it('should have correct option flags for search command', () => {
      const commands = cli['program'].commands;
      const searchCommand = commands.find((c) => c.name() === 'search');
      expect(searchCommand).toBeDefined();

      const options = searchCommand!.options.map((o) => o.long);
      expect(options).toContain('--type');
      expect(options).toContain('--project');
      expect(options).toContain('--limit');
    });

    it('should have correct option flags for save command', () => {
      const commands = cli['program'].commands;
      const saveCommand = commands.find((c) => c.name() === 'save');
      expect(saveCommand).toBeDefined();

      const options = saveCommand!.options.map((o) => o.long);
      expect(options).toContain('--type');
      expect(options).toContain('--topic');
      expect(options).toContain('--project');
    });

    it('should have correct option flags for update command', () => {
      const commands = cli['program'].commands;
      const updateCommand = commands.find((c) => c.name() === 'update');
      expect(updateCommand).toBeDefined();

      const options = updateCommand!.options.map((o) => o.long);
      expect(options).toContain('--title');
      expect(options).toContain('--content');
      expect(options).toContain('--topic');
    });
  });

  describe('Session Management', () => {
    it('should create and track active session', async () => {
      const sessionId = await cli['getOrCreateSessionId']('test-project');
      expect(sessionId).toBeDefined();
      expect(typeof sessionId).toBe('number');

      const sameSessionId = await cli['getOrCreateSessionId']('test-project');
      expect(sameSessionId).toBe(sessionId);
    });

    it('should reuse session across multiple calls', async () => {
      const ids = new Set<number>();
      for (let i = 0; i < 5; i++) {
        const sid = await cli['getOrCreateSessionId']('test-project');
        ids.add(sid);
      }
      expect(ids.size).toBe(1);
    });
  });

  describe('Command Execution E2E', () => {
    it('should execute search command and output results', async () => {
      // Seed data via the engine directly
      const session = await cli['getOrCreateSessionId']('test-project');
      const memory = cli['memory'];
      await memory.createObservation({
        sessionId: session,
        title: 'Test Observation',
        content: 'Content for search test',
        type: 'note',
        topicKey: 'test/search',
        projectId: 'test-project',
        metadata: {},
      });

      // Capture console.log output
      const logs: string[] = [];
      const origLog = console.log;
      console.log = (...args: any[]) => logs.push(args.join(' '));

      try {
        await cli.run(['node', 'memento', 'search', 'Test', '--project', 'test-project']);
      } finally {
        console.log = origLog;
      }

      expect(logs.some(l => l.includes('Found'))).toBe(true);
      expect(logs.some(l => l.includes('Test Observation'))).toBe(true);
    });

    it('should execute save command and output confirmation', async () => {
      const logs: string[] = [];
      const origLog = console.log;
      console.log = (...args: any[]) => logs.push(args.join(' '));

      try {
        await cli.run(['node', 'memento', 'save', 'CLI Save Test', 'Test content from CLI', '--type', 'decision', '--project', 'test-project']);
      } finally {
        console.log = origLog;
      }

      expect(logs.some(l => l.includes('Saved observation'))).toBe(true);
      // Verify it was actually saved by checking we can find it
      const memory = cli['memory'];
      const result = await memory.search({ projectId: 'test-project', query: 'CLI Save Test' });
      expect(result.total).toBeGreaterThanOrEqual(1);
    });

    it('should execute stats command', async () => {
      const session = await cli['getOrCreateSessionId']('test-project');
      const memory = cli['memory'];
      await memory.createObservation({
        sessionId: session,
        title: 'Stats Test',
        content: 'Content',
        type: 'bug',
        topicKey: null,
        projectId: 'test-project',
        metadata: {},
      });

      const logs: string[] = [];
      const origLog = console.log;
      console.log = (...args: any[]) => logs.push(args.join(' '));

      try {
        await cli.run(['node', 'memento', 'stats']);
      } finally {
        console.log = origLog;
      }

      expect(logs.some(l => l.includes('Statistics'))).toBe(true);
      expect(logs.some(l => l.includes('Total observations'))).toBe(true);
    });

    it('should execute delete command and output confirmation', async () => {
      const session = await cli['getOrCreateSessionId']('test-project');
      const memory = cli['memory'];
      const obs = await memory.createObservation({
        sessionId: session,
        title: 'Delete Me',
        content: 'Will be deleted',
        type: 'note',
        topicKey: null,
        projectId: 'test-project',
        metadata: {},
      });

      const logs: string[] = [];
      const origLog = console.log;
      console.log = (...args: any[]) => logs.push(args.join(' '));

      try {
        await cli.run(['node', 'memento', 'delete', String(obs.id)]);
      } finally {
        console.log = origLog;
      }

      expect(logs.some(l => l.includes('Deleted observation'))).toBe(true);

      // Verify soft-deleted (this specific observation should not appear in search)
      const found = await memory.getObservation(obs.id);
      expect(found).toBeNull();
    });
  });
});
