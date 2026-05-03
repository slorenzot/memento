import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const sessions = sqliteTable('sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  uuid: text('uuid').unique().notNull(),
  projectId: text('project_id').notNull(),
  startedAt: integer('started_at').notNull(),
  endedAt: integer('ended_at'),
  metadata: text('metadata'),
});

export const observations = sqliteTable('observations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  uuid: text('uuid').unique().notNull(),
  sessionId: integer('session_id').notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  type: text('type').notNull(),
  topicKey: text('topic_key'),
  projectId: text('project_id').notNull(),
  createdAt: integer('created_at').notNull(),
  deletedAt: integer('deleted_at'),
  metadata: text('metadata'),
});

export const prompts = sqliteTable('prompts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  uuid: text('uuid').unique().notNull(),
  sessionId: integer('session_id').notNull(),
  content: text('content').notNull(),
  projectId: text('project_id').notNull(),
  createdAt: integer('created_at').notNull(),
  metadata: text('metadata'),
});

export const projects = sqliteTable('projects', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').unique().notNull(),
  createdAt: integer('created_at').notNull(),
  metadata: text('metadata'),
});
