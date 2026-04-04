import * as crypto from 'crypto';
import type { Observation, Session, Prompt } from './types.js';

import { Database } from 'bun:sqlite';
import { mkdirSync } from 'fs';
import { join, dirname } from 'path';

export class MemoryEngine {
  private db: any;
  private dbPath: string;

  constructor(dbPath: string = './data/memento.db') {
    this.dbPath = dbPath;
    const dbDir = dirname(dbPath);

    try {
      mkdirSync(dbDir, { recursive: true });
    } catch (error: any) {
      if (error?.code !== 'EEXIST') {
        throw error;
      }
    }

    this.db = new Database(dbPath, { create: true });
    this.initializeDatabase();
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

  async createObservation(data: {
    sessionId: number;
    title: string;
    content: string;
    type: Observation['type'];
    topicKey: string | null;
    projectId: string;
    metadata: Record<string, unknown>;
  }): Promise<Observation> {
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

  close(): void {
    this.db.close();
  }
}
