/**
 * plugin.ts — OpenCode plugin entry point for Memento.
 *
 * Injects relevant observations into the system prompt via
 * `experimental.chat.system.transform` hook.
 *
 * Installation:
 *   // opencode.json
 *   { "plugin": [["@slorenzot/memento-plugin", { "maxTokens": 2000 }]] }
 *
 * Graceful degradation: if DB unavailable, injects nothing (doesn't break session).
 */

import { join, basename } from 'path';
import { existsSync } from 'fs';
import { homedir } from 'os';
import type { Plugin, Hooks } from '@opencode-ai/plugin';
import { MemoryEngine, GLOBAL_DB_PATH } from '@slorenzot/memento-core';
import { resolveConfig } from './config.js';
import { renderContext } from './renderer.js';

export { resolveConfig } from './config.js';
export { renderContext, renderObservationXml, estimateTokens } from './renderer.js';
export type { MementoPluginConfig, PromptInjectionStrategy } from './config.js';
export type { RenderedContext } from './renderer.js';

/**
 * Resolve database path.
 * Priority: plugin config > MEMENTO_DB_PATH env > centralized ~/.memento/memento.db
 */
function resolveDatabasePath(configPath: string | null): string {
  if (configPath) return configPath;

  // Check MEMENTO_DB_PATH env var
  if (process.env.MEMENTO_DB_PATH) {
    const envPath = process.env.MEMENTO_DB_PATH;
    if (envPath.startsWith('~/')) {
      return join(homedir(), envPath.slice(2));
    }
    return envPath;
  }

  // Default: centralized DB
  return GLOBAL_DB_PATH;
}

export const MementoPlugin: Plugin = async (input, options) => {
  const config = resolveConfig(options as Record<string, unknown> | undefined);
  const dbPath = resolveDatabasePath(config.database.path);

  // Initialize engine — if DB fails, we degrade gracefully
  let engine: MemoryEngine | null = null;
  try {
    engine = new MemoryEngine(dbPath);
    if (!engine.isHealthy()) {
      console.error('[memento-plugin] Database initialization failed, prompt injection disabled');
      engine = null;
    }
  } catch (err) {
    console.error('[memento-plugin] Failed to initialize MemoryEngine:', err);
    engine = null;
  }

  const hooks: Hooks = {};

  if (config.promptInjection.enabled && engine) {
    hooks['experimental.chat.system.transform'] = async (_input, output) => {
      try {
        const observations = engine!.selectForPrompt({
          enabled: true,
          maxObservations: config.promptInjection.maxObservations,
          maxTokens: config.promptInjection.maxTokens,
          strategy: config.promptInjection.strategy,
          types: config.promptInjection.types,
        });

        if (observations.length === 0) return;

        const rendered = renderContext(observations, config.promptInjection.maxTokens);
        if (!rendered.xml) return;

        // Insert early for salience (after provider header, before user instructions)
        const insertAt = output.system.length > 0 ? 1 : 0;
        output.system.splice(insertAt, 0, rendered.xml);

        if (rendered.budgetExceeded) {
          console.error(
            `[memento-plugin] Token budget exceeded: ${rendered.tokenCount}/${config.promptInjection.maxTokens} tokens, ${rendered.observationCount} observations injected`
          );
        }
      } catch (err) {
        // Graceful: never break the session
        console.error('[memento-plugin] Error in system prompt transform:', err);
      }
    };
  }

  return hooks;
};

export default MementoPlugin;
