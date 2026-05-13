import { readFileSync, writeFileSync, existsSync, renameSync, mkdirSync } from 'fs';
import { join, dirname, basename } from 'path';
import { homedir } from 'os';

// ─── Config Interfaces ─────────────────────────────────────

/** Legacy flat config format (.mementorc) */
export interface MementoConfig {
  storageMethod?: 'database' | 'storage';
  dbPath?: string;
  storagePath?: string;
  projectId?: string;
}

/** New structured config format (.memento/config.json) */
export interface MementoConfigV1 {
  version: 1;
  project: string;
  database: {
    path: string;
    wal?: boolean;
  };
  defaults?: {
    autoSeed?: boolean;
    scope?: 'project' | 'personal';
    session?: {
      /** Max ms a session can be active before considered stale. Default: 86400000 (24h) */
      staleThresholdMs?: number;
    };
  };
}

/** Default stale threshold: 24 hours in milliseconds */
export const DEFAULT_STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000;

/** Options for creating a new config */
export interface CreateConfigOptions {
  project?: string;
  dbPath?: string;
  targetDir?: string;
  force?: boolean;
  global?: boolean;
}

/** Result of config creation */
export interface CreateConfigResult {
  configPath: string;
  dbPath: string;
  projectDir: string;
  migrated: boolean;
  backupPath?: string;
}

/** Result of config migration */
export interface MigrateConfigResult {
  success: boolean;
  sourcePath: string;
  targetPath: string;
  backupPath: string;
  config: MementoConfigV1;
  error?: string;
}

// ─── Constants ──────────────────────────────────────────────

const DEFAULT_CONFIG: MementoConfig = {
  storageMethod: 'database',
  dbPath: '.memento/db/memento.db',
  storagePath: 'database/storage',
};

const LEGACY_CONFIG_FILE = '.mementorc';
const NEW_CONFIG_DIR = '.memento';
const NEW_CONFIG_FILE = 'config.json';
const GLOBAL_CONFIG_DIR = join(homedir(), '.memento');
const GLOBAL_CONFIG_FILE = 'config.json';
const GLOBAL_CONFIG_PATH = join(GLOBAL_CONFIG_DIR, GLOBAL_CONFIG_FILE);

// ─── Project ID Normalization ──────────────────────────────

/**
 * Normalize a project identifier to a canonical form.
 * - Lowercase
 * - Replace spaces, underscores, and special chars with hyphens
 * - Collapse multiple consecutive hyphens into one
 * - Strip leading/trailing hyphens
 *
 * Examples:
 *   "sura chile autos"           → "sura-chile-autos"
 *   "suratech-salesforce-CL-app" → "suratech-salesforce-cl-app"
 *   "my__cool  project"          → "my-cool-project"
 *   "--leading-trailing--"       → "leading-trailing"
 *   "  spaces  everywhere  "     → "spaces-everywhere"
 */
export function normalizeProjectId(name: string): string {
  if (!name || typeof name !== 'string') {
    return 'default';
  }

  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')   // replace non-alphanumeric sequences with single hyphen
    .replace(/^-+|-+$/g, '')       // strip leading/trailing hyphens
    || 'default';                   // fallback if result is empty
}

// ─── Internal Helpers ───────────────────────────────────────

function loadJSONFile<T>(path: string): T | null {
  if (!existsSync(path)) {
    return null;
  }

  try {
    const content = readFileSync(path, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function isConfigV1(config: unknown): config is MementoConfigV1 {
  return (
    typeof config === 'object' &&
    config !== null &&
    (config as MementoConfigV1).version === 1 &&
    typeof (config as MementoConfigV1).project === 'string' &&
    typeof (config as MementoConfigV1).database?.path === 'string'
  );
}

function deriveProjectName(dir: string): string {
  // Try package.json first
  const packageJsonPath = join(dir, 'package.json');
  const packageJson = loadJSONFile<{ name?: string }>(packageJsonPath);
  if (packageJson?.name) {
    // Strip @scope/ prefix
    return packageJson.name.replace(/^@[^/]+\//, '');
  }
  // Fall back to directory name
  return basename(dir);
}

// ─── Config Discovery ──────────────────────────────────────

/**
 * Find project config searching upward from startDir.
 * Priority: .memento/config.json → .mementorc (legacy)
 */
export function findProjectConfig(startDir: string = process.cwd()): MementoConfig | null {
  let currentDir = startDir;
  const maxDepth = 10;
  let depth = 0;

  while (depth < maxDepth) {
    // New format first: .memento/config.json
    const newConfigPath = join(currentDir, NEW_CONFIG_DIR, NEW_CONFIG_FILE);
    if (existsSync(newConfigPath)) {
      const config = loadJSONFile<MementoConfigV1>(newConfigPath);
      if (isConfigV1(config)) {
        return configV1ToLegacy(config, currentDir);
      }
    }

    // Legacy format: .mementorc
    const legacyConfigPath = join(currentDir, LEGACY_CONFIG_FILE);
    if (existsSync(legacyConfigPath)) {
      const config = loadJSONFile<MementoConfig>(legacyConfigPath);
      if (config) {
        return config;
      }
    }

    const parentDir = dirname(currentDir);

    if (parentDir === currentDir) {
      break;
    }

    currentDir = parentDir;
    depth++;
  }

  return null;
}

/**
 * Find the raw config path (new or legacy format).
 * Returns the absolute path to the config file found.
 */
export function findConfigPath(startDir: string = process.cwd()): string | null {
  let currentDir = startDir;
  const maxDepth = 10;
  let depth = 0;

  while (depth < maxDepth) {
    const newConfigPath = join(currentDir, NEW_CONFIG_DIR, NEW_CONFIG_FILE);
    if (existsSync(newConfigPath)) return newConfigPath;

    const legacyConfigPath = join(currentDir, LEGACY_CONFIG_FILE);
    if (existsSync(legacyConfigPath)) return legacyConfigPath;

    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) break;
    currentDir = parentDir;
    depth++;
  }

  return null;
}

// ─── Config Loading ─────────────────────────────────────────

/**
 * Read the stale session threshold from V1 config.
 * Returns DEFAULT_STALE_THRESHOLD_MS (24h) if not configured.
 */
export function getStaleThresholdMs(): number {
  const configPath = findConfigPath();
  if (!configPath) return DEFAULT_STALE_THRESHOLD_MS;

  // Only V1 config supports this setting
  if (configPath.endsWith('config.json')) {
    const v1 = loadJSONFile<MementoConfigV1>(configPath);
    if (v1?.defaults?.session?.staleThresholdMs) {
      return v1.defaults.session.staleThresholdMs;
    }
  }

  return DEFAULT_STALE_THRESHOLD_MS;
}

export function loadConfig(): MementoConfig {
  let config: MementoConfig = { ...DEFAULT_CONFIG };

  const projectConfig = findProjectConfig();
  if (projectConfig) {
    config = { ...config, ...projectConfig };
  }

  const globalConfig = loadJSONFile<MementoConfig>(GLOBAL_CONFIG_PATH);
  if (globalConfig) {
    config = { ...config, ...globalConfig };
  }

  // Environment variable overrides
  if (process.env.MEMENTO_STORAGE_METHOD) {
    config.storageMethod = process.env.MEMENTO_STORAGE_METHOD as 'database' | 'storage';
  }

  if (process.env.MEMENTO_DB_PATH) {
    config.dbPath = process.env.MEMENTO_DB_PATH;
  }

  if (process.env.MEMENTO_STORAGE_PATH) {
    config.storagePath = process.env.MEMENTO_STORAGE_PATH;
  }

  if (process.env.MEMENTO_PROJECT_ID) {
    config.projectId = process.env.MEMENTO_PROJECT_ID;
  }

  return config;
}

// ─── Path Resolution ────────────────────────────────────────

export function resolveStoragePath(config: MementoConfig): string {
  const storagePath = config.storagePath || DEFAULT_CONFIG.storagePath!;

  if (storagePath.startsWith('/')) {
    return storagePath;
  }

  if (storagePath.startsWith('~/')) {
    return join(homedir(), storagePath.slice(2));
  }

  return join(process.cwd(), storagePath);
}

export function resolveDbPath(config: MementoConfig): string {
  const dbPath = config.dbPath || DEFAULT_CONFIG.dbPath!;

  if (dbPath.startsWith('/')) {
    return dbPath;
  }

  if (dbPath.startsWith('~/')) {
    return join(homedir(), dbPath.slice(2));
  }

  return join(process.cwd(), dbPath);
}

export function getProjectId(config: MementoConfig): string {
  if (config.projectId) {
    return normalizeProjectId(config.projectId);
  }

  const packageJsonPath = join(process.cwd(), 'package.json');
  const packageJson = loadJSONFile<{ name?: string }>(packageJsonPath);
  const rawName = packageJson?.name || 'default';

  // Strip @scope/ prefix before normalizing (consistent with deriveProjectName)
  return normalizeProjectId(rawName.replace(/^@[^/]+\//, ''));
}

// ─── Config V1 ↔ Legacy Conversion ─────────────────────────

function configV1ToLegacy(v1: MementoConfigV1, _configDir: string): MementoConfig {
  return {
    storageMethod: 'database',
    dbPath: v1.database.path,
    projectId: v1.project,
  };
}

function legacyToConfigV1(legacy: MementoConfig, projectDir: string): MementoConfigV1 {
  return {
    version: 1,
    project: legacy.projectId || deriveProjectName(projectDir),
    database: {
      path: legacy.dbPath || join('.memento', 'memento.db'),
      wal: true,
    },
    defaults: {
      autoSeed: true,
      scope: 'project',
    },
  };
}

// ─── Config Creation ────────────────────────────────────────

/**
 * Create a new config file (.memento/config.json or global).
 * Returns the result with paths and whether migration occurred.
 */
export function createConfig(options: CreateConfigOptions = {}): CreateConfigResult {
  const {
    project,
    dbPath,
    targetDir,
    force = false,
    global = false,
  } = options;

  const resolvedDir = global
    ? GLOBAL_CONFIG_DIR
    : (targetDir || process.cwd());

  const configDir = global
    ? GLOBAL_CONFIG_DIR
    : join(resolvedDir, NEW_CONFIG_DIR);

  const configPath = join(configDir, NEW_CONFIG_FILE);

  // Check existing config
  if (!force && existsSync(configPath)) {
    throw new Error(`Config already exists at ${configPath}. Use --force to overwrite.`);
  }

  // Check for legacy config to migrate
  let migrated = false;
  let backupPath: string | undefined;
  const legacyPath = join(resolvedDir, LEGACY_CONFIG_FILE);

  let projectName = project || deriveProjectName(resolvedDir);
  let resolvedDbPath = dbPath || join(NEW_CONFIG_DIR, 'memento.db');

  // If migrating from legacy config
  if (!global && existsSync(legacyPath)) {
    const legacyConfig = loadJSONFile<MementoConfig>(legacyPath);
    if (legacyConfig) {
      if (!project) projectName = legacyConfig.projectId || projectName;
      if (!dbPath && legacyConfig.dbPath) {
        // Keep existing DB path from legacy config
        resolvedDbPath = legacyConfig.dbPath;
      }
      migrated = true;
    }
  }

  // Build V1 config
  const config: MementoConfigV1 = {
    version: 1,
    project: projectName,
    database: {
      path: resolvedDbPath,
      wal: true,
    },
    defaults: {
      autoSeed: true,
      scope: global ? 'personal' : 'project',
    },
  };

  // Write config
  mkdirSync(configDir, { recursive: true });
  writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');

  return {
    configPath,
    dbPath: global
      ? join(GLOBAL_CONFIG_DIR, resolvedDbPath)
      : join(resolvedDir, resolvedDbPath),
    projectDir: resolvedDir,
    migrated,
    backupPath,
  };
}

// ─── Config Migration ──────────────────────────────────────

/**
 * Migrate a legacy .mementorc to the new .memento/config.json format.
 * Backs up the original file as .mementorc.bak.
 */
export function migrateConfig(sourceDir: string = process.cwd()): MigrateConfigResult {
  const sourcePath = join(sourceDir, LEGACY_CONFIG_FILE);
  const targetDir = join(sourceDir, NEW_CONFIG_DIR);
  const targetPath = join(targetDir, NEW_CONFIG_FILE);
  const backupPath = sourcePath + '.bak';

  // Validate source exists
  if (!existsSync(sourcePath)) {
    return {
      success: false,
      sourcePath,
      targetPath,
      backupPath,
      config: {} as MementoConfigV1,
      error: `No .mementorc found at ${sourcePath}`,
    };
  }

  // Load and validate legacy config
  const legacyConfig = loadJSONFile<MementoConfig>(sourcePath);
  if (!legacyConfig) {
    return {
      success: false,
      sourcePath,
      targetPath,
      backupPath,
      config: {} as MementoConfigV1,
      error: `Failed to parse ${sourcePath}`,
    };
  }

  // Convert to V1
  const v1Config = legacyToConfigV1(legacyConfig, sourceDir);

  // Create target directory
  mkdirSync(targetDir, { recursive: true });

  // Write new config
  writeFileSync(targetPath, JSON.stringify(v1Config, null, 2) + '\n', 'utf-8');

  // Backup original
  renameSync(sourcePath, backupPath);

  return {
    success: true,
    sourcePath,
    targetPath,
    backupPath,
    config: v1Config,
  };
}

// ─── Utility ────────────────────────────────────────────────

export { GLOBAL_CONFIG_DIR, GLOBAL_CONFIG_PATH, NEW_CONFIG_DIR, NEW_CONFIG_FILE, LEGACY_CONFIG_FILE };
