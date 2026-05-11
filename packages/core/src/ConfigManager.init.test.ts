import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { rmSync, mkdirSync, existsSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Each test gets an isolated temp directory
let testDir: string;

beforeEach(() => {
  testDir = join(tmpdir(), `memento-config-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  mkdirSync(testDir, { recursive: true });
});

afterEach(() => {
  if (existsSync(testDir)) {
    rmSync(testDir, { recursive: true, force: true });
  }
});

describe('ConfigManager — Init & Migration', () => {
  describe('createConfig()', () => {
    it('should create .memento/config.json with defaults', () => {
      const { createConfig } = require('../src/ConfigManager');

      const result = createConfig({ targetDir: testDir });

      expect(result.configPath).toBe(join(testDir, '.memento', 'config.json'));
      expect(existsSync(result.configPath)).toBe(true);

      const written = JSON.parse(readFileSync(result.configPath, 'utf-8'));
      expect(written.version).toBe(1);
      expect(written.database.path).toBe('.memento/memento.db');
      expect(written.database.wal).toBe(true);
      expect(written.defaults.autoSeed).toBe(true);
      expect(written.defaults.scope).toBe('project');
    });

    it('should use custom project name', () => {
      const { createConfig } = require('../src/ConfigManager');

      const result = createConfig({ targetDir: testDir, project: 'my-custom-project' });

      const written = JSON.parse(readFileSync(result.configPath, 'utf-8'));
      expect(written.project).toBe('my-custom-project');
    });

    it('should derive project name from package.json', () => {
      const { createConfig } = require('../src/ConfigManager');

      writeFileSync(
        join(testDir, 'package.json'),
        JSON.stringify({ name: '@scope/my-app' }, null, 2)
      );

      const result = createConfig({ targetDir: testDir });

      const written = JSON.parse(readFileSync(result.configPath, 'utf-8'));
      // Should strip @scope/ prefix
      expect(written.project).toBe('my-app');
    });

    it('should derive project name from directory as fallback', () => {
      const { createConfig, basename } = require('../src/ConfigManager');
      const path = require('path');

      const result = createConfig({ targetDir: testDir });

      const written = JSON.parse(readFileSync(result.configPath, 'utf-8'));
      expect(written.project).toBe(path.basename(testDir));
    });

    it('should use custom db path', () => {
      const { createConfig } = require('../src/ConfigManager');

      const result = createConfig({ targetDir: testDir, dbPath: 'custom/db.sqlite' });

      const written = JSON.parse(readFileSync(result.configPath, 'utf-8'));
      expect(written.database.path).toBe('custom/db.sqlite');
    });

    it('should throw if config exists without --force', () => {
      const { createConfig } = require('../src/ConfigManager');

      mkdirSync(join(testDir, '.memento'), { recursive: true });
      writeFileSync(join(testDir, '.memento', 'config.json'), '{}');

      expect(() => createConfig({ targetDir: testDir })).toThrow('already exists');
    });

    it('should overwrite if --force is set', () => {
      const { createConfig } = require('../src/ConfigManager');

      mkdirSync(join(testDir, '.memento'), { recursive: true });
      writeFileSync(join(testDir, '.memento', 'config.json'), '{"old": true}');

      const result = createConfig({ targetDir: testDir, force: true, project: 'forced' });

      const written = JSON.parse(readFileSync(result.configPath, 'utf-8'));
      expect(written.project).toBe('forced');
    });

    it('should detect and flag migration from .mementorc', () => {
      const { createConfig } = require('../src/ConfigManager');

      writeFileSync(
        join(testDir, '.mementorc'),
        JSON.stringify({
          storageMethod: 'database',
          dbPath: '.memento/db/memento.db',
          projectId: 'legacy-project',
        })
      );

      const result = createConfig({ targetDir: testDir, force: true });

      expect(result.migrated).toBe(true);
      const written = JSON.parse(readFileSync(result.configPath, 'utf-8'));
      expect(written.project).toBe('legacy-project');
    });

    it('should preserve db path from .mementorc during migration', () => {
      const { createConfig } = require('../src/ConfigManager');

      writeFileSync(
        join(testDir, '.mementorc'),
        JSON.stringify({
          dbPath: 'custom/legacy.db',
          projectId: 'legacy-project',
        })
      );

      const result = createConfig({ targetDir: testDir, force: true });

      const written = JSON.parse(readFileSync(result.configPath, 'utf-8'));
      expect(written.database.path).toBe('custom/legacy.db');
    });
  });

  describe('migrateConfig()', () => {
    it('should migrate .mementorc to .memento/config.json', () => {
      const { migrateConfig } = require('../src/ConfigManager');

      writeFileSync(
        join(testDir, '.mementorc'),
        JSON.stringify({
          storageMethod: 'database',
          dbPath: '.memento/db/memento.db',
          projectId: 'migrate-test',
        })
      );

      const result = migrateConfig(testDir);

      expect(result.success).toBe(true);
      expect(existsSync(result.targetPath)).toBe(true);
      expect(existsSync(result.backupPath)).toBe(true);
      expect(existsSync(result.sourcePath)).toBe(false); // renamed to .bak

      const migrated = JSON.parse(readFileSync(result.targetPath, 'utf-8'));
      expect(migrated.version).toBe(1);
      expect(migrated.project).toBe('migrate-test');
      expect(migrated.database.path).toBe('.memento/db/memento.db');
    });

    it('should fail if no .mementorc exists', () => {
      const { migrateConfig } = require('../src/ConfigManager');

      const result = migrateConfig(testDir);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No .mementorc found');
    });

    it('should fail if .mementorc is invalid JSON', () => {
      const { migrateConfig } = require('../src/ConfigManager');

      writeFileSync(join(testDir, '.mementorc'), 'not valid json {{{');

      const result = migrateConfig(testDir);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to parse');
    });

    it('should create backup of original .mementorc', () => {
      const { migrateConfig } = require('../src/ConfigManager');

      const originalContent = JSON.stringify({
        storageMethod: 'database',
        dbPath: '.memento/db/memento.db',
        projectId: 'backup-test',
      });
      writeFileSync(join(testDir, '.mementorc'), originalContent);

      migrateConfig(testDir);

      expect(existsSync(join(testDir, '.mementorc.bak'))).toBe(true);
      const backup = readFileSync(join(testDir, '.mementorc.bak'), 'utf-8');
      expect(backup).toBe(originalContent);
    });
  });

  describe('findProjectConfig() — dual config', () => {
    it('should prefer .memento/config.json over .mementorc', () => {
      const { findProjectConfig } = require('../src/ConfigManager');

      // Create both configs
      mkdirSync(join(testDir, '.memento'), { recursive: true });
      writeFileSync(
        join(testDir, '.memento', 'config.json'),
        JSON.stringify({
          version: 1,
          project: 'new-format',
          database: { path: '.memento/new.db' },
        })
      );
      writeFileSync(
        join(testDir, '.mementorc'),
        JSON.stringify({
          storageMethod: 'database',
          dbPath: '.memento/old.db',
          projectId: 'old-format',
        })
      );

      const originalCwd = process.cwd;
      process.cwd = () => testDir;
      try {
        const config = findProjectConfig();
        expect(config).not.toBeNull();
        expect(config!.projectId).toBe('new-format');
        expect(config!.dbPath).toBe('.memento/new.db');
      } finally {
        process.cwd = originalCwd;
      }
    });

    it('should fall back to .mementorc when .memento/config.json does not exist', () => {
      const { findProjectConfig } = require('../src/ConfigManager');

      writeFileSync(
        join(testDir, '.mementorc'),
        JSON.stringify({
          storageMethod: 'database',
          dbPath: '.memento/legacy.db',
          projectId: 'legacy',
        })
      );

      const originalCwd = process.cwd;
      process.cwd = () => testDir;
      try {
        const config = findProjectConfig();
        expect(config).not.toBeNull();
        expect(config!.projectId).toBe('legacy');
      } finally {
        process.cwd = originalCwd;
      }
    });

    it('should return null when no config exists', () => {
      const { findProjectConfig } = require('../src/ConfigManager');

      const originalCwd = process.cwd;
      process.cwd = () => '/tmp';
      try {
        const config = findProjectConfig('/tmp');
        expect(config).toBeNull();
      } finally {
        process.cwd = originalCwd;
      }
    });

    it('should search parent directories', () => {
      const { findProjectConfig } = require('../src/ConfigManager');

      // Create config in parent
      mkdirSync(join(testDir, '.memento'), { recursive: true });
      writeFileSync(
        join(testDir, '.memento', 'config.json'),
        JSON.stringify({
          version: 1,
          project: 'parent-project',
          database: { path: '.memento/db.sqlite' },
        })
      );

      // Search from child
      const childDir = join(testDir, 'child', 'deep');
      mkdirSync(childDir, { recursive: true });

      const config = findProjectConfig(childDir);
      expect(config).not.toBeNull();
      expect(config!.projectId).toBe('parent-project');
    });
  });

  describe('findConfigPath()', () => {
    it('should return path to .memento/config.json', () => {
      const { findConfigPath } = require('../src/ConfigManager');

      mkdirSync(join(testDir, '.memento'), { recursive: true });
      writeFileSync(
        join(testDir, '.memento', 'config.json'),
        JSON.stringify({ version: 1, project: 'test', database: { path: '.memento/db.sqlite' } })
      );

      const path = findConfigPath(testDir);
      expect(path).toBe(join(testDir, '.memento', 'config.json'));
    });

    it('should return path to .mementorc', () => {
      const { findConfigPath } = require('../src/ConfigManager');

      writeFileSync(
        join(testDir, '.mementorc'),
        JSON.stringify({ projectId: 'test' })
      );

      const path = findConfigPath(testDir);
      expect(path).toBe(join(testDir, '.mementorc'));
    });

    it('should return null when nothing found', () => {
      const { findConfigPath } = require('../src/ConfigManager');

      const path = findConfigPath('/tmp');
      expect(path).toBeNull();
    });
  });

  describe('backward compatibility', () => {
    it('loadConfig() should still work with only .mementorc', () => {
      const { loadConfig } = require('../src/ConfigManager');

      writeFileSync(
        join(testDir, '.mementorc'),
        JSON.stringify({
          storageMethod: 'database',
          dbPath: '.memento/compat.db',
          projectId: 'compat-test',
        })
      );

      const originalCwd = process.cwd;
      process.cwd = () => testDir;
      try {
        const config = loadConfig();
        expect(config.projectId).toBe('compat-test');
        expect(config.dbPath).toBe('.memento/compat.db');
      } finally {
        process.cwd = originalCwd;
      }
    });

    it('loadConfig() should work with new .memento/config.json', () => {
      const { loadConfig } = require('../src/ConfigManager');

      mkdirSync(join(testDir, '.memento'), { recursive: true });
      writeFileSync(
        join(testDir, '.memento', 'config.json'),
        JSON.stringify({
          version: 1,
          project: 'new-compat-test',
          database: { path: '.memento/new-compat.db' },
        })
      );

      const originalCwd = process.cwd;
      process.cwd = () => testDir;
      try {
        const config = loadConfig();
        expect(config.projectId).toBe('new-compat-test');
        expect(config.dbPath).toBe('.memento/new-compat.db');
      } finally {
        process.cwd = originalCwd;
      }
    });

    it('new config should take priority over .mementorc', () => {
      const { loadConfig } = require('../src/ConfigManager');

      mkdirSync(join(testDir, '.memento'), { recursive: true });
      writeFileSync(
        join(testDir, '.memento', 'config.json'),
        JSON.stringify({
          version: 1,
          project: 'new-wins',
          database: { path: '.memento/new.db' },
        })
      );
      writeFileSync(
        join(testDir, '.mementorc'),
        JSON.stringify({
          projectId: 'old-loses',
          dbPath: '.memento/old.db',
        })
      );

      const originalCwd = process.cwd;
      process.cwd = () => testDir;
      try {
        const config = loadConfig();
        expect(config.projectId).toBe('new-wins');
        expect(config.dbPath).toBe('.memento/new.db');
      } finally {
        process.cwd = originalCwd;
      }
    });
  });
});
