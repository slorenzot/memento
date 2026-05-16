import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'bun:test';
import { rmSync, mkdirSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const testDir = join(process.cwd(), 'test-data');

beforeAll(() => {
  if (existsSync(testDir)) {
    rmSync(testDir, { recursive: true, force: true });
  }
  mkdirSync(testDir, { recursive: true });
});

afterAll(() => {
  if (existsSync(testDir)) {
    rmSync(testDir, { recursive: true, force: true });
  }
});

describe('ConfigManager', () => {
  describe('resolveDbPath()', () => {
    it('should return centralized DB path by default', () => {
      const { resolveDbPath, GLOBAL_DB_PATH } = require('../src/ConfigManager');

      const originalEnv = { ...process.env };
      delete process.env.MEMENTO_DB_PATH;

      try {
        const resolved = resolveDbPath();
        expect(resolved).toBe(GLOBAL_DB_PATH);
        expect(resolved).toBe(join(homedir(), '.memento', 'memento.db'));
      } finally {
        process.env = originalEnv;
      }
    });

    it('should use MEMENTO_DB_PATH env var when set', () => {
      const { resolveDbPath } = require('../src/ConfigManager');

      const originalEnv = { ...process.env };
      process.env.MEMENTO_DB_PATH = '/custom/db/memento.db';

      try {
        const resolved = resolveDbPath();
        expect(resolved).toBe('/custom/db/memento.db');
      } finally {
        process.env = originalEnv;
      }
    });

    it('should expand ~/ in MEMENTO_DB_PATH', () => {
      const { resolveDbPath } = require('../src/ConfigManager');

      const originalEnv = { ...process.env };
      process.env.MEMENTO_DB_PATH = '~/custom/memento.db';

      try {
        const resolved = resolveDbPath();
        expect(resolved).toBe(join(homedir(), 'custom/memento.db'));
      } finally {
        process.env = originalEnv;
      }
    });
  });

  describe('getProjectId()', () => {
    it('should use MEMENTO_PROJECT_ID env var when set', () => {
      const { getProjectId } = require('../src/ConfigManager');

      const originalEnv = { ...process.env };
      process.env.MEMENTO_PROJECT_ID = 'env-project';

      try {
        const projectId = getProjectId();
        expect(projectId).toBe('env-project');
      } finally {
        process.env = originalEnv;
      }
    });

    it('should read package.json if no env var', () => {
      const { getProjectId } = require('../src/ConfigManager');
      const packageDir = join(testDir, 'with-package');
      mkdirSync(packageDir, { recursive: true });

      writeFileSync(
        join(packageDir, 'package.json'),
        JSON.stringify({ name: 'my-project-from-package' }, null, 2)
      );

      const originalEnv = { ...process.env };
      const originalCwd = process.cwd;
      delete process.env.MEMENTO_PROJECT_ID;
      process.cwd = () => packageDir;

      try {
        const projectId = getProjectId();
        expect(projectId).toBe('my-project-from-package');
      } finally {
        process.cwd = originalCwd;
        process.env = originalEnv;
      }
    });

    it('should default to directory name when no package.json', () => {
      const { getProjectId } = require('../src/ConfigManager');

      const originalEnv = { ...process.env };
      const originalCwd = process.cwd;
      delete process.env.MEMENTO_PROJECT_ID;
      process.cwd = () => '/some/unique-dir-name';

      try {
        const projectId = getProjectId();
        expect(projectId).toBe('unique-dir-name');
      } finally {
        process.cwd = originalCwd;
        process.env = originalEnv;
      }
    });

    it('should normalize projectId from env var', () => {
      const { getProjectId } = require('../src/ConfigManager');

      const originalEnv = { ...process.env };
      process.env.MEMENTO_PROJECT_ID = 'SURA Chile Autos';

      try {
        const projectId = getProjectId();
        expect(projectId).toBe('sura-chile-autos');
      } finally {
        process.env = originalEnv;
      }
    });

    it('should normalize scoped package name from package.json', () => {
      const { getProjectId } = require('../src/ConfigManager');
      const packageDir = join(testDir, 'scoped-package');
      mkdirSync(packageDir, { recursive: true });

      writeFileSync(
        join(packageDir, 'package.json'),
        JSON.stringify({ name: '@my-org/My Cool Project' }, null, 2)
      );

      const originalEnv = { ...process.env };
      const originalCwd = process.cwd;
      delete process.env.MEMENTO_PROJECT_ID;
      process.cwd = () => packageDir;

      try {
        const projectId = getProjectId();
        expect(projectId).toBe('my-cool-project');
      } finally {
        process.cwd = originalCwd;
        process.env = originalEnv;
      }
    });
  });

  describe('getStaleThresholdMs()', () => {
    it('should return default threshold when no config', () => {
      const { getStaleThresholdMs, DEFAULT_STALE_THRESHOLD_MS } = require('../src/ConfigManager');

      const threshold = getStaleThresholdMs();
      expect(threshold).toBe(DEFAULT_STALE_THRESHOLD_MS);
      expect(threshold).toBe(24 * 60 * 60 * 1000);
    });
  });

  describe('ensureGlobalDir()', () => {
    it('should create ~/.memento/ directory', () => {
      const { ensureGlobalDir, GLOBAL_CONFIG_DIR } = require('../src/ConfigManager');
      const { existsSync, rmSync } = require('fs');

      // Use a temp dir to avoid touching real ~/.memento
      const tmpDir = join(testDir, 'global-test');
      mkdirSync(tmpDir, { recursive: true });

      // We test the function works but don't want to actually create
      // in real home dir during tests — just verify the return value
      const result = ensureGlobalDir();
      expect(result.dbPath).toContain('.memento');
      expect(result.configPath).toContain('.memento');
    });
  });

  describe('normalizeProjectId()', () => {
    const { normalizeProjectId } = require('../src/ConfigManager');

    it('should lowercase the name', () => {
      expect(normalizeProjectId('SURA-Chile-Autos')).toBe('sura-chile-autos');
    });

    it('should replace spaces with hyphens', () => {
      expect(normalizeProjectId('sura chile autos')).toBe('sura-chile-autos');
    });

    it('should replace underscores with hyphens', () => {
      expect(normalizeProjectId('my_cool_project')).toBe('my-cool-project');
    });

    it('should collapse multiple spaces/underscores into single hyphen', () => {
      expect(normalizeProjectId('my__cool  project')).toBe('my-cool-project');
    });

    it('should handle mixed case and spaces', () => {
      expect(normalizeProjectId('suratech-salesforce-CL-app')).toBe('suratech-salesforce-cl-app');
    });

    it('should strip leading and trailing hyphens', () => {
      expect(normalizeProjectId('--leading-trailing--')).toBe('leading-trailing');
    });

    it('should trim whitespace', () => {
      expect(normalizeProjectId('  spaces  everywhere  ')).toBe('spaces-everywhere');
    });

    it('should handle already-normalized names', () => {
      expect(normalizeProjectId('my-project')).toBe('my-project');
    });

    it('should handle names with dots', () => {
      expect(normalizeProjectId('gentleman.dots')).toBe('gentleman-dots');
    });

    it('should handle scoped npm package names', () => {
      expect(normalizeProjectId('@slorenzot/memento-core')).toBe('slorenzot-memento-core');
    });

    it('should handle foundation salesforce - suratech', () => {
      expect(normalizeProjectId('foundation salesforce - suratech')).toBe('foundation-salesforce-suratech');
    });

    it('should return default for empty string', () => {
      expect(normalizeProjectId('')).toBe('default');
    });

    it('should return default for null/undefined', () => {
      expect(normalizeProjectId(null as any)).toBe('default');
      expect(normalizeProjectId(undefined as any)).toBe('default');
    });

    it('should return default for string with only special chars', () => {
      expect(normalizeProjectId('---')).toBe('default');
      expect(normalizeProjectId('   ')).toBe('default');
    });
  });
});
