/**
 * tools.ts — Memento MCP tool registrations.
 *
 * Exports `registerTools()` so that both the production server (index.ts)
 * and test suites can create a fully-configured McpServer.
 *
 * All tool handlers close over a `McpServerContext` object instead of
 * module-level variables, making the code testable without import side-effects.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { MemoryEngine } from '@slorenzot/memento-core';
import type { ExportFormat, MergeStrategy, Observation } from '@slorenzot/memento-core';
import { existsSync } from 'fs';
import { join } from 'path';
import * as fs from 'fs';
import {
  formatObservation,
  formatObservationList,
  formatSession,
  formatSessionList,
  formatStats,
  formatHealth,
  formatConfig,
  formatJournalEntry,
  formatJournalList,
} from './formatters.js';

// ─── Context ────────────────────────────────────────────────

export interface McpServerContext {
  engine: MemoryEngine;
  projectId: string;
  dbPath: string;
  activeSessionId: number | null;
}

// ─── Error Helper ───────────────────────────────────────────

function handleToolError(error: unknown, ctx: McpServerContext): { content: Array<{ type: 'text'; text: string }> } {
  const message = error instanceof Error ? error.message : String(error);
  console.error('Tool execution error:', message);

  let hint = 'An error occurred during operation';
  if (!ctx.engine.isHealthy()) {
    const initError = ctx.engine.getInitError();
    hint = `Database initialization failed: ${initError?.message || 'Unknown error'}. Check configuration and permissions.`;
  }

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ success: false, error: message, hint }, null, 2),
      },
    ],
  };
}

// ─── Tool Registration ──────────────────────────────────────

export function registerTools(server: McpServer, ctx: McpServerContext): void {
  // ─── Observation Tools ──────────────────────────────────────

  server.tool(
    'mem_save',
    'Save an observation to persistent memory. Types: decision, bug, discovery, note. Call this PROACTIVELY after making decisions, fixing bugs, or discovering something non-obvious. Returns: human-readable confirmation with observation ID.',
    {
      title: z.string().describe('Short, searchable title (e.g. "Fixed N+1 in UserList")'),
      content: z.string().describe('Structured content: What/Why/Where/Learned format'),
      type: z
        .enum(['decision', 'bug', 'discovery', 'note', 'summary', 'learning', 'pattern', 'architecture', 'config', 'preference'])
        .optional()
        .describe('Type of observation (default: note)'),
      topic_key: z
        .string()
        .optional()
        .describe('Stable topic key for grouping (e.g. "architecture/auth-model")'),
      project_id: z.string().optional().describe('Project identifier'),
      metadata: z.record(z.unknown()).optional().describe('Additional metadata'),
      scope: z.enum(['project', 'personal']).optional().describe('Scope: project (default) or personal'),
      pinned: z.boolean().optional().describe('Pin observation for always-injection in system prompt (default: false)'),
      read_only: z.boolean().optional().describe('Mark as read-only to prevent agent modifications (default: false)'),
    },
    { title: 'Save observation', readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    async ({ title, content, type, topic_key, project_id, metadata, scope, pinned, read_only }) => {
      try {
        const currentProjectId = project_id || ctx.projectId;
        let sessionId = ctx.activeSessionId;

        if (!sessionId) {
          const session = await ctx.engine.createSession({
            projectId: currentProjectId,
            endedAt: null,
            metadata: {},
          });
          sessionId = session.id;
          ctx.activeSessionId = sessionId;
        }

        const obs = await ctx.engine.createObservation({
          sessionId,
          title,
          content,
          type: (type as Observation['type']) || 'note',
          topicKey: topic_key || null,
          projectId: currentProjectId,
          metadata: metadata || {},
          scope: scope as 'project' | 'personal' | undefined,
          pinned: pinned || false,
          readOnly: read_only || false,
        });

        return {
          content: [
            {
              type: 'text',
              text: (() => {
                const base = `Observation #${obs.id} "${obs.title}" saved (${obs.type}, ${currentProjectId})`;
                // Auto-suggest topic_key if not provided
                if (!topic_key && title) {
                  const source = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
                  const typePrefix = type ? `${type}/` : '';
                  const suggested = `${typePrefix}${source}`;
                  return `${base}\nSuggested topic_key: ${suggested}`;
                }
                return base;
              })(),
            },
          ],
        };
      } catch (error: unknown) {
        return handleToolError(error, ctx);
      }
    }
  );

  server.tool(
    'mem_search',
    'Search observations using full-text search (FTS5). Start with small limits and expand only if needed. Results are TRUNCATED — use mem_get_observation with the returned ID for full content. Use `sort` for chronological ordering instead of mem_timeline. Use `mode` for semantic or hybrid search. Returns: human-readable Markdown with observation list.',
    {
      query: z.string().optional().describe('Search query (FTS5 syntax for keyword mode, natural language for semantic/hybrid)'),
      type: z.enum(['decision', 'bug', 'discovery', 'note', 'summary', 'learning', 'pattern', 'architecture', 'config', 'preference']).optional().describe('Filter by observation type'),
      project_id: z.string().optional().describe('Filter by project identifier'),
      topic_key: z.string().optional().describe('Filter by topic key (exact match)'),
      limit: z.number().optional().describe('Max results (default: 10)'),
      offset: z.number().optional().describe('Offset for pagination'),
      include_deleted: z.boolean().optional().describe('Include soft-deleted observations'),
      scope: z.enum(['project', 'personal']).optional().describe('Filter by scope'),
      sort: z.enum(['relevance', 'chronological']).optional().describe('Sort order: "relevance" (default, FTS5 rank) or "chronological" (created_at ASC, replaces mem_timeline)'),
      mode: z.enum(['keyword', 'semantic', 'hybrid']).optional().describe('Search mode: "keyword" (default, FTS5), "semantic" (embeddings), "hybrid" (combined)'),
    },
    { title: 'Search observations', readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    async ({ query, type, project_id, topic_key, limit, offset, include_deleted, scope, sort, mode }) => {
      try {
        const searchMode = mode || 'keyword';
        const sortMode = sort || 'relevance';

        // Chronological mode: delegate to getTimeline for strict chronological order
        if (sortMode === 'chronological') {
          const result = await ctx.engine.getTimeline({
            projectId: project_id,
            limit: limit || 50,
            offset,
          });
          return {
            content: [{ type: 'text', text: formatObservationList(result) }],
          };
        }

        // Relevance mode with search mode support
        const result = await ctx.engine.search({
          query,
          type: type as Observation['type'] | undefined,
          projectId: project_id,
          topicKey: topic_key,
          limit: limit || 10,
          offset,
          includeDeleted: include_deleted,
          scope: scope as 'project' | 'personal' | undefined,
          mode: searchMode as 'keyword' | 'semantic' | 'hybrid' | undefined,
        });

        // Include scores in output for semantic/hybrid modes
        if (result.scores && result.scores.size > 0) {
          const scoreInfo = Array.from(result.scores.entries())
            .map(([id, score]) => `  #${id}: ${score.toFixed(3)}`)
            .join('\n');
          const base = formatObservationList(result);
          return {
            content: [{ type: 'text', text: `${base}\n\nSimilarity scores:\n${scoreInfo}` }],
          };
        }

        return {
          content: [{ type: 'text', text: formatObservationList(result) }],
        };
      } catch (error: unknown) {
        return handleToolError(error, ctx);
      }
    }
  );

  server.tool(
    'mem_get_observation',
    'Get full untruncated content of a specific observation by ID. Use this AFTER mem_search, which returns truncated results — pass the observation ID from search results to get the complete content including the full content field. Returns: human-readable Markdown with full observation details.',
    {
      id: z.number().describe('Observation ID (from mem_search results)'),
      include_deleted: z.boolean().optional().describe('Include soft-deleted observations (default: false)'),
    },
    { title: 'Get observation details', readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    async ({ id, include_deleted }) => {
      try {
        const obs = await ctx.engine.getObservation(id, include_deleted);
        if (!obs) throw new Error(`Observation ${id} not found`);
        return {
          content: [{ type: 'text', text: formatObservation(obs) }],
        };
      } catch (error: unknown) {
        return handleToolError(error, ctx);
      }
    }
  );

  server.tool(
    'mem_update',
    'Update an existing observation\'s title, content, type, topic_key, or pinned status. Use this to correct or refine previously saved observations. All fields are optional — only provided fields will be updated. Returns: human-readable confirmation.',
    {
      id: z.number().describe('Observation ID to update'),
      title: z.string().optional().describe('New title (short, searchable)'),
      content: z.string().optional().describe('New content (What/Why/Where/Learned format)'),
      type: z.enum(['decision', 'bug', 'discovery', 'note', 'summary', 'learning', 'pattern', 'architecture', 'config', 'preference']).optional().describe('New observation type'),
      topic_key: z.string().optional().describe('New or updated topic key for grouping'),
      pinned: z.boolean().optional().describe('Pin/unpin for system prompt injection'),
    },
    { title: 'Update observation', readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    async ({ id, title, content, type, topic_key, pinned }) => {
      try {
        const updated = await ctx.engine.updateObservation(id, {
          title,
          content,
          type: type as Observation['type'] | undefined,
          topicKey: topic_key,
          pinned,
        });
        return {
          content: [
            { type: 'text', text: `Observation #${updated.id} "${updated.title}" updated` },
          ],
        };
      } catch (error: unknown) {
        return handleToolError(error, ctx);
      }
    }
  );

  // ─── Replace (surgical edits) ────────────────────────────────

  server.tool(
    'mem_replace',
    'Replace a substring within an observation content without requiring the full content. More token-efficient than mem_update for small changes. Respects read-only protection. Returns: human-readable confirmation.',
    {
      id: z.number().describe('Observation ID to modify'),
      old_text: z.string().describe('Exact substring to find (must be unique in content)'),
      new_text: z.string().describe('Replacement text'),
    },
    { title: 'Replace text in observation', readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    async ({ id, old_text, new_text }) => {
      try {
        const obs = await ctx.engine.getObservation(id);
        if (!obs) throw new Error(`Observation ${id} not found`);
        if (obs.readOnly) {
          return {
            content: [{ type: 'text', text: `Observation #${id} is read-only. Cannot modify.` }],
          };
        }

        const content = obs.content;
        const index = content.indexOf(old_text);
        if (index === -1) {
          return {
            content: [{ type: 'text', text: `Text not found in observation #${id}. No changes made.` }],
          };
        }

        // Check for multiple occurrences
        const secondIndex = content.indexOf(old_text, index + 1);
        if (secondIndex !== -1) {
          return {
            content: [{ type: 'text', text: `Found multiple occurrences of the text in observation #${id}. Provide a more specific (longer) substring to uniquely identify the replacement target.` }],
          };
        }

        const newContent = content.slice(0, index) + new_text + content.slice(index + old_text.length);
        await ctx.engine.updateObservation(id, { content: newContent });

        return {
          content: [{ type: 'text', text: `Replaced text in observation #${id} "${obs.title}" (${old_text.length} → ${new_text.length} chars)` }],
        };
      } catch (error: unknown) {
        return handleToolError(error, ctx);
      }
    }
  );

  // ─── Delete / Restore / Purge (consolidated) ─────────────────

  server.tool(
    'mem_delete',
    'Delete, restore, purge, or list deleted observations. Use `action` to control behavior: "soft" (default, safe hide), "restore" (bring back), "permanent" (irreversible delete, requires confirm), "list" (view deleted). Returns: human-readable confirmation.',
    {
      id: z.number().optional().describe('Observation ID (required for soft/restore actions)'),
      action: z.enum(['soft', 'permanent', 'restore', 'list']).optional().describe('Action: "soft" (default, soft-delete), "permanent" (irreversible, requires confirm), "restore" (undo delete), "list" (view deleted)'),
      reason: z.string().optional().describe('Reason for deletion (stored in metadata, for "soft" action)'),
      confirm: z.boolean().optional().describe('Must be true for "permanent" action'),
      project_id: z.string().optional().describe('Project filter for "list" and "permanent" actions'),
      observation_ids: z.array(z.number()).optional().describe('Specific IDs to purge (for "permanent" action)'),
      limit: z.number().optional().describe('Max results for "list" action (default: 20)'),
    },
    { title: 'Manage observation lifecycle', readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    async ({ id, action, reason, confirm, project_id, observation_ids, limit }) => {
      try {
        const act = action || 'soft';

        switch (act) {
          case 'soft': {
            if (!id) throw new Error('id is required for soft-delete action');
            await ctx.engine.deleteObservation(id, reason);
            return {
              content: [{ type: 'text', text: `Observation #${id} soft-deleted` }],
            };
          }

          case 'restore': {
            if (!id) throw new Error('id is required for restore action');
            const restored = await ctx.engine.restoreObservation(id);
            return {
              content: [{ type: 'text', text: `Observation #${restored.id} restored` }],
            };
          }

          case 'permanent': {
            if (!confirm) {
              return {
                content: [{ type: 'text', text: 'Error: confirm must be true to execute permanent deletion' }],
              };
            }
            const result = await ctx.engine.purgeObservations({
              projectId: project_id,
              observationIds: observation_ids,
            });
            return {
              content: [{ type: 'text', text: `Purged ${result.purgedCount} deleted observation${result.purgedCount !== 1 ? 's' : ''}` }],
            };
          }

          case 'list': {
            const result = await ctx.engine.listDeleted({ projectId: project_id, limit });
            return {
              content: [{ type: 'text', text: formatObservationList(result) }],
            };
          }

          default: {
            const _exhaustive: never = act;
            throw new Error(`Unknown action: ${_exhaustive as string}`);
          }
        }
      } catch (error: unknown) {
        return handleToolError(error, ctx);
      }
    }
  );

  // ─── Merge ──────────────────────────────────────────────────

  server.tool(
    'mem_merge',
    'Merge related observations into a single synthesized record. Identifies candidates automatically by topic_key or content similarity (Jaccard > 0.85). ALWAYS use dry_run: true first to preview candidates before executing. Strategies: by_topic (same topic_key), by_similarity (Jaccard > 0.85), by_ids (specific IDs). Returns: human-readable summary.',
    {
      project_id: z.string().describe('Project to merge observations in (required)'),
      topic_key: z.string().optional().describe('Merge all observations with this topic_key'),
      observation_ids: z
        .array(z.number())
        .optional()
        .describe('Specific observation IDs to merge (overrides auto-detection)'),
      strategy: z
        .enum(['by_topic', 'by_similarity', 'by_ids'])
        .optional()
        .describe('Merge strategy (default: by_topic)'),
      dry_run: z.boolean().optional().describe('If true, returns candidates without executing merge'),
    },
    { title: 'Merge observations', readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    async ({ project_id, topic_key, observation_ids, strategy, dry_run }) => {
      try {
        const results = await ctx.engine.mergeObservations({
          projectId: project_id,
          topicKey: topic_key,
          observationIds: observation_ids,
          strategy: (strategy as MergeStrategy) || 'by_topic',
          dryRun: dry_run,
        });

        const totalObs = results.reduce((sum, r) => sum + r.originalCount, 0);

        if (dry_run) {
          return {
            content: [
              {
                type: 'text',
                text: `Preview: ${results.length} merge group${results.length !== 1 ? 's' : ''} found (dry run)`,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: `Merged ${results.length} group${results.length !== 1 ? 's' : ''} (${totalObs} observations consolidated)`,
            },
          ],
        };
      } catch (error: unknown) {
        return handleToolError(error, ctx);
      }
    }
  );

  // ─── Pin / Unpin ────────────────────────────────────────────

  server.tool(
    'mem_pin',
    'Pin an observation so it is always injected into the system prompt by the OpenCode plugin. Pinned observations are included before non-pinned ones, within the token budget. Returns: human-readable confirmation.',
    {
      id: z.number().describe('Observation ID to pin'),
    },
    { title: 'Pin observation', readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    async ({ id }) => {
      try {
        const obs = await ctx.engine.pinObservation(id);
        return {
          content: [{ type: 'text', text: `Observation #${obs.id} "${obs.title}" pinned — will be included in system prompt injection` }],
        };
      } catch (error: unknown) {
        return handleToolError(error, ctx);
      }
    }
  );

  server.tool(
    'mem_unpin',
    'Unpin an observation so it is no longer always injected into the system prompt. Returns: human-readable confirmation.',
    {
      id: z.number().describe('Observation ID to unpin'),
    },
    { title: 'Unpin observation', readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    async ({ id }) => {
      try {
        const obs = await ctx.engine.unpinObservation(id);
        return {
          content: [{ type: 'text', text: `Observation #${obs.id} "${obs.title}" unpinned` }],
        };
      } catch (error: unknown) {
        return handleToolError(error, ctx);
      }
    }
  );

  // ─── Lock / Unlock (read-only protection) ────────────────────

  server.tool(
    'mem_lock',
    'Lock an observation as read-only. Prevents the agent from modifying or deleting it. Only the user can unlock via CLI. Returns: human-readable confirmation.',
    {
      id: z.number().describe('Observation ID to lock'),
    },
    { title: 'Lock observation', readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    async ({ id }) => {
      try {
        const obs = await ctx.engine.lockObservation(id);
        return {
          content: [{ type: 'text', text: `Observation #${obs.id} "${obs.title}" locked (read-only)` }],
        };
      } catch (error: unknown) {
        return handleToolError(error, ctx);
      }
    }
  );

  server.tool(
    'mem_unlock',
    'Unlock a read-only observation. Allows modifications again. Returns: human-readable confirmation.',
    {
      id: z.number().describe('Observation ID to unlock'),
    },
    { title: 'Unlock observation', readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    async ({ id }) => {
      try {
        const obs = await ctx.engine.unlockObservation(id);
        return {
          content: [{ type: 'text', text: `Observation #${obs.id} "${obs.title}" unlocked` }],
        };
      } catch (error: unknown) {
        return handleToolError(error, ctx);
      }
    }
  );

  // ─── Export ──────────────────────────────────────────────────

  server.tool(
    'mem_export',
    'Export observations to JSON, XML, or TXT format. Use filters to reduce scope. Returns: JSON object { format, recordCount, exportedAt, content }. Useful for backups, migration, or sharing memory across projects.',
    {
      format: z.enum(['json', 'xml', 'txt']).optional().describe('Export format (default: json)'),
      project_id: z.string().optional().describe('Filter by project identifier'),
      type: z.enum(['decision', 'bug', 'discovery', 'note', 'summary', 'learning', 'pattern', 'architecture', 'config', 'preference']).optional().describe('Filter by observation type'),
      topic_key: z.string().optional().describe('Filter by topic key'),
      date_from: z.string().optional().describe('ISO date string — export from this date'),
      date_to: z.string().optional().describe('ISO date string — export until this date'),
      include_deleted: z.boolean().optional().describe('Include soft-deleted observations'),
    },
    { title: 'Export observations', readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    async ({ format, project_id, type, topic_key, date_from, date_to, include_deleted }) => {
      try {
        const result = await ctx.engine.exportObservations({
          format: (format as ExportFormat) || 'json',
          projectId: project_id,
          type: type as Observation['type'] | undefined,
          topicKey: topic_key,
          dateFrom: date_from ? new Date(date_from) : undefined,
          dateTo: date_to ? new Date(date_to) : undefined,
          includeDeleted: include_deleted,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  format: result.format,
                  recordCount: result.recordCount,
                  exportedAt: result.exportedAt.toISOString(),
                  content: result.content,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error: unknown) {
        return handleToolError(error, ctx);
      }
    }
  );

  // ─── Session Tools ──────────────────────────────────────────

  server.tool(
    'mem_session_start',
    'Start a new memory session for tracking a coding conversation. Call this at the BEGINNING of a session to group all subsequent observations together. Only one session is active at a time — starting a new one replaces the previous. Returns: human-readable confirmation with session ID.',
    {
      project_id: z.string().describe('Project identifier'),
      metadata: z.record(z.unknown()).optional().describe('Additional session metadata (e.g. agent name, environment)'),
    },
    { title: 'Start session', readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    async ({ project_id, metadata }) => {
      try {
        const session = await ctx.engine.createSession({
          projectId: project_id,
          endedAt: null,
          metadata: metadata || {},
          seedIfEmpty: true,
        });
        ctx.activeSessionId = session.id;

        return {
          content: [
            {
              type: 'text',
              text: `Session #${session.id} started (project: ${project_id})`,
            },
          ],
        };
      } catch (error: unknown) {
        return handleToolError(error, ctx);
      }
    }
  );

  server.tool(
    'mem_session_end',
    'End the current active session. Call this BEFORE closing a conversation to properly close the session tracking. This is MANDATORY for clean session lifecycle — do not skip it. Returns: human-readable confirmation.',
    {},
    { title: 'End session', readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    async () => {
      try {
        if (!ctx.activeSessionId) throw new Error('No active session');
        const ended = await ctx.engine.endSession(ctx.activeSessionId);
        ctx.activeSessionId = null;

        return {
          content: [
            {
              type: 'text',
              text: `Session #${ended.id} ended`,
            },
          ],
        };
      } catch (error: unknown) {
        return handleToolError(error, ctx);
      }
    }
  );

  // ─── Agent Convenience Tools ────────────────────────────────

  server.tool(
    'mem_context',
    'Get recent observations for context recovery — what was done before compaction or in previous sessions. Unlike mem_search, this does NOT use FTS5, returns observations ordered by created_at DESC with session metadata. Use `scope` to filter personal vs project observations. Returns: human-readable Markdown with recent observation list.',
    {
      project_id: z.string().optional().describe('Filter by project identifier'),
      limit: z.number().optional().describe('Max results (default: 20)'),
      scope: z.enum(['project', 'personal']).optional().describe('Filter by scope: personal (user preferences, cross-project) or project (codebase-specific)'),
    },
    { title: 'Get recent context', readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    async ({ project_id, limit, scope }) => {
      try {
        const result = await ctx.engine.getRecentContext({
          projectId: project_id,
          limit: limit || 20,
          scope: scope as 'project' | 'personal' | undefined,
        });

        return {
          content: [{ type: 'text', text: formatObservationList(result) }],
        };
      } catch (error: unknown) {
        return handleToolError(error, ctx);
      }
    }
  );

  server.tool(
    'mem_session_summary',
    'Create a session summary observation at the END of a conversation. Saves an observation with type "summary" and a structured format (Goal/Discoveries/Accomplished/Files). Call this BEFORE closing a conversation. Returns: human-readable confirmation with observation ID.',
    {
      content: z.string().describe('Structured summary content (Goal/Discoveries/Accomplished/Files format)'),
      project_id: z.string().describe('Project identifier'),
      session_id: z.number().optional().describe('Session ID (uses active session if not provided)'),
    },
    { title: 'Save session summary', readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    async ({ content, project_id, session_id }) => {
      try {
        const currentProjectId = project_id || ctx.projectId;
        let sessionId = session_id || ctx.activeSessionId;

        if (!sessionId) {
          const session = await ctx.engine.createSession({
            projectId: currentProjectId,
            endedAt: null,
            metadata: {},
          });
          sessionId = session.id;
          ctx.activeSessionId = sessionId;
        }

        const obs = await ctx.engine.createObservation({
          sessionId,
          title: `Session Summary — ${new Date().toISOString().split('T')[0]}`,
          content,
          type: 'summary',
          topicKey: null,
          projectId: currentProjectId,
          metadata: {
            isSessionSummary: true,
            sessionId,
            endedAt: new Date().toISOString(),
          },
        });

        return {
          content: [
            {
              type: 'text',
              text: `Session summary saved for project "${currentProjectId}" (observation #${obs.id})`,
            },
          ],
        };
      } catch (error: unknown) {
        return handleToolError(error, ctx);
      }
    }
  );

  server.tool(
    'mem_capture_passive',
    'Parse text to extract learnings from sections like "## Key Learnings:" or "## Aprendizajes Clave:". Creates individual observations with type "learning". Deduplicates by content similarity (within batch AND against existing DB learnings). Returns: human-readable summary with capture and duplicate counts.',
    {
      content: z.string().describe('Text content to parse for learnings'),
      project_id: z.string().optional().describe('Project identifier'),
      session_id: z.number().optional().describe('Session ID (uses active session if not provided)'),
      source: z.string().optional().describe('Source description (e.g. "code review", "session notes")'),
    },
    { title: 'Capture passive learnings', readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    async ({ content, project_id, session_id, source }) => {
      try {
        const currentProjectId = project_id || ctx.projectId;
        let sessionId = session_id || ctx.activeSessionId;

        if (!sessionId) {
          const session = await ctx.engine.createSession({
            projectId: currentProjectId,
            endedAt: null,
            metadata: {},
          });
          sessionId = session.id;
          ctx.activeSessionId = sessionId;
        }

        // Extract learning sections
        const sectionPattern = /(?:^|\n)##\s+(?:Key Learnings|Aprendizajes Clave|Learnings|Lecciones Aprendidas)[:\s]*\n([\s\S]*?)(?=\n##\s|$)/g;
        const matches = [...content.matchAll(sectionPattern)];

        if (matches.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No learning sections found',
              },
            ],
          };
        }

        // Extract individual items (bullet points or numbered lists)
        const items: string[] = [];
        for (const match of matches) {
          const section = match[1].trim();
          const lines = section.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0);
          for (const line of lines) {
            // Remove leading bullet/number markers
            const cleaned = line.replace(/^[-*•]\s+|^\d+[.)]\s+/, '').trim();
            if (cleaned.length > 5) {
              items.push(cleaned);
            }
          }
        }

        // Jaccard similarity helper
        const jaccardSimilar = (a: string, b: string): boolean => {
          const setA = new Set(a.toLowerCase().split(/\s+/));
          const setB = new Set(b.toLowerCase().split(/\s+/));
          const intersection = [...setA].filter((x) => setB.has(x)).length;
          const union = new Set([...setA, ...setB]).size;
          return union > 0 && intersection / union > 0.85;
        };

        // Step 1: Deduplicate within batch
        const uniqueItems: string[] = [];
        for (const item of items) {
          if (!uniqueItems.some((existing) => jaccardSimilar(existing, item))) {
            uniqueItems.push(item);
          }
        }

        // Step 2: Deduplicate against existing learnings in DB
        // Search ALL learnings in project (not filtered by topicKey) so dedup works across sources
        const topicKey = source ? `learnings/${source.toLowerCase().replace(/\s+/g, '-')}` : null;
        const existingResult = await ctx.engine.search({
          type: 'learning',
          projectId: currentProjectId,
          limit: 100,
        });
        const existingContents = existingResult.observations.map((obs) => obs.content);

        const newItems: string[] = [];
        let duplicatesCount = 0;
        for (const item of uniqueItems) {
          if (existingContents.some((existing) => jaccardSimilar(existing, item))) {
            duplicatesCount++;
          } else {
            newItems.push(item);
          }
        }

        // Step 3: Create observations only for new items
        const observations: { id: number; title: string }[] = [];
        for (const item of newItems) {
          const title = item.length > 80 ? item.slice(0, 77) + '...' : item;
          const obs = await ctx.engine.createObservation({
            sessionId,
            title,
            content: item,
            type: 'learning',
            topicKey,
            projectId: currentProjectId,
            metadata: {
              source: source || 'passive-capture',
              capturedAt: new Date().toISOString(),
            },
          });
          observations.push({ id: obs.id, title: obs.title });
        }

        return {
          content: [
            {
              type: 'text',
              text: `Captured ${observations.length} learning${observations.length !== 1 ? 's' : ''}, ${duplicatesCount} duplicate${duplicatesCount !== 1 ? 's' : ''} (project: ${currentProjectId})`,
            },
          ],
        };
      } catch (error: unknown) {
        return handleToolError(error, ctx);
      }
    }
  );

  // ─── Status (compound diagnostic tool) ──────────────────────

  server.tool(
    'mem_status',
    'Get system diagnostics: health, stats, config, or sessions. Use `section` to request specific info, or "all" for a combined overview. Pass `session_id` to get details for a specific session. Returns: human-readable Markdown with requested diagnostic info.',
    {
      section: z.enum(['all', 'health', 'stats', 'config', 'sessions']).optional().describe('Which section to return (default: "all")'),
      session_id: z.number().optional().describe('Get specific session details (replaces mem_get_session)'),
      project_id: z.string().optional().describe('Filter sessions by project (for "sessions" section)'),
      limit: z.number().optional().describe('Max sessions to return (default: 20, for "sessions" section)'),
    },
    { title: 'System status and diagnostics', readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    async ({ section, session_id, project_id, limit }) => {
      try {
        const sec = section || 'all';
        const sections: string[] = [];

        // Specific session by ID
        if (session_id) {
          const s = await ctx.engine.getSession(session_id);
          if (!s) throw new Error(`Session ${session_id} not found`);
          return {
            content: [{ type: 'text', text: formatSession(s) }],
          };
        }

        // Health section
        if (sec === 'all' || sec === 'health') {
          const isHealthy = ctx.engine.isHealthy();
          const result = isHealthy ? await ctx.engine.search({}) : { total: 0, observations: [] };
          const initError = ctx.engine.getInitError();

          sections.push(formatHealth({
            status: isHealthy ? 'healthy' : 'unhealthy',
            version: '1.0.0',
            storage: 'sqlite-persistent',
            databasePath: ctx.dbPath,
            projectId: ctx.projectId,
            databaseHealth: isHealthy ? 'ok' : 'failed',
            ...(initError && { initError: initError.message }),
            observations: result.total,
            activeSession: ctx.activeSessionId,
          }));
        }

        // Stats section
        if (sec === 'all' || sec === 'stats') {
          const stats = await ctx.engine.getDashboardStats();
          sections.push(formatStats(stats, ctx.activeSessionId));
        }

        // Config section
        if (sec === 'all' || sec === 'config') {
          const searchResult = await ctx.engine.search({});
          const currentDbPath = ctx.engine.getDatabasePath();
          const byType: Record<string, number> = {};
          for (const o of searchResult.observations) {
            byType[o.type] = (byType[o.type] || 0) + 1;
          }
          const dbStats = getDatabaseStats(currentDbPath);

          sections.push(formatConfig({
            name: 'memento',
            version: '1.0.0',
            config: {
              storagePath: currentDbPath,
              projectId: ctx.projectId,
              projectRoot: process.cwd(),
              hasConfigFile: existsSync(join(process.cwd(), '.mementorc')),
            },
            storage: {
              type: 'SQLite Persistent',
              method: 'bun:sqlite',
              databasePath: currentDbPath,
              walEnabled: true,
            },
            diskUsage: dbStats,
            statistics: {
              totalObservations: searchResult.total,
              byType,
              activeSession: ctx.activeSessionId,
            },
            environment: {
              nodeVersion: process.version,
              platform: process.platform,
              arch: process.arch,
              bunVersion: (process as { versions?: { bun?: string } }).versions?.bun || 'unknown',
            },
            tools: [
              'mem_save', 'mem_search', 'mem_get_observation',               'mem_update', 'mem_replace',
              'mem_delete', 'mem_merge', 'mem_export',
              'mem_pin', 'mem_unpin',
              'mem_lock', 'mem_unlock',
              'mem_session_start', 'mem_session_end', 'mem_session_summary',
              'mem_context', 'mem_capture_passive', 'mem_status',
              'mem_journal_write', 'mem_journal_read', 'mem_journal_search',
            ],
          }));
        }

        // Sessions section
        if (sec === 'all' || sec === 'sessions') {
          const result = await ctx.engine.listSessions({
            projectId: project_id,
            limit: limit || 20,
          });
          sections.push(formatSessionList({ sessions: result.sessions, total: result.total }));
        }

        return {
          content: [{ type: 'text', text: sections.join('\n\n---\n\n') }],
        };
      } catch (error: unknown) {
        return handleToolError(error, ctx);
      }
    }
  );

  // ─── Journal Tools (append-only evidence) ────────────────────

  server.tool(
    'mem_journal_write',
    'Create a new append-only journal entry with automatic metadata capture (model, provider, agent, session). Entries are immutable — they cannot be edited or deleted. Use `supersedes` to correct a previous entry without breaking the audit trail. Returns: human-readable confirmation with entry ID.',
    {
      title: z.string().describe('Short, descriptive title for the entry'),
      body: z.string().describe('Full body content of the journal entry'),
      tags: z.array(z.string()).optional().describe('Tags for classification (e.g. ["debugging", "perf"])'),
      project_id: z.string().optional().describe('Project identifier'),
      supersedes: z.number().optional().describe('ID of a previous entry this correction supersedes'),
      metadata: z.record(z.unknown()).optional().describe('Additional metadata (source, origin, confidence, etc.)'),
    },
    { title: 'Write journal entry', readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    async ({ title, body, tags, project_id, supersedes, metadata }) => {
      try {
        const currentProjectId = project_id || ctx.projectId;
        let sessionId = ctx.activeSessionId;

        if (!sessionId) {
          const session = await ctx.engine.createSession({
            projectId: currentProjectId,
            endedAt: null,
            metadata: { source: 'journal' },
          });
          sessionId = session.id;
          ctx.activeSessionId = sessionId;
        }

        const entry = await ctx.engine.writeJournal({
          projectId: currentProjectId,
          sessionId,
          title,
          body,
          tags,
          supersedes: supersedes ?? null,
          metadata: metadata || {},
        });

        const lines: string[] = [];
        lines.push(`Journal entry #${entry.id} "${entry.title}" written`);
        lines.push(`Project: ${entry.projectId} | Tags: ${entry.tags.length > 0 ? entry.tags.join(', ') : 'none'}`);
        if (supersedes) {
          lines.push(`Supersedes entry #${supersedes} (previous entry marked as invalidated)`);
        }

        return {
          content: [{ type: 'text', text: lines.join('\n') }],
        };
      } catch (error: unknown) {
        return handleToolError(error, ctx);
      }
    }
  );

  server.tool(
    'mem_journal_read',
    'Read a journal entry by ID. Returns: human-readable Markdown with full entry details including metadata, tags, body, and invalidation info if superseded.',
    {
      id: z.number().describe('Journal entry ID'),
    },
    { title: 'Read journal entry', readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    async ({ id }) => {
      try {
        const entry = await ctx.engine.readJournal(id);

        if (!entry) {
          return {
            content: [{ type: 'text', text: `Journal entry #${id} not found.` }],
          };
        }

        return {
          content: [{ type: 'text', text: formatJournalEntry(entry) }],
        };
      } catch (error: unknown) {
        return handleToolError(error, ctx);
      }
    }
  );

  server.tool(
    'mem_journal_search',
    'Search journal entries using full-text search (FTS5), tags, project, and date range filters. Use `active_only` to exclude superseded/invalidated entries. Returns: human-readable Markdown with entry list.',
    {
      query: z.string().optional().describe('Full-text search query (FTS5 syntax)'),
      tags: z.array(z.string()).optional().describe('Filter by tags (AND logic — all tags must match)'),
      project_id: z.string().optional().describe('Filter by project identifier'),
      active_only: z.boolean().optional().describe('Exclude invalidated/superseded entries (default: false)'),
      date_from: z.string().optional().describe('ISO date string — entries from this date'),
      date_to: z.string().optional().describe('ISO date string — entries until this date'),
      limit: z.number().optional().describe('Max results (default: 20)'),
      offset: z.number().optional().describe('Offset for pagination'),
    },
    { title: 'Search journal entries', readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    async ({ query, tags, project_id, active_only, date_from, date_to, limit, offset }) => {
      try {
        const result = await ctx.engine.searchJournal({
          query,
          tags,
          projectId: project_id,
          activeOnly: active_only,
          dateFrom: date_from ? new Date(date_from) : undefined,
          dateTo: date_to ? new Date(date_to) : undefined,
          limit: limit || 20,
          offset,
        });

        return {
          content: [{ type: 'text', text: formatJournalList(result) }],
        };
      } catch (error: unknown) {
        return handleToolError(error, ctx);
      }
    }
  );

}

// ─── Disk Helpers ───────────────────────────────────────────

function getDatabaseStats(dbPath: string) {
  let totalSize = 0;
  let walSize = 0;
  let shmSize = 0;

  try {
    totalSize += fs.statSync(dbPath).size;
  } catch {
    /* empty */
  }
  try {
    walSize = fs.statSync(`${dbPath}-wal`).size;
    totalSize += walSize;
  } catch {
    /* empty */
  }
  try {
    shmSize = fs.statSync(`${dbPath}-shm`).size;
    totalSize += shmSize;
  } catch {
    /* empty */
  }

  return {
    totalBytes: totalSize,
    totalSizeHuman: formatBytes(totalSize),
    mainDbBytes: totalSize - walSize - shmSize,
    mainDbSizeHuman: formatBytes(totalSize - walSize - shmSize),
    walBytes: walSize,
    walSizeHuman: formatBytes(walSize),
  };
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const m = k * 1024;
  const g = m * 1024;
  if (bytes < k) return `${bytes} B`;
  if (bytes < m) return `${(bytes / k).toFixed(2)} KB`;
  if (bytes < g) return `${(bytes / m).toFixed(2)} MB`;
  return `${(bytes / g).toFixed(2)} GB`;
}
