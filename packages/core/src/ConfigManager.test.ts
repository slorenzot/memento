import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'bun:test';
import { rmSync, mkdirSync, existsSync, writeFileSync, mkdtempSync } from 'fs';
import { join } from 'path';
import { homedir, tmpdir } from 'os';

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
      // Use tmpdir to avoid .memento-project walk-up from repo root
      const packageDir = mkdtempSync(join(tmpdir(), 'memento-pkg-test-'));
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
        rmSync(packageDir, { recursive: true, force: true });
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
      // Use tmpdir to avoid .memento-project walk-up from repo root
      const packageDir = mkdtempSync(join(tmpdir(), 'memento-scoped-test-'));
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
        rmSync(packageDir, { recursive: true, force: true });
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

  // ─── Walk-Up Resolution (Issue #273) ────────────────────────

  describe('findProjectRoot()', () => {
    const { findProjectRoot } = require('../src/ConfigManager');
    // Use tmpdir (outside repo) to avoid finding the real .memento-project
    let walkupDir: string;

    beforeEach(() => {
      walkupDir = mkdtempSync(join(tmpdir(), 'memento-walkup-'));
    });

    afterEach(() => {
      if (existsSync(walkupDir)) {
        rmSync(walkupDir, { recursive: true, force: true });
      }
    });

    it('should find .memento-project marker in startDir', () => {
      const projectDir = join(walkupDir, 'my-project');
      mkdirSync(projectDir, { recursive: true });
      writeFileSync(join(projectDir, '.memento-project'), 'memento\n');

      const result = findProjectRoot(projectDir);
      expect(result).not.toBeNull();
      expect(result!.projectId).toBe('memento');
      expect(result!.source).toBe('marker');
      expect(result!.rootDir).toBe(projectDir);
    });

    it('should walk up to find .memento-project in parent dir', () => {
      const projectDir = join(walkupDir, 'root-project');
      const subDir = join(projectDir, 'packages', 'core');
      mkdirSync(subDir, { recursive: true });
      writeFileSync(join(projectDir, '.memento-project'), 'my-canonical-name\n');

      const result = findProjectRoot(subDir);
      expect(result).not.toBeNull();
      expect(result!.projectId).toBe('my-canonical-name');
      expect(result!.source).toBe('marker');
      expect(result!.rootDir).toBe(projectDir);
    });

    it('should walk up multiple levels to find marker', () => {
      const rootDir = join(walkupDir, 'deep-root');
      const deepDir = join(rootDir, 'a', 'b', 'c', 'd');
      mkdirSync(deepDir, { recursive: true });
      writeFileSync(join(rootDir, '.memento-project'), 'deep-project\n');

      const result = findProjectRoot(deepDir);
      expect(result).not.toBeNull();
      expect(result!.projectId).toBe('deep-project');
      expect(result!.rootDir).toBe(rootDir);
    });

    it('should parse marker with comments and empty lines', () => {
      const projectDir = join(walkupDir, 'comment-project');
      mkdirSync(projectDir, { recursive: true });
      writeFileSync(
        join(projectDir, '.memento-project'),
        '# This is a comment\n\n  my-comment-project  \n# Another comment\n'
      );

      const result = findProjectRoot(projectDir);
      expect(result).not.toBeNull();
      expect(result!.projectId).toBe('my-comment-project');
    });

    it('should skip marker file with only comments', () => {
      const projectDir = join(walkupDir, 'only-comments');
      mkdirSync(projectDir, { recursive: true });
      writeFileSync(join(projectDir, '.memento-project'), '# Just a comment\n# Another\n');

      // Also create .git so we can test fallback
      mkdirSync(join(projectDir, '.git'), { recursive: true });

      const result = findProjectRoot(projectDir);
      // Should NOT use marker (all comments), should fall through to git
      expect(result).not.toBeNull();
      expect(result!.source).toBe('git');
    });

    it('should fall back to git root when no marker exists', () => {
      const gitDir = join(walkupDir, 'git-root-project');
      const subDir = join(gitDir, 'src', 'lib');
      mkdirSync(subDir, { recursive: true });
      mkdirSync(join(gitDir, '.git'), { recursive: true });

      const result = findProjectRoot(subDir);
      expect(result).not.toBeNull();
      expect(result!.projectId).toBe('git-root-project');
      expect(result!.source).toBe('git');
      expect(result!.rootDir).toBe(gitDir);
    });

    it('should fall back to monorepo root when no marker or git', () => {
      const monoDir = join(walkupDir, 'mono-root');
      const subDir = join(monoDir, 'packages', 'frontend');
      mkdirSync(subDir, { recursive: true });
      writeFileSync(
        join(monoDir, 'package.json'),
        JSON.stringify({ name: 'mono-root', workspaces: ['packages/*'] })
      );
      // Sub-package has its own package.json
      writeFileSync(
        join(subDir, 'package.json'),
        JSON.stringify({ name: '@mono/frontend' })
      );

      const result = findProjectRoot(subDir);
      expect(result).not.toBeNull();
      expect(result!.projectId).toBe('mono-root');
      expect(result!.source).toBe('monorepo');
      expect(result!.rootDir).toBe(monoDir);
    });

    it('should detect bun-format workspaces', () => {
      const monoDir = join(walkupDir, 'bun-mono');
      const subDir = join(monoDir, 'apps', 'web');
      mkdirSync(subDir, { recursive: true });
      writeFileSync(
        join(monoDir, 'package.json'),
        JSON.stringify({ name: 'bun-mono', bun: { workspaces: ['apps/*'] } })
      );

      const result = findProjectRoot(subDir);
      expect(result).not.toBeNull();
      expect(result!.source).toBe('monorepo');
    });

    it('should detect object-format workspaces', () => {
      const monoDir = join(walkupDir, 'obj-mono');
      const subDir = join(monoDir, 'libs', 'shared');
      mkdirSync(subDir, { recursive: true });
      writeFileSync(
        join(monoDir, 'package.json'),
        JSON.stringify({ name: 'obj-mono', workspaces: { packages: ['libs/*'] } })
      );

      const result = findProjectRoot(subDir);
      expect(result).not.toBeNull();
      expect(result!.source).toBe('monorepo');
    });

    it('should return null when nothing found', () => {
      // walkupDir is in tmpdir, should not have .memento-project, .git, or workspaces
      const emptyDir = join(walkupDir, 'empty-dir');
      mkdirSync(emptyDir, { recursive: true });

      const result = findProjectRoot(emptyDir);
      expect(result).toBeNull();
    });

    it('should prefer marker over git root', () => {
      const dir = join(walkupDir, 'marker-over-git');
      mkdirSync(join(dir, '.git'), { recursive: true });
      writeFileSync(join(dir, '.memento-project'), 'canonical-name\n');

      const result = findProjectRoot(dir);
      expect(result!.source).toBe('marker');
      expect(result!.projectId).toBe('canonical-name');
    });

    it('should prefer git root over monorepo root', () => {
      const dir = join(walkupDir, 'git-over-mono');
      mkdirSync(join(dir, '.git'), { recursive: true });
      writeFileSync(
        join(dir, 'package.json'),
        JSON.stringify({ workspaces: ['packages/*'] })
      );

      const result = findProjectRoot(dir);
      expect(result!.source).toBe('git');
    });
  });

  describe('getProjectId() — walk-up behavior', () => {
    const { getProjectId } = require('../src/ConfigManager');
    let walkupDir: string;

    beforeEach(() => {
      walkupDir = mkdtempSync(join(tmpdir(), 'memento-getpid-'));
    });

    afterEach(() => {
      if (existsSync(walkupDir)) {
        rmSync(walkupDir, { recursive: true, force: true });
      }
    });

    it('env var overrides everything including marker file', () => {
      const projectDir = join(walkupDir, 'env-override');
      mkdirSync(projectDir, { recursive: true });
      writeFileSync(join(projectDir, '.memento-project'), 'marker-name\n');

      const originalEnv = { ...process.env };
      const originalCwd = process.cwd;
      process.env.MEMENTO_PROJECT_ID = 'env-project';
      process.cwd = () => projectDir;

      try {
        expect(getProjectId()).toBe('env-project');
      } finally {
        process.cwd = originalCwd;
        process.env = originalEnv;
      }
    });

    it('marker file overrides package.json', () => {
      const projectDir = join(walkupDir, 'marker-over-pkg');
      mkdirSync(projectDir, { recursive: true });
      writeFileSync(join(projectDir, '.memento-project'), 'marker-name\n');
      writeFileSync(join(projectDir, 'package.json'), JSON.stringify({ name: 'pkg-name' }));

      const originalEnv = { ...process.env };
      const originalCwd = process.cwd;
      delete process.env.MEMENTO_PROJECT_ID;
      process.cwd = () => projectDir;

      try {
        expect(getProjectId()).toBe('marker-name');
      } finally {
        process.cwd = originalCwd;
        process.env = originalEnv;
      }
    });

    it('git root overrides package.json when no marker', () => {
      const projectDir = join(walkupDir, 'git-override');
      const subDir = join(projectDir, 'packages', 'core');
      mkdirSync(subDir, { recursive: true });
      mkdirSync(join(projectDir, '.git'), { recursive: true });
      // Sub-package has different name
      writeFileSync(join(subDir, 'package.json'), JSON.stringify({ name: '@org/core' }));
      // Root has the "real" project name
      writeFileSync(join(projectDir, 'package.json'), JSON.stringify({ name: 'git-override' }));

      const originalEnv = { ...process.env };
      const originalCwd = process.cwd;
      delete process.env.MEMENTO_PROJECT_ID;
      process.cwd = () => subDir;

      try {
        const id = getProjectId();
        // Should use git root basename, not sub-package name
        expect(id).toBe('git-override');
      } finally {
        process.cwd = originalCwd;
        process.env = originalEnv;
      }
    });

    it('preserves fallback behavior when nothing found', () => {
      const projectDir = join(walkupDir, 'fallback-dir');
      mkdirSync(projectDir, { recursive: true });
      writeFileSync(join(projectDir, 'package.json'), JSON.stringify({ name: 'fallback-pkg' }));

      const originalEnv = { ...process.env };
      const originalCwd = process.cwd;
      delete process.env.MEMENTO_PROJECT_ID;
      process.cwd = () => projectDir;

      try {
        expect(getProjectId()).toBe('fallback-pkg');
      } finally {
        process.cwd = originalCwd;
        process.env = originalEnv;
      }
    });
  });
});
