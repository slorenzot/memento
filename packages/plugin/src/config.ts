/**
 * config.ts — Plugin configuration schema and defaults.
 *
 * Configuration can come from:
 * 1. OpenCode plugin options (opencode.json `"plugin": [["@slorenzot/memento-plugin", {...}]]`)
 * 2. Default values
 */

import type { Observation } from '@slorenzot/memento-core';

export type PromptInjectionStrategy = 'recent-pinned' | 'pinned-only';

export interface MementoPluginConfig {
  promptInjection: {
    enabled: boolean;
    maxObservations: number;
    maxTokens: number;
    strategy: PromptInjectionStrategy;
    types: Observation['type'][];
  };
  database: {
    path: string | null; // null = auto-detect from project directory
  };
}

const DEFAULT_TYPES: Observation['type'][] = [
  'decision', 'architecture', 'pattern', 'preference', 'config',
];

export const DEFAULT_CONFIG: MementoPluginConfig = {
  promptInjection: {
    enabled: true,
    maxObservations: 5,
    maxTokens: 2000,
    strategy: 'recent-pinned',
    types: DEFAULT_TYPES,
  },
  database: {
    path: null,
  },
};

/**
 * Merge user-provided options with defaults.
 */
export function resolveConfig(options?: Record<string, unknown>): MementoPluginConfig {
  if (!options) return DEFAULT_CONFIG;

  const config = { ...DEFAULT_CONFIG };

  if (options.promptInjection && typeof options.promptInjection === 'object') {
    const pi = options.promptInjection as Record<string, unknown>;
    config.promptInjection = {
      enabled: pi.enabled as boolean ?? DEFAULT_CONFIG.promptInjection.enabled,
      maxObservations: pi.maxObservations as number ?? DEFAULT_CONFIG.promptInjection.maxObservations,
      maxTokens: pi.maxTokens as number ?? DEFAULT_CONFIG.promptInjection.maxTokens,
      strategy: pi.strategy as PromptInjectionStrategy ?? DEFAULT_CONFIG.promptInjection.strategy,
      types: pi.types as Observation['type'][] ?? DEFAULT_CONFIG.promptInjection.types,
    };
  }

  if (options.database && typeof options.database === 'object') {
    const db = options.database as Record<string, unknown>;
    config.database = {
      path: db.path as string | null ?? DEFAULT_CONFIG.database.path,
    };
  }

  return config;
}
