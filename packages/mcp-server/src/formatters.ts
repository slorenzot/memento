/**
 * formatters.ts — Markdown formatters for MCP tool responses.
 *
 * Converts structured data into human-readable Markdown strings.
 * Used by READ and DIAGNOSTIC tools instead of JSON.stringify.
 *
 * Design principles:
 * - Drop unused fields: uuid, sessionId, deletedAt:null, metadata:{}, revisionCount
 * - Keep essential fields: id (#N), title, content, type ([type]), projectId, topicKey, createdAt
 * - Compact format for lists, detailed format for single items
 */

import type { Observation, Session, DashboardStats } from '@slorenzot/memento-core';
import type { JournalEntry } from '@slorenzot/memento-core';

// ─── Size limits by type (Issue #51) ────────────────────────

const DEFAULT_LIMITS: Record<string, number> = {
  decision: 3000,
  bug: 2000,
  discovery: 2000,
  note: 5000,
  summary: 5000,
  learning: 2000,
  pattern: 3000,
  architecture: 5000,
  config: 2000,
  preference: 1000,
};

function formatSize(content: string, type: string): string {
  const current = content.length;
  const limit = DEFAULT_LIMITS[type] || 5000;
  const pct = Math.round((current / limit) * 100);

  if (pct > 80) {
    return `Size: ${current}/${limit} chars ⚠️ NEAR LIMIT (${pct}%)`;
  }
  return `Size: ${current}/${limit} chars`;
}

// ─── Helpers ────────────────────────────────────────────────

function compactDate(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0]; // YYYY-MM-DD
}

// ─── Observation Formatters ─────────────────────────────────

/**
 * Format a single observation with full detail.
 * Used by: mem_get_observation
 */
export function formatObservation(obs: Observation): string {
  const lines: string[] = [];

  // Header line: #N [type] Title
  lines.push(`#${obs.id} [${obs.type}] ${obs.title}`);

  // Metadata line
  const meta: string[] = [];
  meta.push(`Project: ${obs.projectId}`);
  if (obs.topicKey) meta.push(`Topic: ${obs.topicKey}`);
  meta.push(`Scope: ${obs.scope}`);
  if (obs.pinned) meta.push(`📌 Pinned`);
  if (obs.readOnly) meta.push(`🔒 Read-only`);
  meta.push(formatSize(obs.content, obs.type));
  meta.push(`Created: ${compactDate(obs.createdAt)}`);
  meta.push(`Revision: ${obs.revisionCount}`);
  lines.push(meta.join(' | '));

  lines.push('');

  // Content (already structured with **What**, **Why**, etc.)
  lines.push(obs.content);

  return lines.join('\n');
}

/**
 * Format a truncated observation for list views.
 * Used by: mem_search, mem_context, mem_timeline, mem_list_deleted
 */
export function formatObservationShort(obs: Observation): string {
  const lines: string[] = [];

  // Header: #N [type] Title
  lines.push(`#${obs.id} [${obs.type}] ${obs.title}`);

  // Metadata line (compact)
  const meta: string[] = [];
  meta.push(`Project: ${obs.projectId}`);
  if (obs.topicKey) meta.push(`Topic: ${obs.topicKey}`);
  meta.push(compactDate(obs.createdAt));
  lines.push(meta.join(' | '));

  // First line of content (truncated preview)
  const firstLine = obs.content.split('\n')[0];
  if (firstLine) {
    const preview = firstLine.length > 120 ? firstLine.slice(0, 117) + '...' : firstLine;
    lines.push(preview);
  }

  return lines.join('\n');
}

/**
 * Format a list of observations.
 * Used by: mem_search, mem_context, mem_timeline, mem_list_deleted
 */
export function formatObservationList(result: { total: number; observations: Observation[]; estimatedTokensSaved?: number }): string {
  const lines: string[] = [];

  lines.push(`Found ${result.total} observation${result.total !== 1 ? 's' : ''}`);

  if (result.observations.length > 0) {
    lines.push('');
    for (const obs of result.observations) {
      lines.push(formatObservationShort(obs));
      lines.push('---');
    }
    // Remove trailing ---
    lines.pop();

    // Token savings line
    if (result.estimatedTokensSaved && result.estimatedTokensSaved > 0) {
      const count = result.observations.length;
      const avg = Math.round(result.estimatedTokensSaved / count);
      const explorationMinutes = Math.max(1, Math.round(result.estimatedTokensSaved / 100));

      lines.push('');
      lines.push(`📊 Token savings: ~${result.estimatedTokensSaved.toLocaleString()} tokens (${count} observation${count !== 1 ? 's' : ''}, avg ~${avg.toLocaleString()} tokens each)`);

      if (explorationMinutes >= 60) {
        const hours = Math.floor(explorationMinutes / 60);
        const mins = explorationMinutes % 60;
        lines.push(`   Without Memento: ~${hours}-${hours + 1}h${mins > 0 ? ` ${mins}m` : ''} of codebase exploration`);
      } else {
        const upper = Math.min(explorationMinutes * 2, explorationMinutes + 10);
        lines.push(`   Without Memento: ~${explorationMinutes}-${upper} min of codebase exploration`);
      }
    }
  }

  return lines.join('\n');
}

// ─── Session Formatters ─────────────────────────────────────

/**
 * Format a single session with full detail.
 * Used by: mem_get_session
 */
export function formatSession(session: Session): string {
  const lines: string[] = [];

  lines.push(`Session #${session.id}`);
  lines.push(`Project: ${session.projectId} | Started: ${compactDate(session.startedAt)} | ${session.endedAt ? 'Ended: ' + compactDate(session.endedAt) : 'Active'}`);

  const metaKeys = Object.keys(session.metadata || {});
  if (metaKeys.length > 0) {
    lines.push(`Metadata: ${JSON.stringify(session.metadata)}`);
  }

  return lines.join('\n');
}

/**
 * Format a list of sessions.
 * Used by: mem_list_sessions
 */
export function formatSessionList(result: { total: number; sessions: Session[] }): string {
  const lines: string[] = [];

  lines.push(`Sessions (${result.total} total)`);

  if (result.sessions.length > 0) {
    lines.push('');
    for (const s of result.sessions) {
      const status = s.endedAt ? `Ended: ${compactDate(s.endedAt)}` : 'Active';
      lines.push(`#${s.id} | ${s.projectId} | Started: ${compactDate(s.startedAt)} | ${status}`);
    }
  }

  return lines.join('\n');
}

// ─── Stats Formatter ────────────────────────────────────────

/**
 * Format memory statistics.
 * Used by: mem_stats
 */
export function formatStats(stats: DashboardStats, activeSessionId: number | null): string {
  const lines: string[] = [];

  const sessionInfo = activeSessionId ? `session #${activeSessionId} active` : 'no active session';
  lines.push(`Memory: ${stats.totalObservations} observations, ${stats.deletedObservations} deleted, ${sessionInfo}`);

  // Types breakdown
  const typeEntries = Object.entries(stats.byType)
    .filter(([, count]) => count > 0)
    .sort(([keyA, a], [keyB, b]) => b - a || keyA.localeCompare(keyB));
  if (typeEntries.length > 0) {
    const typeStr = typeEntries.map(([type, count]) => `${type}(${String(count)})`).join(' ');
    lines.push(`Types: ${typeStr}`);
  }

  // Projects breakdown
  const projectEntries = Object.entries(stats.byProject)
    .sort(([keyA, a], [keyB, b]) => b - a || keyA.localeCompare(keyB));
  if (projectEntries.length > 0) {
    const projStr = projectEntries.map(([proj, count]) => `${proj}(${String(count)})`).join(' ');
    lines.push(`Projects: ${projStr}`);
  }

  return lines.join('\n');
}

// ─── Health Formatter ───────────────────────────────────────

/**
 * Format health check result.
 * Used by: mem_health
 */
export function formatHealth(data: {
  status: string;
  version: string;
  storage: string;
  databasePath: string;
  projectId: string;
  databaseHealth: string;
  initError?: string;
  observations: number;
  activeSession: number | null;
}): string {
  const lines: string[] = [];

  lines.push(`Status: ${data.status} | Version: ${data.version} | Storage: ${data.storage}`);
  lines.push(`Database: ${data.databaseHealth} | Path: ${data.databasePath} | Observations: ${data.observations}`);

  if (data.activeSession) {
    lines.push(`Active session: #${data.activeSession}`);
  } else {
    lines.push('No active session');
  }

  if (data.initError) {
    lines.push(`Error: ${data.initError}`);
  }

  return lines.join('\n');
}

// ─── Config Formatter ───────────────────────────────────────

/**
 * Format full system configuration.
 * Used by: mem_config
 */
export function formatConfig(data: {
  name: string;
  version: string;
  config: {
    storagePath: string;
    projectId: string;
    projectRoot: string;
    hasGlobalDb: boolean;
  };
  storage: {
    type: string;
    method: string;
    databasePath: string;
    walEnabled: boolean;
  };
  diskUsage: {
    totalBytes: number;
    totalSizeHuman: string;
    mainDbBytes: number;
    mainDbSizeHuman: string;
    walBytes: number;
    walSizeHuman: string;
  };
  statistics: {
    totalObservations: number;
    byType: Record<string, number>;
    activeSession: number | null;
  };
  environment: {
    nodeVersion: string;
    platform: string;
    arch: string;
    bunVersion: string;
  };
  tools: string[];
}): string {
  const lines: string[] = [];

  // Header
  lines.push(`${data.name} v${data.version} — Configuration`);

  // Storage
  lines.push(`Storage: ${data.storage.type} (${data.storage.method}) | WAL: ${data.storage.walEnabled ? 'enabled' : 'disabled'}`);
  lines.push(`Database: ${data.storage.databasePath}`);
  lines.push(`Disk: ${data.diskUsage.totalSizeHuman} (main: ${data.diskUsage.mainDbSizeHuman}, WAL: ${data.diskUsage.walSizeHuman})`);

  // Project
  lines.push(`Project: ${data.config.projectId} | Root: ${data.config.projectRoot}`);

  // Statistics
  const typeEntries = Object.entries(data.statistics.byType)
    .filter(([, count]) => count > 0)
    .sort(([keyA, a], [keyB, b]) => b - a || keyA.localeCompare(keyB));
  const typeStr = typeEntries.map(([type, count]) => `${type}(${count})`).join(' ');

  lines.push('');
  lines.push(`Statistics: ${data.statistics.totalObservations} observations`);
  if (typeStr) lines.push(`Types: ${typeStr}`);

  if (data.statistics.activeSession) {
    lines.push(`Active session: #${data.statistics.activeSession}`);
  } else {
    lines.push('No active session');
  }

  // Environment
  lines.push('');
  lines.push(`Environment: Node ${data.environment.nodeVersion} | Platform: ${data.environment.platform}/${data.environment.arch} | Bun ${data.environment.bunVersion}`);

  // Tools
  lines.push(`Tools: ${data.tools.length} registered`);

  return lines.join('\n');
}

// ─── Journal Formatters ──────────────────────────────────────

/**
 * Format a single journal entry with full detail.
 * Used by: mem_journal_read
 */
export function formatJournalEntry(entry: JournalEntry): string {
  const lines: string[] = [];

  // Header: #N Journal: Title
  lines.push(`#${entry.id} Journal: ${entry.title}`);

  // Metadata line
  const meta: string[] = [];
  meta.push(`Project: ${entry.projectId}`);
  if (entry.model) meta.push(`Model: ${entry.model}`);
  if (entry.provider) meta.push(`Provider: ${entry.provider}`);
  if (entry.agent) meta.push(`Agent: ${entry.agent}`);
  meta.push(`Created: ${compactDate(entry.createdAt)}`);
  lines.push(meta.join(' | '));

  // Tags
  if (entry.tags.length > 0) {
    lines.push(`Tags: ${entry.tags.join(', ')}`);
  }

  // Status
  if (entry.invalidatedAt) {
    lines.push(`⚠ Invalidated: ${compactDate(entry.invalidatedAt)} | Superseded by: #${entry.supersededBy}`);
  }

  lines.push('');

  // Body
  lines.push(entry.body);

  // Metadata (if non-empty)
  const metaKeys = Object.keys(entry.metadata || {});
  if (metaKeys.length > 0) {
    lines.push('');
    lines.push(`Metadata: ${JSON.stringify(entry.metadata)}`);
  }

  return lines.join('\n');
}

/**
 * Format a truncated journal entry for list views.
 * Used by: mem_journal_search
 */
export function formatJournalEntryShort(entry: JournalEntry): string {
  const lines: string[] = [];

  // Header
  const status = entry.invalidatedAt ? '⚠ ' : '';
  lines.push(`${status}#${entry.id} Journal: ${entry.title}`);

  // Compact metadata
  const meta: string[] = [];
  meta.push(`Project: ${entry.projectId}`);
  if (entry.tags.length > 0) meta.push(`Tags: ${entry.tags.join(',')}`);
  if (entry.agent) meta.push(`Agent: ${entry.agent}`);
  meta.push(compactDate(entry.createdAt));
  lines.push(meta.join(' | '));

  // First line of body (truncated preview)
  const firstLine = entry.body.split('\n')[0];
  if (firstLine) {
    const preview = firstLine.length > 120 ? firstLine.slice(0, 117) + '...' : firstLine;
    lines.push(preview);
  }

  return lines.join('\n');
}

/**
 * Format a list of journal entries.
 * Used by: mem_journal_search
 */
export function formatJournalList(result: { total: number; entries: JournalEntry[] }): string {
  const lines: string[] = [];

  lines.push(`Found ${result.total} journal entr${result.total !== 1 ? 'ies' : 'y'}`);

  if (result.entries.length > 0) {
    lines.push('');
    for (const entry of result.entries) {
      lines.push(formatJournalEntryShort(entry));
      lines.push('---');
    }
    // Remove trailing ---
    lines.pop();
  }

  return lines.join('\n');
}
