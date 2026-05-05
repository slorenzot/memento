import * as crypto from 'crypto';
import type {
  Observation,
  Session,
  Prompt,
  ExportData,
  ExportedObservation,
  ExportedSession,
  ImportData,
  ImportOptions,
  ImportResult,
} from './types.js';

import { Database } from 'bun:sqlite';
import { mkdirSync } from 'fs';
import { dirname } from 'path';

export class MemoryEngine {
  private db: any;
  private dbPath: string;
  private initError: Error | null = null;

  constructor(dbPath: string = './data/memento.db') {
    this.dbPath = dbPath;

    try {
      const dbDir = dirname(dbPath);

      // Create directory structure if it doesn't exist
      mkdirSync(dbDir, { recursive: true });

      // Create database connection
      this.db = new Database(dbPath, { create: true });
      this.initializeDatabase();

      console.error(`✓ Database initialized successfully at: ${dbPath}`);
    } catch (error: any) {
      this.initError = error;
      console.error(`✗ Failed to initialize database at ${dbPath}:`, error.message);
      console.error(
        '  The server will start but database operations will fail until this is resolved.'
      );

      // Create a mock database object to prevent null reference errors
      this.db = this.createMockDatabase();
    }
  }

  private createMockDatabase(): any {
    const throwError = () => {
      throw new Error(`Database not initialized: ${this.initError?.message || 'Unknown error'}`);
    };

    return {
      prepare: throwError,
      exec: throwError,
      close: () => {},
    };
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

      CREATE VIRTUAL TABLE IF NOT EXISTS observations_fts USING fts5(
        title, content, topic_key, project_id,
        content='observations'
      );

      CREATE TRIGGER IF NOT EXISTS observations_ai AFTER INSERT ON observations BEGIN
        INSERT INTO observations_fts(rowid, title, content, topic_key, project_id)
        VALUES (new.id, new.title, new.content, new.topic_key, new.project_id);
      END;

      CREATE TRIGGER IF NOT EXISTS observations_ad AFTER DELETE ON observations BEGIN
        DELETE FROM observations_fts WHERE rowid = old.id;
      END;

      CREATE TRIGGER IF NOT EXISTS observations_au AFTER UPDATE ON observations BEGIN
        DELETE FROM observations_fts WHERE rowid = old.id;
        INSERT INTO observations_fts(rowid, title, content, topic_key, project_id)
        VALUES (new.id, new.title, new.content, new.topic_key, new.project_id);
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

  async createObservation(data: {
    sessionId: number;
    title: string;
    content: string;
    type: Observation['type'];
    topicKey: string | null;
    projectId: string;
    metadata: Record<string, unknown>;
  }): Promise<Observation> {
    this.checkHealth();
    const uuid = crypto.randomUUID();
    const createdAt = new Date();
    const metadata = this.serialize(data.metadata);

    const result = this.db
      .prepare(
        `INSERT INTO observations (uuid, session_id, title, content, type, topic_key, project_id, created_at, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
        metadata
      );

    const id =
      typeof result.lastInsertRowid === 'bigint'
        ? Number(result.lastInsertRowid)
        : result.lastInsertRowid;
    const observation = await this.getObservationById(id);
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
      values.push(updates.topicKey || '');
    }
    if (updates.metadata !== undefined) {
      fields.push('metadata = ?');
      values.push(this.serialize(updates.metadata));
    }

    if (fields.length === 0) return current;

    values.push(id);
    this.db.prepare(`UPDATE observations SET ${fields.join(', ')} WHERE id = ?`).run(...values);

    const updated = await this.getObservationById(id);
    if (!updated) throw new Error('Failed to update observation');
    return updated;
  }

  async deleteObservation(id: number): Promise<void> {
    this.db.prepare('DELETE FROM observations WHERE id = ?').run(id);
  }

  async getObservation(id: number): Promise<Observation | null> {
    return await this.getObservationById(id);
  }

  async search(params: {
    query?: string;
    type?: Observation['type'];
    projectId?: string;
    topicKey?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ observations: Observation[]; total: number }> {
    const { query, type, projectId, topicKey, limit = 100, offset = 0 } = params;
    let sql = 'SELECT * FROM observations WHERE 1=1';
    const values: (string | number | null)[] = [];

    if (query) {
      sql =
        'SELECT observations.* FROM observations JOIN observations_fts ON observations.id = observations_fts.rowid WHERE observations_fts MATCH ?';
      values.push(query);
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
    } else {
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
    }

    const countSql = sql.replace(/SELECT.*?FROM/, 'SELECT COUNT(*) as count FROM');
    const countResult = this.db.prepare(countSql).get(...values) as { count: number } | undefined;
    const total = countResult ? countResult.count : 0;

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    values.push(limit, offset);

    const rows = this.db.prepare(sql).all(...values);
    const observations = (rows as Record<string, unknown>[]).map((row) => this.mapObservation(row));
    return { observations, total };
  }

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

  private async getObservationById(id: number): Promise<Observation | null> {
    const row = this.db.prepare('SELECT * FROM observations WHERE id = ?').get(id);
    if (!row) return null;
    return this.mapObservation(row as Record<string, unknown>);
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
      metadata: string | null;
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
      metadata: this.deserialize(r.metadata),
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

    const validTypes: Observation['type'][] = ['decision', 'bug', 'discovery', 'note'];
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

    // Use transaction for atomic import
    this.db.exec('BEGIN');

    try {
      for (const obs of data.observations) {
        // Validate required fields
        if (!obs.title || !obs.content || !obs.type) {
          result.errors.push(`Invalid observation: missing required fields (title, content, type)`);
          if (conflictStrategy === 'fail') {
            this.db.exec('ROLLBACK');
            result.failed++;
            return result;
          }
          result.failed++;
          continue;
        }

        // Validate type
        if (!validTypes.includes(obs.type as Observation['type'])) {
          result.errors.push(`Invalid type: "${obs.type}". Valid types: ${validTypes.join(', ')}`);
          if (conflictStrategy === 'fail') {
            this.db.exec('ROLLBACK');
            result.failed++;
            return result;
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
                await this.updateObservation(existing.id, {
                  title: obs.title,
                  content: obs.content,
                  type: obs.type as Observation['type'],
                  topicKey: obs.topicKey ?? null,
                  metadata: obs.metadata || {},
                });
              }
              result.overwritten++;
              continue;
            }
            if (conflictStrategy === 'fail') {
              this.db.exec('ROLLBACK');
              result.errors.push(`Duplicate uuid: ${obs.uuid}`);
              result.failed++;
              return result;
            }
          }
        }

        if (!dryRun) {
          const imported = await this.createObservation({
            sessionId: session.id,
            title: obs.title,
            content: obs.content,
            type: obs.type as Observation['type'],
            topicKey: obs.topicKey || null,
            projectId: targetProject,
            metadata: obs.metadata || {},
          });
          result.observations.push(imported);
        }
        result.imported++;
      }

      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
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

    // Drop everything
    this.db.exec('DROP TABLE IF EXISTS observations_fts');
    this.db.exec('DROP TRIGGER IF EXISTS observations_ai');
    this.db.exec('DROP TRIGGER IF EXISTS observations_ad');
    this.db.exec('DROP TRIGGER IF EXISTS observations_au');
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

    // Delete observations and prompts for this project
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

  close(): void {
    this.db.close();
  }
}
