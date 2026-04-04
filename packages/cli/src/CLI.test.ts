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
    });
  });

  describe('Session Management', () => {
    it('should create and track active session', async () => {
      const sessionId = await cli['getOrCreateSessionId']('test-project');
      expect(sessionId).toBeDefined();

      const sameSessionId = await cli['getOrCreateSessionId']('test-project');
      expect(sameSessionId).toBe(sessionId);
    });
  });
});
