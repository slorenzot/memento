"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projects = exports.prompts = exports.observations = exports.sessions = void 0;
const sqlite_core_1 = require("drizzle-orm/sqlite-core");
exports.sessions = (0, sqlite_core_1.sqliteTable)('sessions', {
    id: (0, sqlite_core_1.integer)('id').primaryKey({ autoIncrement: true }),
    uuid: (0, sqlite_core_1.text)('uuid').unique().notNull(),
    projectId: (0, sqlite_core_1.text)('project_id').notNull(),
    startedAt: (0, sqlite_core_1.integer)('started_at').notNull(),
    endedAt: (0, sqlite_core_1.integer)('ended_at'),
    metadata: (0, sqlite_core_1.text)('metadata'),
});
exports.observations = (0, sqlite_core_1.sqliteTable)('observations', {
    id: (0, sqlite_core_1.integer)('id').primaryKey({ autoIncrement: true }),
    uuid: (0, sqlite_core_1.text)('uuid').unique().notNull(),
    sessionId: (0, sqlite_core_1.integer)('session_id').notNull(),
    title: (0, sqlite_core_1.text)('title').notNull(),
    content: (0, sqlite_core_1.text)('content').notNull(),
    type: (0, sqlite_core_1.text)('type').notNull(),
    topicKey: (0, sqlite_core_1.text)('topic_key'),
    projectId: (0, sqlite_core_1.text)('project_id').notNull(),
    createdAt: (0, sqlite_core_1.integer)('created_at').notNull(),
    metadata: (0, sqlite_core_1.text)('metadata'),
});
exports.prompts = (0, sqlite_core_1.sqliteTable)('prompts', {
    id: (0, sqlite_core_1.integer)('id').primaryKey({ autoIncrement: true }),
    uuid: (0, sqlite_core_1.text)('uuid').unique().notNull(),
    sessionId: (0, sqlite_core_1.integer)('session_id').notNull(),
    content: (0, sqlite_core_1.text)('content').notNull(),
    projectId: (0, sqlite_core_1.text)('project_id').notNull(),
    createdAt: (0, sqlite_core_1.integer)('created_at').notNull(),
    metadata: (0, sqlite_core_1.text)('metadata'),
});
exports.projects = (0, sqlite_core_1.sqliteTable)('projects', {
    id: (0, sqlite_core_1.integer)('id').primaryKey({ autoIncrement: true }),
    name: (0, sqlite_core_1.text)('name').unique().notNull(),
    createdAt: (0, sqlite_core_1.integer)('created_at').notNull(),
    metadata: (0, sqlite_core_1.text)('metadata'),
});
