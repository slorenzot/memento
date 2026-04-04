import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'bun:test';
import { rmSync, mkdirSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';

const testDir = join(process.cwd(), 'test-data');
const configDir = join(testDir, 'config');
const storageDir = join(testDir, 'storage');

beforeAll(() => {
  if (existsSync(testDir)) {
    rmSync(testDir, { recursive: true, force: true });
  }
  mkdirSync(testDir, { recursive: true });
  mkdirSync(configDir, { recursive: true });
  mkdirSync(storageDir, { recursive: true });

  writeFileSync(
    join(configDir, '.mementorc'),
    JSON.stringify(
      {
        storagePath: 'database/storage',
        projectId: 'test-project',
      },
      null,
      2
    )
  );
});

afterAll(() => {
  if (existsSync(testDir)) {
    rmSync(testDir, { recursive: true, force: true });
  }
});

describe('ConfigManager', () => {
  describe('loadConfig()', () => {
    it('should load .mementorc from current directory', () => {
      const { loadConfig } = require('../src/ConfigManager');

      const originalCwd = process.cwd;
      process.cwd = () => configDir;

      try {
        const config = loadConfig();
        expect(config.storagePath).toBe('database/storage');
        expect(config.projectId).toBe('test-project');
      } finally {
        process.cwd = originalCwd;
      }
    });

    it('should use default config when no .mementorc found', () => {
      const { loadConfig } = require('../src/ConfigManager');
      const { join } = require('path');

      const originalCwd = process.cwd;
      process.cwd = () => join(testDir, 'no-config');

      try {
        const config = loadConfig();
        expect(config.storagePath).toBe('database/storage');
        expect(config.projectId).toBeUndefined();
      } finally {
        process.cwd = originalCwd;
      }
    });

    it('should use environment variables when set', () => {
      const { loadConfig } = require('../src/ConfigManager');

      const originalEnv = { ...process.env };
      process.env.MEMENTO_STORAGE_PATH = '/custom/storage';
      process.env.MEMENTO_PROJECT_ID = 'env-project';

      try {
        const config = loadConfig();
        expect(config.storagePath).toBe('/custom/storage');
        expect(config.projectId).toBe('env-project');
      } finally {
        process.env = originalEnv;
      }
    });
  });

  describe('resolveStoragePath()', () => {
    it('should resolve absolute paths', () => {
      const { resolveStoragePath } = require('../src/ConfigManager');
      const config = { storagePath: '/absolute/path', projectId: 'test' };
      const resolved = resolveStoragePath(config);
      expect(resolved).toBe('/absolute/path');
    });

    it('should resolve ~ to home directory', () => {
      const { resolveStoragePath } = require('../src/ConfigManager');
      const { homedir } = require('os');
      const config = { storagePath: '~/memento-data', projectId: 'test' };

      const originalCwd = process.cwd;
      process.cwd = () => '/some/working/dir';

      try {
        const resolved = resolveStoragePath(config);
        expect(resolved).toBe(join(homedir(), 'memento-data'));
      } finally {
        process.cwd = originalCwd;
      }
    });

    it('should resolve relative paths from working directory', () => {
      const { resolveStoragePath } = require('../src/ConfigManager');
      const config = { storagePath: 'database/storage', projectId: 'test' };

      const originalCwd = process.cwd;
      process.cwd = () => '/project/root';

      try {
        const resolved = resolveStoragePath(config);
        expect(resolved).toBe('/project/root/database/storage');
      } finally {
        process.cwd = originalCwd;
      }
    });
  });

  describe('getProjectId()', () => {
    it('should use projectId from config if available', () => {
      const { getProjectId } = require('../src/ConfigManager');
      const config = { storagePath: 'test', projectId: 'config-project' };

      const originalCwd = process.cwd;
      process.cwd = () => '/some/dir';

      try {
        const projectId = getProjectId(config);
        expect(projectId).toBe('config-project');
      } finally {
        process.cwd = originalCwd;
      }
    });

    it('should read package.json if no projectId in config', () => {
      const { getProjectId } = require('../src/ConfigManager');
      const packageDir = join(testDir, 'with-package');
      mkdirSync(packageDir, { recursive: true });

      writeFileSync(
        join(packageDir, 'package.json'),
        JSON.stringify({ name: 'my-project-from-package' }, null, 2)
      );

      const config = { storagePath: 'test', projectId: undefined };
      const originalCwd = process.cwd;
      process.cwd = () => packageDir;

      try {
        const projectId = getProjectId(config);
        expect(projectId).toBe('my-project-from-package');
      } finally {
        process.cwd = originalCwd;
      }
    });

    it('should default to "default" when no projectId found', () => {
      const { getProjectId } = require('../src/ConfigManager');
      const config = { storagePath: 'test', projectId: undefined };

      const originalCwd = process.cwd;
      process.cwd = () => '/no/package/here';

      try {
        const projectId = getProjectId(config);
        expect(projectId).toBe('default');
      } finally {
        process.cwd = originalCwd;
      }
    });
  });
});
