import * as crypto from 'crypto';
import type {
  Observation,
  Session,
  Prompt,
  SearchParams,
  SearchResult,
  MergeParams,
  MergeResult,
  MergeCandidates,
  MergeCandidateGroup,
  ExportParams,
  ExportResult,
  ExportData,
  ExportedObservation,
  ExportedSession,
  ImportData,
  ImportOptions,
  ImportResult,
  JournalEntry,
  WriteJournalParams,
  JournalSearchParams,
  JournalSearchResult,
} from './types.js';

import { Database } from 'bun:sqlite';
import { mkdirSync } from 'fs';
import { dirname } from 'path';

export class MemoryEngine {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Bun Database type is incompatible with mock pattern
  private db: any;
  private dbPath: string;
  private initError: Error | null = null;

  constructor(dbPath: string = './data/memento.db') {
    this.dbPath = dbPath;

    try {
      const dbDir = dirname(dbPath);
      mkdirSync(dbDir, { recursive: true });
      this.db = new Database(dbPath, { create: true });
      this.initializeDatabase();
    } catch (error: unknown) {
      this.initError = error instanceof Error ? error : new Error(String(error));
      this.db = this.createMockDatabase();
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mock fallback for failed DB init
  private createMockDatabase(): any {
    const throwError = () => {
      throw new Error(`Database not initialized: ${this.initError?.message || 'Unknown error'}`);
    };
    return { prepare: throwError, exec: throwError, close: () => {}, transaction: throwError };
  }

  isHealthy(): boolean {
    return this.initError === null;
  }

  getInitError(): Error | null {
    return this.initError;
  }

  getDatabasePath(): string {
    return this.dbPath;
  }

  private initializeDatabase(): void {
    this.db.exec('PRAGMA journal_mode = WAL');
    this.db.exec('PRAGMA foreign_keys = ON');
    this.db.exec('PRAGMA busy_timeout = 5000');

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid TEXT UNIQUE NOT NULL,
        project_id TEXT NOT NULL,
        started_at INTEGER NOT NULL,
        ended_at INTEGER,
        metadata TEXT
      );

      CREATE TABLE IF NOT EXISTS observations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid TEXT UNIQUE NOT NULL,
        session_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        type TEXT NOT NULL,
        topic_key TEXT,
        project_id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        deleted_at INTEGER DEFAULT NULL,
        metadata TEXT,
        FOREIGN KEY (session_id) REFERENCES sessions(id)
      );

      CREATE TABLE IF NOT EXISTS prompts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid TEXT UNIQUE NOT NULL,
        session_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        project_id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        metadata TEXT,
        FOREIGN KEY (session_id) REFERENCES sessions(id)
      );

      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        created_at INTEGER NOT NULL,
        metadata TEXT
      );
    `);

    // Migrate: add deleted_at column if missing
    try {
      this.db.exec('SELECT deleted_at FROM observations LIMIT 0');
    } catch {
      try {
        this.db.exec('ALTER TABLE observations ADD COLUMN deleted_at INTEGER DEFAULT NULL');
        console.error('✓ Migration: added deleted_at column to observations');
      } catch {
        // Column may already exist in a concurrent scenario
      }
    }

    // Create index for deleted_at if not exists
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_observations_deleted ON observations(deleted_at)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_observations_created ON observations(created_at)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_observations_type ON observations(type)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_observations_project ON observations(project_id)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_observations_topic ON observations(topic_key)');

    // Migrate: add scope column if missing
    try {
      this.db.exec('SELECT scope FROM observations LIMIT 0');
    } catch {
      try {
        this.db.exec("ALTER TABLE observations ADD COLUMN scope TEXT NOT NULL DEFAULT 'project'");
        console.error('✓ Migration: added scope column to observations');
      } catch {
        // Column may already exist in a concurrent scenario
      }
    }
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_observations_scope ON observations(scope)');

    // Migrate: add revision_count column if missing
    try {
      this.db.exec('SELECT revision_count FROM observations LIMIT 0');
    } catch {
      try {
        this.db.exec('ALTER TABLE observations ADD COLUMN revision_count INTEGER NOT NULL DEFAULT 0');
        console.error('✓ Migration: added revision_count column to observations');
      } catch {
        // Column may already exist in a concurrent scenario
      }
    }

    // Migrate: clean up empty string topic_key → NULL (Issue #69)
    try {
      const result = this.db.prepare("UPDATE observations SET topic_key = NULL WHERE topic_key = ''").run();
      if (result.changes > 0) {
        console.error(`✓ Migration: cleaned up ${result.changes} empty topic_key value(s)`);
      }
    } catch {
      // Table may not have topic_key column yet
    }

    // FTS5 — standalone mode (no content= parameter).
    // FTS5 owns its own data copy, supports full CRUD (INSERT, DELETE, UPDATE),
    // and avoids SQLITE_CORRUPT_VTAB that occurred with content='observations' mode
    // under bun:sqlite + WAL + concurrent access. See: GitHub Issue #68.
    this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS observations_fts USING fts5(
        title, content, topic_key, project_id,
        tokenize='porter unicode61'
      );
    `);

    // FTS5 sync is managed at application-level in each CRUD method.
    // Previous trigger-based approach caused SQLITE_CORRUPT_VTAB under
    // concurrent access (DELETE+INSERT on FTS5 virtual table within a trigger).
    // See: GitHub Issue #68

    // ─── Journal tables (append-only evidence) ────────────────
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS journal (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid TEXT UNIQUE NOT NULL,
        project_id TEXT NOT NULL,
        session_id INTEGER REFERENCES sessions(id),
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        model TEXT,
        provider TEXT,
        agent TEXT,
        superseded_by INTEGER REFERENCES journal(id),
        invalidated_at INTEGER,
        metadata TEXT,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS journal_tags (
        journal_id INTEGER NOT NULL REFERENCES journal(id) ON DELETE CASCADE,
        tag TEXT NOT NULL,
        PRIMARY KEY (journal_id, tag)
      );
    `);

    // Journal indexes
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_journal_project ON journal(project_id)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_journal_session ON journal(session_id)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_journal_created ON journal(created_at)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_journal_superseded ON journal(superseded_by)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_journal_tags_tag ON journal_tags(tag)');

    // Journal FTS5
    this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS journal_fts USING fts5(
        title, body, project_id,
        content='journal',
        tokenize='porter unicode61'
      );
    `);

    // Journal FTS trigger — insert only (append-only: no update/delete triggers)
    this.db.exec('DROP TRIGGER IF EXISTS journal_ai');
    this.db.exec(`
      CREATE TRIGGER journal_ai AFTER INSERT ON journal BEGIN
        INSERT INTO journal_fts(rowid, title, body, project_id)
        VALUES (new.id, new.title, new.body, new.project_id);
      END;
    `);
  }

  private serialize(value: unknown): string {
    return JSON.stringify(value);
  }

  private deserialize(value: string | null): Record<string, unknown> {
    if (!value) return {};
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }

  private checkHealth(): void {
    if (!this.isHealthy()) {
      throw this.initError || new Error('Database not initialized');
    }
  }

  /**
   * Retry wrapper with exponential backoff for SQLITE_BUSY errors.
   * Dual defense: PRAGMA busy_timeout (5s) catches most contention,
   * this catches the rest with retries.
   */
  private async withRetry<T>(
    operation: () => T,
    maxRetries: number = 3,
    baseDelay: number = 100
  ): Promise<T> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return operation();
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        const isBusy =
          message.includes('SQLITE_BUSY') || message.includes('database is locked');

        if (!isBusy || attempt === maxRetries) {
          throw error;
        }

        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    throw new Error('Max retries exceeded');
  }

  // ─── Observations CRUD ─────────────────────────────────────

  async createObservation(data: {
    sessionId: number;
    title: string;
    content: string;
    type: Observation['type'];
    topicKey: string | null;
    projectId: string;
    metadata: Record<string, unknown>;
    scope?: 'project' | 'personal';
  }): Promise<Observation> {
    this.checkHealth();
    const uuid = crypto.randomUUID();
    const createdAt = new Date();
    const metadata = this.serialize(data.metadata);
    const scope = data.scope || 'project';

    const id = await this.withRetry(() => {
      const result = this.db
        .prepare(
          `INSERT INTO observations (uuid, session_id, title, content, type, topic_key, project_id, created_at, deleted_at, metadata, scope) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`
        )
        .run(
          uuid,
          data.sessionId,
          data.title,
          data.content,
          data.type,
          data.topicKey ?? null,
          data.projectId,
          createdAt.getTime(),
          metadata,
          scope
        );
      const insertId =
        typeof result.lastInsertRowid === 'bigint'
          ? Number(result.lastInsertRowid)
          : result.lastInsertRowid;

      // Application-level FTS5 sync (was trigger observations_ai)
      this.db.prepare(
        'INSERT INTO observations_fts(rowid, title, content, topic_key, project_id) VALUES (?, ?, ?, ?, ?)'
      ).run(insertId, data.title, data.content, data.topicKey ?? '', data.projectId);

      return insertId;
    });

    const observation = await this.getObservationById(id, true);
    if (!observation) throw new Error('Failed to retrieve created observation');
    return observation;
  }

  async updateObservation(
    id: number,
    updates: {
      title?: string;
      content?: string;
      type?: Observation['type'];
      topicKey?: string | null;
      metadata?: Record<string, unknown>;
    }
  ): Promise<Observation> {
    const current = await this.getObservationById(id);
    if (!current) throw new Error('Observation not found');
    if (current.deletedAt) throw new Error('Cannot update a soft-deleted observation');

    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    if (updates.title !== undefined) {
      fields.push('title = ?');
      values.push(updates.title);
    }
    if (updates.content !== undefined) {
      fields.push('content = ?');
      values.push(updates.content);
    }
    if (updates.type !== undefined) {
      fields.push('type = ?');
      values.push(updates.type);
    }
    if (updates.topicKey !== undefined) {
      fields.push('topic_key = ?');
      values.push(updates.topicKey ?? null);
    }
    if (updates.metadata !== undefined) {
      fields.push('metadata = ?');
      values.push(this.serialize(updates.metadata));
    }

    if (fields.length === 0) return current;

    fields.push('revision_count = revision_count + 1');
    values.push(id);

    // Check if any FTS5-indexed fields changed
    const hasFtsUpdate =
      updates.title !== undefined ||
      updates.content !== undefined ||
      updates.topicKey !== undefined;

    if (hasFtsUpdate) {
      // Atomic transaction: UPDATE + FTS5 rebuild
      // Replaces trigger observations_au that caused SQLITE_CORRUPT_VTAB (#68)
      await this.withRetry(() => {
        this.db.transaction(() => {
          this.db.prepare(`UPDATE observations SET ${fields.join(', ')} WHERE id = ?`).run(...values);
          // Re-read updated row for FTS5 sync
          const row = this.db
            .prepare('SELECT title, content, topic_key, project_id FROM observations WHERE id = ?')
            .get(id) as { title: string; content: string; topic_key: string; project_id: string } | undefined;
          if (row) {
            this.db.prepare('DELETE FROM observations_fts WHERE rowid = ?').run(id);
            this.db.prepare(
              'INSERT INTO observations_fts(rowid, title, content, topic_key, project_id) VALUES (?, ?, ?, ?, ?)'
            ).run(id, row.title, row.content, row.topic_key, row.project_id);
          }
        })();
      });
    } else {
      // No FTS5 fields changed — just UPDATE
      await this.withRetry(() =>
        this.db.prepare(`UPDATE observations SET ${fields.join(', ')} WHERE id = ?`).run(...values)
      );
    }

    const updated = await this.getObservationById(id, true);
    if (!updated) throw new Error('Failed to update observation');
    return updated;
  }

  // ─── Soft Delete / Restore / Purge ─────────────────────────

  async deleteObservation(id: number, reason?: string): Promise<void> {
    this.checkHealth();
    const obs = await this.getObservationById(id, true);
    if (!obs) throw new Error('Observation not found');
    if (obs.deletedAt) throw new Error('Observation already deleted');

    const now = Date.now();

    // If there's a reason, store it in metadata
    if (reason) {
      const meta = { ...obs.metadata, deleteReason: reason };
      await this.withRetry(() => {
        this.db
          .prepare('UPDATE observations SET deleted_at = ?, metadata = ? WHERE id = ?')
          .run(now, this.serialize(meta), id);
        // Application-level FTS5 sync (was trigger observations_soft_delete)
        this.db.prepare('DELETE FROM observations_fts WHERE rowid = ?').run(id);
      });
    } else {
      await this.withRetry(() => {
        this.db.prepare('UPDATE observations SET deleted_at = ? WHERE id = ?').run(now, id);
        // Application-level FTS5 sync (was trigger observations_soft_delete)
        this.db.prepare('DELETE FROM observations_fts WHERE rowid = ?').run(id);
      });
    }
  }

  async restoreObservation(id: number): Promise<Observation> {
    this.checkHealth();
    const obs = await this.getObservationById(id, true);
    if (!obs) throw new Error('Observation not found');
    if (!obs.deletedAt) throw new Error('Observation is not deleted');

    await this.withRetry(() => {
      this.db.prepare('UPDATE observations SET deleted_at = NULL WHERE id = ?').run(id);
      // Application-level FTS5 sync (was trigger observations_undelete)
      const row = this.db
        .prepare('SELECT title, content, topic_key, project_id FROM observations WHERE id = ?')
        .get(id) as { title: string; content: string; topic_key: string; project_id: string } | undefined;
      if (row) {
        this.db.prepare(
          'INSERT INTO observations_fts(rowid, title, content, topic_key, project_id) VALUES (?, ?, ?, ?, ?)'
        ).run(id, row.title, row.content, row.topic_key, row.project_id);
      }
    });

    const restored = await this.getObservationById(id, true);
    if (!restored) throw new Error('Failed to restore observation');
    return restored;
  }

  async purgeObservations(params: {
    projectId?: string;
    observationIds?: number[];
  }): Promise<{ purgedCount: number; purgedIds: number[] }> {
    this.checkHealth();

    let sql = 'SELECT id FROM observations WHERE deleted_at IS NOT NULL';
    const values: (string | number)[] = [];

    if (params.observationIds && params.observationIds.length > 0) {
      const placeholders = params.observationIds.map(() => '?').join(',');
      sql += ` AND id IN (${placeholders})`;
      values.push(...params.observationIds);
    }
    if (params.projectId) {
      sql += ' AND project_id = ?';
      values.push(params.projectId);
    }

    const rows = this.db.prepare(sql).all(...values) as { id: number }[];
    const ids = rows.map((r) => r.id);

    if (ids.length === 0) return { purgedCount: 0, purgedIds: [] };

    const placeholders = ids.map(() => '?').join(',');
    // Application-level FTS5 sync (was trigger observations_ad)
    this.db.prepare(`DELETE FROM observations_fts WHERE rowid IN (${placeholders})`).run(...ids);
    this.db.prepare(`DELETE FROM observations WHERE id IN (${placeholders})`).run(...ids);

    return { purgedCount: ids.length, purgedIds: ids };
  }

  async listDeleted(params: {
    projectId?: string;
    limit?: number;
  }): Promise<{ observations: Observation[]; total: number }> {
    this.checkHealth();
    const { projectId, limit = 20 } = params;

    let countSql = 'SELECT COUNT(*) as count FROM observations WHERE deleted_at IS NOT NULL';
    let sql = 'SELECT * FROM observations WHERE deleted_at IS NOT NULL';
    const values: (string | number)[] = [];

    if (projectId) {
      countSql += ' AND project_id = ?';
      sql += ' AND project_id = ?';
      values.push(projectId);
    }

    const countResult = this.db.prepare(countSql).get(...values) as { count: number } | undefined;
    const total = countResult ? countResult.count : 0;

    sql += ' ORDER BY deleted_at DESC, id DESC LIMIT ?';
    const rows = this.db.prepare(sql).all(...values, limit) as Record<string, unknown>[];
    const observations = rows.map((row) => this.mapObservation(row));

    return { observations, total };
  }

  // ─── Merge ─────────────────────────────────────────────────

  async findMergeCandidates(params: {
    projectId: string;
    strategy: 'by_topic' | 'by_similarity';
    similarityThreshold?: number;
  }): Promise<MergeCandidates> {
    this.checkHealth();
    const { projectId, strategy, similarityThreshold = 0.85 } = params;
    const groups: MergeCandidateGroup[] = [];

    if (strategy === 'by_topic') {
      const rows = this.db
        .prepare(
          `SELECT topic_key, COUNT(*) as cnt FROM observations
           WHERE project_id = ? AND deleted_at IS NULL AND topic_key IS NOT NULL AND topic_key != ''
           GROUP BY topic_key HAVING cnt >= 2
           ORDER BY cnt DESC`
        )
        .all(projectId) as { topic_key: string; cnt: number }[];

      for (const row of rows) {
        const obs = this.db
          .prepare(
            'SELECT * FROM observations WHERE project_id = ? AND topic_key = ? AND deleted_at IS NULL ORDER BY created_at ASC, id ASC'
          )
          .all(projectId, row.topic_key) as Record<string, unknown>[];

        groups.push({
          reason: `topic_key: ${row.topic_key}`,
          observations: obs.map((o) => this.mapObservation(o)),
          estimatedReduction: obs.length - 1,
        });
      }
    } else {
      // by_similarity — compare recent observations pairwise
      const allObs = this.db
        .prepare(
          'SELECT * FROM observations WHERE project_id = ? AND deleted_at IS NULL ORDER BY created_at DESC, id DESC LIMIT 200'
        )
        .all(projectId) as Record<string, unknown>[];

      const mapped = allObs.map((o) => this.mapObservation(o));
      const visited = new Set<number>();

      for (let i = 0; i < mapped.length; i++) {
        if (visited.has(mapped[i].id)) continue;
        const group: Observation[] = [mapped[i]];

        for (let j = i + 1; j < mapped.length; j++) {
          if (visited.has(mapped[j].id)) continue;
          const sim = this.jaccardSimilarity(mapped[i].content, mapped[j].content);
          if (sim >= similarityThreshold) {
            group.push(mapped[j]);
            visited.add(mapped[j].id);
          }
        }

        if (group.length >= 2) {
          visited.add(mapped[i].id);
          groups.push({
            reason: `similarity >= ${similarityThreshold}`,
            observations: group,
            estimatedReduction: group.length - 1,
          });
        }
      }
    }

    const totalCandidates = groups.reduce((acc, g) => acc + g.observations.length, 0);
    const estimatedReduction = groups.reduce((acc, g) => acc + g.estimatedReduction, 0);

    return { groups, totalCandidates, estimatedReduction };
  }

  async mergeObservations(params: MergeParams): Promise<MergeResult[]> {
    this.checkHealth();
    const { projectId, topicKey, observationIds, strategy, dryRun = false } = params;

    let groups: { observations: Observation[] }[] = [];

    if (strategy === 'by_ids' && observationIds && observationIds.length >= 2) {
      const obs: Observation[] = [];
      for (const id of observationIds) {
        const o = await this.getObservationById(id);
        if (!o) throw new Error(`Observation ${id} not found`);
        if (o.deletedAt) throw new Error(`Observation ${id} is soft-deleted`);
        if (o.projectId !== projectId) {
          throw new Error(
            `Observation ${id} belongs to project '${o.projectId}', not '${projectId}'`
          );
        }
        obs.push(o);
      }
      groups = [{ observations: obs }];
    } else if (strategy === 'by_topic') {
      const candidates = await this.findMergeCandidates({
        projectId,
        strategy: 'by_topic',
      });
      if (topicKey) {
        groups = candidates.groups.filter((g) => g.reason === `topic_key: ${topicKey}`);
      } else {
        groups = candidates.groups;
      }
    } else {
      const candidates = await this.findMergeCandidates({
        projectId,
        strategy: 'by_similarity',
      });
      groups = candidates.groups;
    }

    if (groups.length === 0) return [];
    if (dryRun) {
      return groups.map((g) => ({
        mergedObservation: g.observations[0], // placeholder
        deletedIds: g.observations.map((o) => o.id),
        originalCount: g.observations.length,
        strategy,
      }));
    }

    const results: MergeResult[] = [];

    const doMerge = this.db.transaction(() => {
      for (const group of groups) {
        const obs = group.observations.sort(
          (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
        );

        // Synthesize content
        const synthTitle = obs[obs.length - 1].title; // most recent title
        const synthContent = obs
          .map((o) => `--- [${o.createdAt.toISOString()}] ${o.title} ---\n${o.content}`)
          .join('\n\n');

        // Most frequent type
        const typeCounts: Record<string, number> = {};
        for (const o of obs) {
          typeCounts[o.type] = (typeCounts[o.type] || 0) + 1;
        }
        const synthType = Object.entries(typeCounts).sort(
          (a, b) => b[1] - a[1]
        )[0][0] as Observation['type'];

        const synthTopicKey = obs.find((o) => o.topicKey)?.topicKey ?? null;
        const sourceIds = obs.map((o) => o.id);
        const synthMetadata = this.serialize({
          merged: true,
          sourceIds,
          mergedAt: new Date().toISOString(),
          originalCount: obs.length,
        });

        const uuid = crypto.randomUUID();
        const createdAt = Date.now();
        const sessionId = obs[obs.length - 1].sessionId;

        const insertResult = this.db
          .prepare(
            `INSERT INTO observations (uuid, session_id, title, content, type, topic_key, project_id, created_at, deleted_at, metadata)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)`
          )
          .run(
            uuid,
            sessionId,
            synthTitle,
            synthContent,
            synthType,
            synthTopicKey,
            projectId,
            createdAt,
            synthMetadata
          );

        const newId =
          typeof insertResult.lastInsertRowid === 'bigint'
            ? Number(insertResult.lastInsertRowid)
            : insertResult.lastInsertRowid;

        // Application-level FTS5 sync: insert merged, delete originals
        this.db.prepare(
          'INSERT INTO observations_fts(rowid, title, content, topic_key, project_id) VALUES (?, ?, ?, ?, ?)'
        ).run(newId, synthTitle, synthContent, synthTopicKey ?? '', projectId);

        // Delete originals (from both observations and observations_fts)
        const placeholders = sourceIds.map(() => '?').join(',');
        this.db.prepare(`DELETE FROM observations_fts WHERE rowid IN (${placeholders})`).run(...sourceIds);
        this.db.prepare(`DELETE FROM observations WHERE id IN (${placeholders})`).run(...sourceIds);

        // Fetch the newly created merged observation
        const merged = this.db.prepare('SELECT * FROM observations WHERE id = ?').get(newId);

        results.push({
          mergedObservation: this.mapObservation(merged as Record<string, unknown>),
          deletedIds: sourceIds,
          originalCount: obs.length,
          strategy,
        });
      }
    });

    doMerge();
    return results;
  }

  jaccardSimilarity(text1: string, text2: string): number {
    const tokenize = (t: string) =>
      new Set(
        t
          .toLowerCase()
          .split(/\s+/)
          .filter((w) => w.length > 2)
      );

    const set1 = tokenize(text1);
    const set2 = tokenize(text2);

    const intersection = [...set1].filter((x) => set2.has(x)).length;
    const union = new Set([...set1, ...set2]).size;

    return union === 0 ? 0 : intersection / union;
  }

  // ─── Export ────────────────────────────────────────────────

  async exportObservations(params: ExportParams): Promise<ExportResult> {
    this.checkHealth();
    const { format, projectId, type, topicKey, dateFrom, dateTo, includeDeleted = false } = params;

    let sql = 'SELECT * FROM observations WHERE 1=1';
    const values: (string | number)[] = [];

    if (!includeDeleted) {
      sql += ' AND deleted_at IS NULL';
    }
    if (projectId) {
      sql += ' AND project_id = ?';
      values.push(projectId);
    }
    if (type) {
      sql += ' AND type = ?';
      values.push(type);
    }
    if (topicKey) {
      sql += ' AND topic_key = ?';
      values.push(topicKey);
    }
    if (dateFrom) {
      sql += ' AND created_at >= ?';
      values.push(dateFrom.getTime());
    }
    if (dateTo) {
      sql += ' AND created_at <= ?';
      values.push(dateTo.getTime());
    }

    sql += ' ORDER BY created_at ASC, id ASC';

    const rows = this.db.prepare(sql).all(...values) as Record<string, unknown>[];
    const observations = rows.map((row) => this.mapObservation(row));
    const exportedAt = new Date();

    let content: string;

    switch (format) {
      case 'json':
        content = this.exportToJSON(observations, exportedAt, params);
        break;
      case 'xml':
        content = this.exportToXML(observations, exportedAt, params);
        break;
      case 'txt':
        content = this.exportToTXT(observations, exportedAt, params);
        break;
      default:
        throw new Error(`Unsupported export format: ${format as string}`);
    }

    return {
      content,
      format,
      recordCount: observations.length,
      exportedAt,
    };
  }

  private exportToJSON(
    observations: Observation[],
    exportedAt: Date,
    params: ExportParams
  ): string {
    const data = {
      exportedAt: exportedAt.toISOString(),
      version: '1.0',
      project: params.projectId || 'all',
      filters: {
        ...(params.type && { type: params.type }),
        ...(params.topicKey && { topicKey: params.topicKey }),
        ...(params.dateFrom && { dateFrom: params.dateFrom.toISOString() }),
        ...(params.dateTo && { dateTo: params.dateTo.toISOString() }),
        ...(params.includeDeleted && { includeDeleted: true }),
      },
      totalRecords: observations.length,
      observations: observations.map((o) => ({
        id: o.id,
        uuid: o.uuid,
        title: o.title,
        content: o.content,
        type: o.type,
        topicKey: o.topicKey,
        projectId: o.projectId,
        createdAt: o.createdAt.toISOString(),
        ...(o.deletedAt && { deletedAt: o.deletedAt.toISOString() }),
        metadata: o.metadata,
      })),
    };
    return JSON.stringify(data, null, 2);
  }

  private exportToXML(observations: Observation[], exportedAt: Date, params: ExportParams): string {
    const escapeXml = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<memento-export version="1.0" exportedAt="${exportedAt.toISOString()}">\n`;
    xml += `  <project>${escapeXml(params.projectId || 'all')}</project>\n`;
    xml += `  <observations count="${observations.length}">\n`;

    for (const o of observations) {
      xml += `    <observation id="${o.id}" uuid="${escapeXml(o.uuid)}">\n`;
      xml += `      <title>${escapeXml(o.title)}</title>\n`;
      xml += `      <content><![CDATA[${o.content}]]></content>\n`;
      xml += `      <type>${escapeXml(o.type)}</type>\n`;
      if (o.topicKey) xml += `      <topicKey>${escapeXml(o.topicKey)}</topicKey>\n`;
      xml += `      <projectId>${escapeXml(o.projectId)}</projectId>\n`;
      xml += `      <createdAt>${o.createdAt.toISOString()}</createdAt>\n`;
      if (o.deletedAt) xml += `      <deletedAt>${o.deletedAt.toISOString()}</deletedAt>\n`;
      xml += `    </observation>\n`;
    }

    xml += `  </observations>\n`;
    xml += `</memento-export>\n`;
    return xml;
  }

  private exportToTXT(observations: Observation[], exportedAt: Date, params: ExportParams): string {
    const sep = '═'.repeat(50);
    const thinSep = '─'.repeat(50);
    const dateStr = exportedAt.toISOString().split('T')[0];

    let txt = `${sep}\n`;
    txt += `MEMENTO EXPORT — Project: ${params.projectId || 'all'}\n`;
    txt += `Exported: ${dateStr} | Records: ${observations.length}\n`;
    txt += `${sep}\n\n`;

    for (const o of observations) {
      txt += `[#${o.id}] ${o.title}\n`;
      txt += `Type: ${o.type}`;
      if (o.topicKey) txt += ` | Topic: ${o.topicKey}`;
      txt += `\nDate: ${o.createdAt.toISOString().split('T')[0]}`;
      if (o.deletedAt) txt += ` | DELETED: ${o.deletedAt.toISOString().split('T')[0]}`;
      txt += `\n\n  ${o.content}\n\n${thinSep}\n\n`;
    }

    return txt;
  }

  // ─── Search ────────────────────────────────────────────────

  /**
   * Sanitize a user query for safe use in FTS5 MATCH.
   * Strips FTS5 operators and special characters that would cause syntax errors.
   * Returns empty string if nothing survives sanitization.
   */
  private sanitizeFTS5Query(input: string): string {
    return input
      .replace(/[^a-zA-Z0-9\s]/g, ' ')  // Keep only alphanumeric and whitespace
      .replace(/\s+/g, ' ')              // Collapse whitespace
      .trim();
  }

  async getObservation(id: number, includeDeleted: boolean = false): Promise<Observation | null> {
    return await this.getObservationById(id, includeDeleted);
  }

  async search(params: SearchParams): Promise<SearchResult> {
    const {
      query,
      type,
      projectId,
      topicKey,
      limit = 100,
      offset = 0,
      includeDeleted = false,
      scope,
    } = params;

    let sql: string;
    const values: (string | number | null)[] = [];

    const sanitizedQuery = query ? this.sanitizeFTS5Query(query) : '';

    if (sanitizedQuery) {
      sql =
        'SELECT observations.* FROM observations JOIN observations_fts ON observations.id = observations_fts.rowid WHERE observations_fts MATCH ?';
      values.push(sanitizedQuery);

      if (!includeDeleted) {
        sql += ' AND observations.deleted_at IS NULL';
      }
      if (type) {
        sql += ' AND observations.type = ?';
        values.push(type);
      }
      if (projectId) {
        sql += ' AND observations.project_id = ?';
        values.push(projectId);
      }
      if (topicKey) {
        sql += ' AND observations.topic_key = ?';
        values.push(topicKey);
      }
      if (scope) {
        sql += ' AND observations.scope = ?';
        values.push(scope);
      }
    } else {
      sql = 'SELECT * FROM observations WHERE 1=1';

      if (!includeDeleted) {
        sql += ' AND deleted_at IS NULL';
      }
      if (type) {
        sql += ' AND type = ?';
        values.push(type);
      }
      if (projectId) {
        sql += ' AND project_id = ?';
        values.push(projectId);
      }
      if (topicKey) {
        sql += ' AND topic_key = ?';
        values.push(topicKey);
      }
      if (scope) {
        sql += ' AND scope = ?';
        values.push(scope);
      }
    }

    const countSql = sql.replace(/SELECT.*?FROM/, 'SELECT COUNT(*) as count FROM');
    const countResult = this.db.prepare(countSql).get(...values) as { count: number } | undefined;
    const total = countResult ? countResult.count : 0;

    sql += ' ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?';
    values.push(limit, offset);

    const rows = this.db.prepare(sql).all(...values);
    const observations = (rows as Record<string, unknown>[]).map((row) => this.mapObservation(row));
    return { observations, total };
  }

  // ─── Sessions ──────────────────────────────────────────────

  async createSession(data: {
    projectId: string;
    endedAt: Date | null;
    metadata: Record<string, unknown>;
  }): Promise<Session> {
    const uuid = crypto.randomUUID();
    const startedAt = new Date();
    const metadata = this.serialize(data.metadata);

    const result = this.db
      .prepare(
        `INSERT INTO sessions (uuid, project_id, started_at, ended_at, metadata) VALUES (?, ?, ?, ?, ?)`
      )
      .run(uuid, data.projectId, startedAt.getTime(), data.endedAt?.getTime() ?? null, metadata);

    const id =
      typeof result.lastInsertRowid === 'bigint'
        ? Number(result.lastInsertRowid)
        : result.lastInsertRowid;
    const session = await this.getSessionById(id);
    if (!session) throw new Error('Failed to retrieve created session');
    return session;
  }

  async endSession(id: number): Promise<Session> {
    const session = await this.getSessionById(id);
    if (!session) throw new Error('Session not found');
    const endedAt = new Date();
    this.db.prepare('UPDATE sessions SET ended_at = ? WHERE id = ?').run(endedAt.getTime(), id);
    const updated = await this.getSessionById(id);
    if (!updated) throw new Error('Failed to update session');
    return updated;
  }

  async getSession(id: number): Promise<Session | null> {
    return await this.getSessionById(id);
  }

  // ─── Prompts ───────────────────────────────────────────────

  async savePrompt(data: {
    sessionId: number;
    content: string;
    projectId: string;
    metadata: Record<string, unknown>;
  }): Promise<Prompt> {
    const uuid = crypto.randomUUID();
    const createdAt = new Date();
    const metadata = this.serialize(data.metadata);

    const result = this.db
      .prepare(
        `INSERT INTO prompts (uuid, session_id, content, project_id, created_at, metadata) VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(uuid, data.sessionId, data.content, data.projectId, createdAt.getTime(), metadata);

    const id =
      typeof result.lastInsertRowid === 'bigint'
        ? Number(result.lastInsertRowid)
        : result.lastInsertRowid;
    const prompt = await this.getPromptById(id);
    if (!prompt) throw new Error('Failed to retrieve saved prompt');
    return prompt;
  }

  // ─── Private helpers ───────────────────────────────────────

  private async getObservationById(
    id: number,
    includeDeleted: boolean = false
  ): Promise<Observation | null> {
    let sql = 'SELECT * FROM observations WHERE id = ?';
    if (!includeDeleted) {
      sql += ' AND deleted_at IS NULL';
    }
    const row = this.db.prepare(sql).get(id);
    if (!row) return null;
    const observation = this.mapObservation(row as Record<string, unknown>);

    // Calculate duplicatesCount when topicKey is present
    if (observation.topicKey) {
      const dupResult = this.db
        .prepare(
          'SELECT COUNT(*) as count FROM observations WHERE topic_key = ? AND deleted_at IS NULL'
        )
        .get(observation.topicKey) as { count: number } | undefined;
      observation.duplicatesCount = dupResult?.count ?? 0;
    }

    return observation;
  }

  private async getSessionById(id: number): Promise<Session | null> {
    const row = this.db.prepare('SELECT * FROM sessions WHERE id = ?').get(id);
    if (!row) return null;
    return this.mapSession(row as Record<string, unknown>);
  }

  private async getPromptById(id: number): Promise<Prompt | null> {
    const row = this.db.prepare('SELECT * FROM prompts WHERE id = ?').get(id);
    if (!row) return null;
    return this.mapPrompt(row as Record<string, unknown>);
  }

  private mapObservation(row: Record<string, unknown>): Observation {
    const r = row as {
      id: number;
      uuid: string;
      session_id: number;
      title: string;
      content: string;
      type: Observation['type'];
      topic_key: string | null;
      project_id: string;
      created_at: number;
      deleted_at: number | null;
      metadata: string | null;
      scope: string | null;
      revision_count: number | null;
    };
    return {
      id: r.id,
      uuid: r.uuid,
      sessionId: r.session_id,
      title: r.title,
      content: r.content,
      type: r.type,
      topicKey: r.topic_key,
      projectId: r.project_id,
      createdAt: new Date(r.created_at),
      deletedAt: r.deleted_at ? new Date(r.deleted_at) : null,
      metadata: this.deserialize(r.metadata),
      scope: (r.scope as 'project' | 'personal') || 'project',
      revisionCount: r.revision_count ?? 0,
    };
  }

  private mapSession(row: Record<string, unknown>): Session {
    const r = row as {
      id: number;
      uuid: string;
      project_id: string;
      started_at: number;
      ended_at: number | null;
      metadata: string | null;
    };
    return {
      id: r.id,
      uuid: r.uuid,
      projectId: r.project_id,
      startedAt: new Date(r.started_at),
      endedAt: r.ended_at ? new Date(r.ended_at) : null,
      metadata: this.deserialize(r.metadata),
    };
  }

  private mapPrompt(row: Record<string, unknown>): Prompt {
    const r = row as {
      id: number;
      uuid: string;
      session_id: number;
      content: string;
      project_id: string;
      created_at: number;
      metadata: string | null;
    };
    return {
      id: r.id,
      uuid: r.uuid,
      sessionId: r.session_id,
      content: r.content,
      projectId: r.project_id,
      createdAt: new Date(r.created_at),
      metadata: this.deserialize(r.metadata),
    };
  }

  // ─── Timeline & Context ──────────────────────────────────────

  async getTimeline(params: {
    projectId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ observations: Observation[]; total: number }> {
    this.checkHealth();
    const { projectId, limit = 50, offset = 0 } = params;

    let countSql = 'SELECT COUNT(*) as count FROM observations WHERE deleted_at IS NULL';
    let sql = 'SELECT * FROM observations WHERE deleted_at IS NULL';
    const values: (string | number)[] = [];

    if (projectId) {
      countSql += ' AND project_id = ?';
      sql += ' AND project_id = ?';
      values.push(projectId);
    }

    const countResult = this.db.prepare(countSql).get(...values) as { count: number } | undefined;
    const total = countResult?.count ?? 0;

    sql += ' ORDER BY created_at ASC, id ASC LIMIT ? OFFSET ?';
    const rows = this.db.prepare(sql).all(...values, limit, offset);
    const observations = (rows as Record<string, unknown>[]).map((row) => this.mapObservation(row));

    return { observations, total };
  }

  async getRecentContext(params: {
    projectId?: string;
    limit?: number;
  }): Promise<{ observations: Observation[]; total: number }> {
    this.checkHealth();
    const { projectId, limit = 20 } = params;

    let sql = 'SELECT * FROM observations WHERE deleted_at IS NULL';
    const values: (string | number)[] = [];

    if (projectId) {
      sql += ' AND project_id = ?';
      values.push(projectId);
    }

    sql += ' ORDER BY created_at DESC, id DESC LIMIT ?';
    const rows = this.db.prepare(sql).all(...values, limit);
    const observations = (rows as Record<string, unknown>[]).map((row) => this.mapObservation(row));

    // Get total for context
    let countSql = 'SELECT COUNT(*) as count FROM observations WHERE deleted_at IS NULL';
    const countValues: string[] = [];
    if (projectId) {
      countSql += ' AND project_id = ?';
      countValues.push(projectId);
    }
    const countResult = this.db.prepare(countSql).get(...countValues) as { count: number } | undefined;
    const total = countResult?.count ?? 0;

    return { observations, total };
  }

  // ─── TUI Explorer API ──────────────────────────────────────

  async listSessions(params: {
    projectId?: string;
    activeOnly?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ sessions: Session[]; total: number }> {
    this.checkHealth();

    const { projectId, activeOnly = false, limit = 50, offset = 0 } = params;

    let sql = 'SELECT * FROM sessions WHERE 1=1';
    const values: (string | number)[] = [];

    if (projectId) {
      sql += ' AND project_id = ?';
      values.push(projectId);
    }
    if (activeOnly) {
      sql += ' AND ended_at IS NULL';
    }

    // Count
    const countSql = sql.replace(/SELECT.*?FROM/, 'SELECT COUNT(*) as count FROM');
    const countResult = this.db.prepare(countSql).get(...values) as { count: number } | undefined;
    const total = countResult?.count ?? 0;

    // Fetch (id DESC as tiebreaker for same-millisecond timestamps)
    sql += ' ORDER BY started_at DESC, id DESC LIMIT ? OFFSET ?';
    values.push(limit, offset);

    const rows = this.db.prepare(sql).all(...values);
    const sessions = (rows as Record<string, unknown>[]).map((row) => this.mapSession(row));

    return { sessions, total };
  }

  async listProjects(): Promise<
    Array<{
      name: string;
      activeCount: number;
      deletedCount: number;
      lastActivity: Date | null;
      byType: Record<string, number>;
    }>
  > {
    this.checkHealth();

    // Get all distinct project_ids with their stats
    const rows = this.db
      .prepare(
        `
      SELECT
        project_id,
        SUM(CASE WHEN deleted_at IS NULL THEN 1 ELSE 0 END) as active_count,
        SUM(CASE WHEN deleted_at IS NOT NULL THEN 1 ELSE 0 END) as deleted_count,
        MAX(created_at) as last_activity,
        MAX(id) as max_id
      FROM observations
      GROUP BY project_id
      ORDER BY last_activity DESC, max_id DESC
    `
      )
      .all();

    const projects = (rows as Record<string, unknown>[]).map((row) => {
      const projectId = row.project_id as string;

      // Get type distribution for this project
      const typeRows = this.db
        .prepare(
          `
        SELECT type, COUNT(*) as count
        FROM observations
        WHERE project_id = ?
        GROUP BY type
      `
        )
        .all(projectId) as Record<string, unknown>[];

      const byType: Record<string, number> = {
        decision: 0,
        bug: 0,
        discovery: 0,
        note: 0,
        summary: 0,
        learning: 0,
        pattern: 0,
        architecture: 0,
        config: 0,
        preference: 0,
      };
      for (const tr of typeRows) {
        byType[tr.type as string] = tr.count as number;
      }

      return {
        name: projectId,
        activeCount: row.active_count as number,
        deletedCount: row.deleted_count as number,
        lastActivity: row.last_activity ? new Date(row.last_activity as number) : null,
        byType,
      };
    });

    return projects;
  }

  async getDashboardStats(): Promise<{
    totalObservations: number;
    activeObservations: number;
    deletedObservations: number;
    byType: Record<string, number>;
    byProject: Record<string, number>;
    activeSessions: number;
    recentObservations: Observation[];
  }> {
    this.checkHealth();

    // Total counts
    const countRow = this.db
      .prepare(
        `
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN deleted_at IS NULL THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN deleted_at IS NOT NULL THEN 1 ELSE 0 END) as deleted
      FROM observations
    `
      )
      .get() as Record<string, unknown>;

    // By type
    const typeRows = this.db
      .prepare(
        `
      SELECT type, COUNT(*) as count
      FROM observations
      WHERE deleted_at IS NULL
      GROUP BY type
    `
      )
      .all() as Record<string, unknown>[];

    const byType: Record<string, number> = { decision: 0, bug: 0, discovery: 0, note: 0, summary: 0, learning: 0, pattern: 0, architecture: 0, config: 0, preference: 0 };
    for (const tr of typeRows) {
      byType[tr.type as string] = tr.count as number;
    }

    // By project (active only)
    const projectRows = this.db
      .prepare(
        `
      SELECT project_id, COUNT(*) as count
      FROM observations
      WHERE deleted_at IS NULL
      GROUP BY project_id
      ORDER BY count DESC
    `
      )
      .all() as Record<string, unknown>[];

    const byProject: Record<string, number> = {};
    for (const pr of projectRows) {
      byProject[pr.project_id as string] = pr.count as number;
    }

    // Active sessions
    const sessionRow = this.db
      .prepare('SELECT COUNT(*) as count FROM sessions WHERE ended_at IS NULL')
      .get() as { count: number };

    // Recent 5 observations (active only)
    const recentRows = this.db
      .prepare(
        `
      SELECT * FROM observations
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC, id DESC
      LIMIT 5
    `
      )
      .all();

    const recentObservations = (recentRows as Record<string, unknown>[]).map((row) =>
      this.mapObservation(row)
    );

    return {
      totalObservations: (countRow.total as number) ?? 0,
      activeObservations: (countRow.active as number) ?? 0,
      deletedObservations: (countRow.deleted as number) ?? 0,
      byType,
      byProject,
      activeSessions: sessionRow.count,
      recentObservations,
    };
  }

  // ─── Import/Export ──────────────────────────────────────────

  async exportToJson(options?: {
    projectId?: string;
    includeSessions?: boolean;
  }): Promise<ExportData> {
    this.checkHealth();
    const { projectId, includeSessions = false } = options || {};

    const searchResult = await this.search({ projectId, limit: 100000 });

    const observations: ExportedObservation[] = searchResult.observations.map((obs) => ({
      uuid: obs.uuid,
      title: obs.title,
      content: obs.content,
      type: obs.type,
      topicKey: obs.topicKey,
      projectId: obs.projectId,
      metadata: obs.metadata,
      createdAt: obs.createdAt.toISOString(),
    }));

    let sessions: ExportedSession[] | undefined;
    if (includeSessions) {
      const sessionIds = [...new Set(searchResult.observations.map((o) => o.sessionId))];
      const sessionResults = await Promise.all(sessionIds.map((id) => this.getSession(id)));
      sessions = sessionResults
        .filter((s): s is Session => s !== null)
        .map((s) => ({
          uuid: s.uuid,
          projectId: s.projectId,
          startedAt: s.startedAt.toISOString(),
          endedAt: s.endedAt?.toISOString() || null,
          metadata: s.metadata,
        }));
    }

    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      project: projectId,
      observations,
      ...(includeSessions && sessions && { sessions }),
    };
  }

  async importFromJson(data: ImportData, options?: ImportOptions): Promise<ImportResult> {
    this.checkHealth();
    const { conflictStrategy = 'skip', dryRun = false, projectId } = options || {};

    // Validate schema
    if (!data.version || !Array.isArray(data.observations)) {
      throw new Error('Invalid import data: missing version or observations array');
    }

    const validTypes: Observation['type'][] = ['decision', 'bug', 'discovery', 'note', 'summary', 'learning', 'pattern', 'architecture', 'config', 'preference'];
    const targetProject = projectId || data.project || 'import';

    const result: ImportResult = {
      imported: 0,
      skipped: 0,
      overwritten: 0,
      failed: 0,
      errors: [],
      observations: [],
    };

    if (data.observations.length === 0) {
      return result;
    }

    // Create import session
    const session = await this.createSession({
      projectId: targetProject,
      endedAt: null,
      metadata: { type: 'import', source: 'mem_import', timestamp: new Date().toISOString() },
    });

    // Use db.transaction() for safe atomic import (#70)
    // Replaces manual BEGIN/COMMIT which was fragile — if createObservation's
    // withRetry() hit SQLITE_BUSY inside a manual transaction, the retry would
    // fail because the transaction was already in error state.
    const doImport = this.db.transaction(() => {
      for (const obs of data.observations) {
        // Validate required fields
        if (!obs.title || !obs.content || !obs.type) {
          result.errors.push(`Invalid observation: missing required fields (title, content, type)`);
          if (conflictStrategy === 'fail') {
            result.failed++;
            throw new Error('IMPORT_ABORT');
          }
          result.failed++;
          continue;
        }

        // Validate type
        if (!validTypes.includes(obs.type as Observation['type'])) {
          result.errors.push(`Invalid type: "${obs.type}". Valid types: ${validTypes.join(', ')}`);
          if (conflictStrategy === 'fail') {
            result.failed++;
            throw new Error('IMPORT_ABORT');
          }
          result.failed++;
          continue;
        }

        // Check for duplicates by uuid
        if (obs.uuid) {
          const existing = this.findObservationByUuid(obs.uuid);
          if (existing) {
            if (conflictStrategy === 'skip') {
              result.skipped++;
              continue;
            }
            if (conflictStrategy === 'overwrite') {
              if (!dryRun) {
                // Direct UPDATE + FTS5 sync (avoids withRetry inside transaction)
                const fields: string[] = [];
                const values: (string | number | null)[] = [];

                if (obs.title !== undefined) { fields.push('title = ?'); values.push(obs.title); }
                if (obs.content !== undefined) { fields.push('content = ?'); values.push(obs.content); }
                if (obs.type !== undefined) { fields.push('type = ?'); values.push(obs.type as string); }
                if (obs.topicKey !== undefined) { fields.push('topic_key = ?'); values.push(obs.topicKey ?? null); }
                if (obs.metadata !== undefined) { fields.push('metadata = ?'); values.push(this.serialize(obs.metadata || {})); }

                fields.push('revision_count = revision_count + 1');
                values.push(existing.id);

                this.db.prepare(`UPDATE observations SET ${fields.join(', ')} WHERE id = ?`).run(...values);

                // FTS5 sync — delete + re-insert
                this.db.prepare('DELETE FROM observations_fts WHERE rowid = ?').run(existing.id);
                const row = this.db
                  .prepare('SELECT title, content, topic_key, project_id FROM observations WHERE id = ?')
                  .get(existing.id) as { title: string; content: string; topic_key: string; project_id: string } | undefined;
                if (row) {
                  this.db.prepare(
                    'INSERT INTO observations_fts(rowid, title, content, topic_key, project_id) VALUES (?, ?, ?, ?, ?)'
                  ).run(existing.id, row.title, row.content, row.topic_key, row.project_id);
                }
              }
              result.overwritten++;
              continue;
            }
            if (conflictStrategy === 'fail') {
              result.errors.push(`Duplicate uuid: ${obs.uuid}`);
              result.failed++;
              throw new Error('IMPORT_ABORT');
            }
          }
        }

        if (!dryRun) {
          // Direct INSERT + FTS5 sync (avoids withRetry inside transaction)
          const uuid = obs.uuid || crypto.randomUUID();
          const metadata = this.serialize(obs.metadata || {});
          const createdAt = Date.now();

          const insertResult = this.db.prepare(
            `INSERT INTO observations (uuid, session_id, title, content, type, topic_key, project_id, created_at, deleted_at, metadata, scope) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, 'project')`
          ).run(
            uuid,
            session.id,
            obs.title,
            obs.content,
            obs.type,
            obs.topicKey ?? null,
            targetProject,
            createdAt,
            metadata
          );

          const insertId =
            typeof insertResult.lastInsertRowid === 'bigint'
              ? Number(insertResult.lastInsertRowid)
              : insertResult.lastInsertRowid;

          // FTS5 sync
          this.db.prepare(
            'INSERT INTO observations_fts(rowid, title, content, topic_key, project_id) VALUES (?, ?, ?, ?, ?)'
          ).run(insertId, obs.title, obs.content, obs.topicKey ?? '', targetProject);

          // Fetch created observation for result
          const importedRow = this.db.prepare('SELECT * FROM observations WHERE id = ?').get(insertId);
          if (importedRow) {
            result.observations.push(this.mapObservation(importedRow as Record<string, unknown>));
          }
        }
        result.imported++;
      }
    });

    try {
      doImport();
    } catch (error) {
      if (error instanceof Error && error.message === 'IMPORT_ABORT') {
        // Transaction auto-rolled back; return partial result with errors
        return result;
      }
      throw error;
    }

    return result;
  }

  private findObservationByUuid(uuid: string): Observation | null {
    const row = this.db.prepare('SELECT * FROM observations WHERE uuid = ?').get(uuid);
    if (!row) return null;
    return this.mapObservation(row as Record<string, unknown>);
  }

  async resetFull(): Promise<{ deleted: number }> {
    this.checkHealth();

    // Count before reset
    const countResult = this.db.prepare('SELECT COUNT(*) as count FROM observations').get() as { count: number } | undefined;
    const deleted = countResult?.count || 0;

    // Drop everything (no observation triggers — FTS5 sync is application-level)
    this.db.exec('DROP TABLE IF EXISTS observations_fts');
    this.db.exec('DROP TRIGGER IF EXISTS journal_ai');
    this.db.exec('DROP TABLE IF EXISTS journal_fts');
    this.db.exec('DROP TABLE IF EXISTS journal_tags');
    this.db.exec('DROP TABLE IF EXISTS journal');
    this.db.exec('DROP TABLE IF EXISTS observations');
    this.db.exec('DROP TABLE IF EXISTS prompts');
    this.db.exec('DROP TABLE IF EXISTS sessions');
    this.db.exec('DROP TABLE IF EXISTS projects');

    // Recreate schema
    this.initializeDatabase();

    return { deleted };
  }

  async resetProject(projectId: string): Promise<{ deleted: number; orphanSessions: number }> {
    this.checkHealth();

    // Count observations to delete
    const obsCount = this.db
      .prepare('SELECT COUNT(*) as count FROM observations WHERE project_id = ?')
      .get(projectId) as { count: number };
    const promptCount = this.db
      .prepare('SELECT COUNT(*) as count FROM prompts WHERE project_id = ?')
      .get(projectId) as { count: number };
    const deleted = obsCount.count + promptCount.count;

    // Delete observations (FTS5 first, then main table) and prompts for this project
    // Application-level FTS5 sync (was trigger observations_ad)
    this.db.prepare('DELETE FROM observations_fts WHERE rowid IN (SELECT id FROM observations WHERE project_id = ?)').run(projectId);
    this.db.prepare('DELETE FROM observations WHERE project_id = ?').run(projectId);
    this.db.prepare('DELETE FROM prompts WHERE project_id = ?').run(projectId);

    // Clean up orphan sessions (no observations AND no prompts)
    const orphanResult = this.db.prepare(`
      DELETE FROM sessions WHERE id NOT IN (
        SELECT DISTINCT session_id FROM observations
        UNION
        SELECT DISTINCT session_id FROM prompts
      )
    `).run();
    const orphanSessions = typeof orphanResult.changes === 'bigint'
      ? Number(orphanResult.changes)
      : orphanResult.changes;

    return { deleted, orphanSessions };
  }

  async countByProject(projectId: string): Promise<{ observations: number; prompts: number; sessions: number }> {
    this.checkHealth();

    const obsCount = this.db
      .prepare('SELECT COUNT(*) as count FROM observations WHERE project_id = ?')
      .get(projectId) as { count: number };
    const promptCount = this.db
      .prepare('SELECT COUNT(*) as count FROM prompts WHERE project_id = ?')
      .get(projectId) as { count: number };
    const sessionCount = this.db
      .prepare('SELECT COUNT(DISTINCT session_id) as count FROM observations WHERE project_id = ?')
      .get(projectId) as { count: number };

    return {
      observations: obsCount.count,
      prompts: promptCount.count,
      sessions: sessionCount.count,
    };
  }

  // ─── Journal (append-only evidence) ──────────────────────────

  async writeJournal(data: WriteJournalParams): Promise<JournalEntry> {
    this.checkHealth();

    const uuid = crypto.randomUUID();
    const createdAt = Date.now();
    const metadata = this.serialize(data.metadata || {});

    // If supersedes is set, validate and invalidate the old entry
    if (data.supersedes) {
      const existing = await this.readJournal(data.supersedes);
      if (!existing) throw new Error(`Journal entry ${data.supersedes} not found`);
      if (existing.invalidatedAt) throw new Error(`Journal entry ${data.supersedes} is already invalidated`);
    }

    const id = await this.withRetry(() => {
      const result = this.db
        .prepare(
          `INSERT INTO journal (uuid, project_id, session_id, title, body, model, provider, agent, superseded_by, invalidated_at, metadata, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?)`
        )
        .run(
          uuid,
          data.projectId,
          data.sessionId ?? null,
          data.title,
          data.body,
          data.model ?? null,
          data.provider ?? null,
          data.agent ?? null,
          metadata,
          createdAt
        );
      return typeof result.lastInsertRowid === 'bigint'
        ? Number(result.lastInsertRowid)
        : result.lastInsertRowid;
    });

    // Insert tags
    if (data.tags && data.tags.length > 0) {
      const insertTag = this.db.prepare(
        'INSERT OR IGNORE INTO journal_tags (journal_id, tag) VALUES (?, ?)'
      );
      for (const tag of data.tags) {
        insertTag.run(id, tag);
      }
    }

    // If supersedes, mark the old entry
    if (data.supersedes) {
      await this.withRetry(() =>
        this.db
          .prepare('UPDATE journal SET superseded_by = ?, invalidated_at = ? WHERE id = ?')
          .run(id, createdAt, data.supersedes)
      );
    }

    const entry = await this.readJournal(id);
    if (!entry) throw new Error('Failed to retrieve created journal entry');
    return entry;
  }

  async readJournal(id: number): Promise<JournalEntry | null> {
    this.checkHealth();

    const row = this.db.prepare('SELECT * FROM journal WHERE id = ?').get(id);
    if (!row) return null;

    // Fetch tags
    const tagRows = this.db
      .prepare('SELECT tag FROM journal_tags WHERE journal_id = ?')
      .all(id) as { tag: string }[];
    const tags = tagRows.map((t) => t.tag);

    return this.mapJournalEntry(row as Record<string, unknown>, tags);
  }

  async searchJournal(params: JournalSearchParams): Promise<JournalSearchResult> {
    this.checkHealth();

    const {
      query,
      tags,
      projectId,
      sessionId,
      dateFrom,
      dateTo,
      activeOnly = false,
      limit = 50,
      offset = 0,
    } = params;

    let sql: string;
    const values: (string | number | null)[] = [];

    const sanitizedQuery = query ? this.sanitizeFTS5Query(query) : '';

    if (sanitizedQuery) {
      // FTS5 search — qualify column names to avoid ambiguity with journal_fts
      sql =
        'SELECT journal.* FROM journal JOIN journal_fts ON journal.id = journal_fts.rowid WHERE journal_fts MATCH ?';
      values.push(sanitizedQuery);
    } else {
      sql = 'SELECT * FROM journal WHERE 1=1';
    }

    if (activeOnly) {
      sql += ' AND journal.invalidated_at IS NULL';
    }
    if (projectId) {
      sql += ' AND journal.project_id = ?';
      values.push(projectId);
    }
    if (sessionId) {
      sql += ' AND journal.session_id = ?';
      values.push(sessionId);
    }
    if (dateFrom) {
      sql += ' AND journal.created_at >= ?';
      values.push(dateFrom.getTime());
    }
    if (dateTo) {
      sql += ' AND journal.created_at <= ?';
      values.push(dateTo.getTime());
    }

    // Tag filtering — if tags specified, intersect with journal_tags
    if (tags && tags.length > 0) {
      // Find journal entries that have ALL specified tags
      const tagPlaceholders = tags.map(() => '?').join(',');
      const tagSubquery = `
        AND journal.id IN (
          SELECT jt.journal_id FROM journal_tags jt
          WHERE jt.tag IN (${tagPlaceholders})
          GROUP BY jt.journal_id
          HAVING COUNT(DISTINCT jt.tag) = ${tags.length}
        )
      `;
      sql += tagSubquery;
      values.push(...tags);
    }

    // Count
    const countSql = sql.replace(/SELECT.*?FROM/, 'SELECT COUNT(*) as count FROM');
    const countResult = this.db.prepare(countSql).get(...values) as { count: number } | undefined;
    const total = countResult?.count ?? 0;

    // Fetch
    sql += ' ORDER BY journal.created_at DESC, journal.id DESC LIMIT ? OFFSET ?';
    values.push(limit, offset);

    const rows = this.db.prepare(sql).all(...values) as Record<string, unknown>[];

    // Fetch tags for each entry
    const entries: JournalEntry[] = [];
    for (const row of rows) {
      const entryId = row.id as number;
      const tagRows = this.db
        .prepare('SELECT tag FROM journal_tags WHERE journal_id = ?')
        .all(entryId) as { tag: string }[];
      entries.push(this.mapJournalEntry(row, tagRows.map((t) => t.tag)));
    }

    return { entries, total };
  }

  async invalidateJournal(id: number, supersededById: number): Promise<void> {
    this.checkHealth();

    const entry = await this.readJournal(id);
    if (!entry) throw new Error(`Journal entry ${id} not found`);
    if (entry.invalidatedAt) throw new Error(`Journal entry ${id} is already invalidated`);

    // Validate the superseding entry exists
    const superseding = await this.readJournal(supersededById);
    if (!superseding) throw new Error(`Superseding journal entry ${supersededById} not found`);

    const now = Date.now();
    await this.withRetry(() =>
      this.db
        .prepare('UPDATE journal SET superseded_by = ?, invalidated_at = ? WHERE id = ?')
        .run(supersededById, now, id)
    );
  }

  private mapJournalEntry(row: Record<string, unknown>, tags: string[]): JournalEntry {
    const r = row as {
      id: number;
      uuid: string;
      project_id: string;
      session_id: number | null;
      title: string;
      body: string;
      model: string | null;
      provider: string | null;
      agent: string | null;
      superseded_by: number | null;
      invalidated_at: number | null;
      metadata: string | null;
      created_at: number;
    };
    return {
      id: r.id,
      uuid: r.uuid,
      projectId: r.project_id,
      sessionId: r.session_id,
      title: r.title,
      body: r.body,
      tags,
      model: r.model,
      provider: r.provider,
      agent: r.agent,
      supersededBy: r.superseded_by,
      invalidatedAt: r.invalidated_at ? new Date(r.invalidated_at) : null,
      metadata: this.deserialize(r.metadata),
      createdAt: new Date(r.created_at),
    };
  }

  close(): void {
    this.db.close();
  }
}
