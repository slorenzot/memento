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
    },
    { title: 'Save observation', readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    async ({ title, content, type, topic_key, project_id, metadata, scope }) => {
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
        });

        return {
          content: [
            {
              type: 'text',
              text: `Observation #${obs.id} "${obs.title}" saved (${obs.type}, ${currentProjectId})`,
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
    'Search observations using full-text search (FTS5). Start with small limits and expand only if needed. Results are TRUNCATED — use mem_get_observation with the returned ID for full content. Returns: human-readable Markdown with observation list.',
    {
      query: z.string().optional().describe('Search query (FTS5 syntax)'),
      type: z.enum(['decision', 'bug', 'discovery', 'note', 'summary', 'learning', 'pattern', 'architecture', 'config', 'preference']).optional().describe('Filter by observation type'),
      project_id: z.string().optional().describe('Filter by project identifier'),
      topic_key: z.string().optional().describe('Filter by topic key (exact match)'),
      limit: z.number().optional().describe('Max results (default: 10)'),
      offset: z.number().optional().describe('Offset for pagination'),
      include_deleted: z.boolean().optional().describe('Include soft-deleted observations'),
      scope: z.enum(['project', 'personal']).optional().describe('Filter by scope'),
    },
    { title: 'Search observations', readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    async ({ query, type, project_id, topic_key, limit, offset, include_deleted, scope }) => {
      try {
        const result = await ctx.engine.search({
          query,
          type: type as Observation['type'] | undefined,
          projectId: project_id,
          topicKey: topic_key,
          limit: limit || 10,
          offset,
          includeDeleted: include_deleted,
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
    'Update an existing observation\'s title, content, type, or topic_key. Use this to correct or refine previously saved observations. All fields are optional — only provided fields will be updated. Returns: human-readable confirmation.',
    {
      id: z.number().describe('Observation ID to update'),
      title: z.string().optional().describe('New title (short, searchable)'),
      content: z.string().optional().describe('New content (What/Why/Where/Learned format)'),
      type: z.enum(['decision', 'bug', 'discovery', 'note', 'summary', 'learning', 'pattern', 'architecture', 'config', 'preference']).optional().describe('New observation type'),
      topic_key: z.string().optional().describe('New or updated topic key for grouping'),
    },
    { title: 'Update observation', readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    async ({ id, title, content, type, topic_key }) => {
      try {
        const updated = await ctx.engine.updateObservation(id, {
          title,
          content,
          type: type as Observation['type'] | undefined,
          topicKey: topic_key,
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

  // ─── Soft Delete / Restore / Purge ──────────────────────────

  server.tool(
    'mem_delete',
    'Soft-delete an observation. The record is hidden from searches but can be restored with mem_restore. For permanent deletion, use mem_purge after soft-deleting. Soft-delete is the safe default — always prefer this over purge. Returns: human-readable confirmation.',
    {
      id: z.number().describe('Observation ID to soft-delete'),
      reason: z.string().optional().describe('Reason for deletion (stored in metadata)'),
    },
    { title: 'Soft-delete observation', readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    async ({ id, reason }) => {
      try {
        await ctx.engine.deleteObservation(id, reason);
        return {
          content: [
            { type: 'text', text: `Observation #${id} soft-deleted` },
          ],
        };
      } catch (error: unknown) {
        return handleToolError(error, ctx);
      }
    }
  );

  server.tool(
    'mem_restore',
    'Restore a soft-deleted observation back to active state. Use mem_list_deleted to find deleted observation IDs, then restore them with this tool. Returns: human-readable confirmation.',
    {
      id: z.number().describe('Observation ID to restore (from mem_list_deleted)'),
    },
    { title: 'Restore deleted observation', readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    async ({ id }) => {
      try {
        const restored = await ctx.engine.restoreObservation(id);
        return {
          content: [
            {
              type: 'text',
              text: `Observation #${restored.id} restored`,
            },
          ],
        };
      } catch (error: unknown) {
        return handleToolError(error, ctx);
      }
    }
  );

  server.tool(
    'mem_purge',
    'PERMANENTLY delete soft-deleted observations. This is IRREVERSIBLE — soft-deleted observations are gone forever. Requires confirm: true. Use mem_list_deleted first to review what will be purged. Prefer soft-delete (mem_delete) + review before purging. Returns: human-readable confirmation with purge count.',
    {
      confirm: z.boolean().describe('Must be true to execute purge'),
      project_id: z.string().optional().describe('Purge all deleted obs in this project'),
      observation_ids: z
        .array(z.number())
        .optional()
        .describe('Specific soft-deleted observation IDs to purge'),
    },
    { title: 'Purge deleted observations', readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    async ({ confirm, project_id, observation_ids }) => {
      try {
        if (!confirm) {
          return {
            content: [
              {
                type: 'text',
                text: 'Error: confirm must be true to execute purge',
              },
            ],
          };
        }

        const result = await ctx.engine.purgeObservations({
          projectId: project_id,
          observationIds: observation_ids,
        });

        return {
          content: [{ type: 'text', text: `Purged ${result.purgedCount} deleted observation${result.purgedCount !== 1 ? 's' : ''}` }],
        };
      } catch (error: unknown) {
        return handleToolError(error, ctx);
      }
    }
  );

  server.tool(
    'mem_list_deleted',
    'List soft-deleted observations that can be restored with mem_restore or permanently removed with mem_purge. Use this to review what has been deleted before deciding to restore or purge. Returns: human-readable Markdown with deleted observation list.',
    {
      project_id: z.string().optional().describe('Filter by project identifier'),
      limit: z.number().optional().describe('Max results (default: 20)'),
    },
    { title: 'List deleted observations', readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    async ({ project_id, limit }) => {
      try {
        const result = await ctx.engine.listDeleted({ projectId: project_id, limit });
        return {
          content: [{ type: 'text', text: formatObservationList(result) }],
        };
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

  server.tool(
    'mem_list_sessions',
    'List all sessions, optionally filtered by project. Use this to find session IDs for mem_get_session, or to review session history. Returns: human-readable Markdown with session list.',
    {
      project_id: z.string().optional().describe('Filter by project identifier'),
      limit: z.number().optional().describe('Max sessions to return (default: 20)'),
    },
    { title: 'List sessions', readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    async ({ project_id, limit }) => {
      try {
        const result = await ctx.engine.listSessions({
          projectId: project_id,
          limit: limit || 20,
        });

        return {
          content: [
            {
              type: 'text',
              text: formatSessionList({ sessions: result.sessions, total: result.total }),
            },
          ],
        };
      } catch (error: unknown) {
        return handleToolError(error, ctx);
      }
    }
  );

  server.tool(
    'mem_get_session',
    'Get full details of a specific session by ID, including metadata and timestamps. Use mem_list_sessions first to find session IDs. Returns: human-readable Markdown with session details.',
    {
      id: z.number().describe('Session ID (from mem_list_sessions)'),
    },
    { title: 'Get session details', readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    async ({ id }) => {
      try {
        const s = await ctx.engine.getSession(id);
        if (!s) throw new Error(`Session ${id} not found`);
        return {
          content: [{ type: 'text', text: formatSession(s) }],
        };
      } catch (error: unknown) {
        return handleToolError(error, ctx);
      }
    }
  );

  // ─── Agent Convenience Tools ────────────────────────────────

  server.tool(
    'mem_save_prompt',
    'Save a user prompt to persistent memory for conversation tracking. Auto-creates a session if none is active. Returns: human-readable confirmation.',
    {
      content: z.string().describe('The prompt text to save'),
      project_id: z.string().optional().describe('Project identifier'),
      session_id: z.number().optional().describe('Session ID (uses active session if not provided)'),
    },
    { title: 'Save prompt', readOnlyHint: false, destructiveHint: false, idempotentHint: false },
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

        const prompt = await ctx.engine.savePrompt({
          sessionId,
          content,
          projectId: currentProjectId,
          metadata: {},
        });

        return {
          content: [
            {
              type: 'text',
              text: `Prompt saved for project "${currentProjectId}"`,
            },
          ],
        };
      } catch (error: unknown) {
        return handleToolError(error, ctx);
      }
    }
  );

  server.tool(
    'mem_context',
    'Get recent observations for context recovery — what was done before compaction or in previous sessions. Unlike mem_search, this does NOT use FTS5, returns observations ordered by created_at DESC with session metadata. Returns: human-readable Markdown with recent observation list.',
    {
      project_id: z.string().optional().describe('Filter by project identifier'),
      limit: z.number().optional().describe('Max results (default: 20)'),
    },
    { title: 'Get recent context', readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    async ({ project_id, limit }) => {
      try {
        const result = await ctx.engine.getRecentContext({
          projectId: project_id,
          limit: limit || 20,
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
    'mem_suggest_topic_key',
    'Suggest a stable topic_key from a title, content, or type. Pure computation — does NOT touch the database. Normalizes text to lowercase-kebab-case with a type prefix. Returns: human-readable suggestion.',
    {
      title: z.string().optional().describe('Observation title to derive key from'),
      content: z.string().optional().describe('Observation content to derive key from'),
      type: z.enum(['decision', 'bug', 'discovery', 'note', 'summary', 'learning', 'pattern', 'architecture', 'config', 'preference']).optional().describe('Observation type for prefix'),
    },
    { title: 'Suggest topic key', readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    async ({ title, content, type }) => {
      try {
        const source = title || content || '';
        if (!source) {
          return {
            content: [
              {
                type: 'text',
                text: 'Error: provide at least a title or content',
              },
            ],
          };
        }

        // Normalize: lowercase, replace non-alphanumeric with hyphens, collapse multiple hyphens
        const base = source
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 60);

        const prefix = type ? `${type}/` : '';
        const suggested_key = `${prefix}${base}`;

        return {
          content: [
            {
              type: 'text',
              text: `Suggested topic key: ${suggested_key}`,
            },
          ],
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
        const topicKey = source ? `learnings/${source.toLowerCase().replace(/\s+/g, '-')}` : null;
        const existingResult = await ctx.engine.search({
          type: 'learning',
          projectId: currentProjectId,
          ...(topicKey ? { topicKey } : {}),
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

  // ─── Utility Tools ──────────────────────────────────────────

  server.tool(
    'mem_timeline',
    'Get chronological timeline of observations across all projects or filtered by project. Unlike mem_search which uses FTS5 relevance ranking, this returns observations in strict chronological order. Returns: human-readable Markdown with chronological observation list.',
    {
      project_id: z.string().optional().describe('Filter by project identifier'),
      limit: z.number().optional().describe('Max results to return'),
      offset: z.number().optional().describe('Offset for pagination'),
    },
    { title: 'Observation timeline', readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    async ({ project_id, limit, offset }) => {
      try {
        const result = await ctx.engine.getTimeline({
          projectId: project_id,
          limit,
          offset,
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
    'mem_stats',
    'Get memory statistics: total observations, count by type (decision/bug/discovery/note), count by project, and active session ID. Useful for understanding memory usage at a glance. Returns: human-readable Markdown with statistics summary.',
    {},
    { title: 'Memory statistics', readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    async () => {
      try {
        const stats = await ctx.engine.getDashboardStats();

        return {
          content: [
            {
              type: 'text',
              text: formatStats(stats, ctx.activeSessionId),
            },
          ],
        };
      } catch (error: unknown) {
        return handleToolError(error, ctx);
      }
    }
  );

  server.tool(
    'mem_health',
    'Check system health: database status, version, storage type, database path, project ID, and observation count. Use this to diagnose connectivity or initialization issues. Returns: human-readable Markdown with health status.',
    {},
    { title: 'Health check', readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    async () => {
      try {
        const isHealthy = ctx.engine.isHealthy();
        const result = isHealthy ? await ctx.engine.search({}) : { total: 0, observations: [] };
        const initError = ctx.engine.getInitError();

        return {
          content: [
            {
              type: 'text',
              text: formatHealth({
                status: isHealthy ? 'healthy' : 'unhealthy',
                version: '1.0.0',
                storage: 'sqlite-persistent',
                databasePath: ctx.dbPath,
                projectId: ctx.projectId,
                databaseHealth: isHealthy ? 'ok' : 'failed',
                ...(initError && { initError: initError.message }),
                observations: result.total,
                activeSession: ctx.activeSessionId,
              }),
            },
          ],
        };
      } catch (error: unknown) {
        return handleToolError(error, ctx);
      }
    }
  );

  server.tool(
    'mem_config',
    'Get current Memento configuration and system status: storage path, project ID, SQLite details, disk usage (with WAL/SHM sizes), observation statistics by type, environment info (Node/Bun versions), and list of all available tools. Returns: human-readable Markdown with full configuration.',
    {},
    { title: 'System configuration', readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    async () => {
      try {
        const searchResult = await ctx.engine.search({});
        const currentDbPath = ctx.engine.getDatabasePath();

        const byType: Record<string, number> = {};
        for (const o of searchResult.observations) {
          byType[o.type] = (byType[o.type] || 0) + 1;
        }

        const dbStats = getDatabaseStats(currentDbPath);

        return {
          content: [
            {
              type: 'text',
              text: formatConfig({
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
                  'mem_save',
                  'mem_search',
                  'mem_get_observation',
                  'mem_update',
                  'mem_delete',
                  'mem_restore',
                  'mem_purge',
                  'mem_list_deleted',
                  'mem_merge',
                  'mem_export',
                  'mem_session_start',
                  'mem_session_end',
                  'mem_list_sessions',
                  'mem_get_session',
                  'mem_save_prompt',
                  'mem_context',
                  'mem_suggest_topic_key',
                  'mem_session_summary',
                  'mem_capture_passive',
                  'mem_timeline',
                  'mem_stats',
                  'mem_health',
                  'mem_config',
                ],
              }),
            },
          ],
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
