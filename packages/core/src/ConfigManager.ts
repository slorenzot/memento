import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { fileURLToPath } from 'url';

export interface MementoConfig {
  storageMethod?: 'database' | 'storage';
  dbPath?: string;
  storagePath?: string;
  projectId?: string;
}

const DEFAULT_CONFIG: MementoConfig = {
  storageMethod: 'database',
  dbPath: '.memento/db/memento.db',
  storagePath: 'database/storage',
};

const GLOBAL_CONFIG_PATH = join(homedir(), '.memento', 'config');
const LOCAL_CONFIG_FILE = '.mementorc';

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

export function findProjectConfig(startDir: string = process.cwd()): MementoConfig | null {
  let currentDir = startDir;
  const maxDepth = 10;
  let depth = 0;

  while (depth < maxDepth) {
    const configPath = join(currentDir, LOCAL_CONFIG_FILE);

    if (existsSync(configPath)) {
      const config = loadJSONFile<MementoConfig>(configPath);
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
    return config.projectId;
  }

  const packageJsonPath = join(process.cwd(), 'package.json');
  const packageJson = loadJSONFile<{ name?: string }>(packageJsonPath);

  return packageJson?.name || 'default';
}
