import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, basename } from 'path';
import { homedir } from 'os';

// ─── Config Interfaces ─────────────────────────────────────

/**
 * Global config format (~/.memento/config.json).
 * No per-project config files — all projects share the centralized DB.
 */
export interface MementoConfig {
  version?: number;
  defaults?: {
    scope?: 'project' | 'personal';
    tokenSavings?: {
      /** Report estimated token savings in search/context responses. Default: true */
      enabled?: boolean;
    };
    session?: {
      /** Max ms a session can be active before considered stale. Default: 86400000 (24h) */
      staleThresholdMs?: number;
    };
  };
}

/** Default stale threshold: 24 hours in milliseconds */
export const DEFAULT_STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000;

/** Result of config initialization */
export interface InitConfigResult {
  configPath: string;
  dbPath: string;
  created: boolean;
}

/** Result of project DB migration */
export interface MigrateProjectDbResult {
  success: boolean;
  sourcePath: string;
  projectDir: string;
  projectId: string;
  observationsImported: number;
  sessionsImported: number;
  error?: string;
}

// ─── Constants ──────────────────────────────────────────────

/** Centralized database path — all projects in one DB */
export const GLOBAL_DB_PATH = join(homedir(), '.memento', 'memento.db');

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
 *   "sura chile autos"           -> "sura-chile-autos"
 *   "suratech-salesforce-CL-app" -> "suratech-salesforce-cl-app"
 *   "my__cool  project"          -> "my-cool-project"
 *   "--leading-trailing--"       -> "leading-trailing"
 *   "  spaces  everywhere  "     -> "spaces-everywhere"
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

// ─── Path Resolution ────────────────────────────────────────

/**
 * Resolve the database path.
 * Priority: MEMENTO_DB_PATH env var > centralized ~/.memento/memento.db
 */
export function resolveDbPath(_config?: MementoConfig): string {
  if (process.env.MEMENTO_DB_PATH) {
    const envPath = process.env.MEMENTO_DB_PATH;
    if (envPath.startsWith('~/')) {
      return join(homedir(), envPath.slice(2));
    }
    return envPath;
  }

  return GLOBAL_DB_PATH;
}

/**
 * Detect project_id from the current working directory.
 * Priority: MEMENTO_PROJECT_ID env var > package.json name > directory name > "default"
 */
export function getProjectId(_config?: MementoConfig): string {
  if (process.env.MEMENTO_PROJECT_ID) {
    return normalizeProjectId(process.env.MEMENTO_PROJECT_ID);
  }

  const packageJsonPath = join(process.cwd(), 'package.json');
  const packageJson = loadJSONFile<{ name?: string }>(packageJsonPath);
  const rawName = packageJson?.name || basename(process.cwd());

  // Strip @scope/ prefix before normalizing
  return normalizeProjectId(rawName.replace(/^@[^/]+\//, ''));
}

// ─── Config Loading ─────────────────────────────────────────

/**
 * Load global config from ~/.memento/config.json.
 * Returns default config if file doesn't exist.
 */
export function loadConfig(): MementoConfig {
  const globalConfig = loadJSONFile<MementoConfig>(GLOBAL_CONFIG_PATH);
  if (globalConfig) {
    return globalConfig;
  }

  return { version: 1, defaults: { scope: 'project' } };
}

/**
 * Read the stale session threshold from global config.
 * Returns DEFAULT_STALE_THRESHOLD_MS (24h) if not configured.
 */
export function getStaleThresholdMs(): number {
  const config = loadConfig();
  if (config?.defaults?.session?.staleThresholdMs) {
    return config.defaults.session.staleThresholdMs;
  }

  return DEFAULT_STALE_THRESHOLD_MS;
}

/**
 * Check if token savings reporting is enabled.
 * Priority: MEMENTO_TOKEN_SAVINGS env var > config file > default (true)
 */
export function isTokenSavingsEnabled(): boolean {
  // Env var override (highest priority)
  const envVal = process.env.MEMENTO_TOKEN_SAVINGS;
  if (envVal !== undefined) {
    return envVal === 'true' || envVal === '1';
  }

  // Config file
  const config = loadConfig();
  const configVal = config?.defaults?.tokenSavings?.enabled;
  if (configVal !== undefined) {
    return configVal;
  }

  // Default: enabled
  return true;
}

// ─── Initialization ─────────────────────────────────────────

/**
 * Ensure the global ~/.memento/ directory and config exist.
 * Creates them if they don't exist.
 */
export function ensureGlobalDir(): InitConfigResult {
  mkdirSync(GLOBAL_CONFIG_DIR, { recursive: true });

  const configPath = GLOBAL_CONFIG_PATH;
  const created = !existsSync(configPath);

  if (created) {
    const defaultConfig: MementoConfig = {
      version: 1,
      defaults: {
        scope: 'project',
      },
    };
    writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2) + '\n', 'utf-8');
  }

  return {
    configPath,
    dbPath: GLOBAL_DB_PATH,
    created,
  };
}

// ─── Utility ────────────────────────────────────────────────

export { GLOBAL_CONFIG_DIR, GLOBAL_CONFIG_PATH };
