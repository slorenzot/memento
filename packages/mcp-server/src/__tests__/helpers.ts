/**
 * helpers.ts — Shared test utilities for MCP server tests.
 *
 * Provides:
 * - createTestContext(): Creates a McpServer + McpServerContext with a temp DB
 * - parseResult(): Parses JSON from MCP tool response content
 * - parseError(): Extracts error + hint from MCP error response
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { MemoryEngine } from '@slorenzot/memento-core';
import { registerTools } from '../tools.js';
import type { McpServerContext } from '../tools.js';
import { mkdirSync, existsSync } from 'fs';
import { join } from 'path';

// ─── Test Database ──────────────────────────────────────────

const TEST_DIR = join(process.cwd(), 'test-data');

function ensureTestDir(): string {
  if (!existsSync(TEST_DIR)) {
    mkdirSync(TEST_DIR, { recursive: true });
  }
  return TEST_DIR;
}

function createTestDbPath(): string {
  ensureTestDir();
  return join(TEST_DIR, `mcp-test-${Date.now()}-${Math.random().toString(36).slice(7)}.db`);
}

// ─── Response Parsing ───────────────────────────────────────

/**
 * Parse the JSON content from an MCP tool response.
 * MCP responses come as { content: [{ type: 'text', text: '...' }] }
 */
interface McpToolResponse {
  content: Array<{ type: 'text'; text: string }>;
}

export function parseResult(response: McpToolResponse): Record<string, unknown> {
  if (!response?.content?.[0]?.text) {
    throw new Error('Invalid MCP response: no content[0].text');
  }
  return JSON.parse(response.content[0].text);
}

/**
 * Parse an error response from an MCP tool.
 * Returns { success, error, hint } from the structured error format.
 */
export function parseError(response: McpToolResponse): { success: false; error: string; hint: string } {
  const parsed = JSON.parse(response.content[0].text) as { success: boolean; error?: string; hint?: string };
  if (parsed.success !== false) {
    throw new Error(`Expected error response but got success: ${JSON.stringify(parsed)}`);
  }
  return parsed as { success: false; error: string; hint: string };
}

// ─── Server Setup ───────────────────────────────────────────

export interface TestSetup {
  server: McpServer;
  ctx: McpServerContext;
  engine: MemoryEngine;
  dbPath: string;
  cleanup: () => void;
}

/**
 * Create a McpServer with all 18 tools registered,
 * backed by a temporary SQLite database.
 */
export function createTestSetup(): TestSetup {
  const dbPath = createTestDbPath();
  const projectId = `test-project-${Date.now()}`;
  const engine = new MemoryEngine(dbPath);

  if (!engine.isHealthy()) {
    throw new Error(`Failed to init test DB at ${dbPath}: ${engine.getInitError()?.message}`);
  }

  const ctx: McpServerContext = {
    engine,
    projectId,
    dbPath,
    activeSessionId: null,
  };

  const server = new McpServer({
    name: 'memento-test',
    version: '1.0.0',
  });

  registerTools(server, ctx);

  return {
    server,
    ctx,
    engine,
    dbPath,
    cleanup: () => {
      engine.close();
    },
  };
}

// ─── Integration Test Setup ─────────────────────────────────

export interface IntegrationSetup {
  client: Client;
  engine: MemoryEngine;
  ctx: McpServerContext;
  dbPath: string;
  cleanup: () => Promise<void>;
}

/**
 * Create a full MCP integration setup with Client + Server
 * connected via InMemoryTransport (no process spawning).
 */
export async function createIntegrationSetup(): Promise<IntegrationSetup> {
  const setup = createTestSetup();

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  // Connect server to one end
  await setup.server.connect(serverTransport);

  // Connect client to the other end
  const client = new Client({
    name: 'test-client',
    version: '1.0.0',
  });
  await client.connect(clientTransport);

  return {
    client,
    engine: setup.engine,
    ctx: setup.ctx,
    dbPath: setup.dbPath,
    cleanup: async () => {
      await client.close();
      setup.cleanup();
    },
  };
}

// ─── Seed Helpers ───────────────────────────────────────────

export async function seedSession(engine: MemoryEngine, projectId: string = 'test-project') {
  return engine.createSession({
    projectId,
    endedAt: null,
    metadata: {},
  });
}

export async function seedObservation(
  engine: MemoryEngine,
  sessionId: number,
  overrides: {
    title?: string;
    content?: string;
    type?: 'decision' | 'bug' | 'discovery' | 'note' | 'summary' | 'learning';
    topicKey?: string | null;
    projectId?: string;
    metadata?: Record<string, unknown>;
  } = {}
) {
  return engine.createObservation({
    sessionId,
    title: overrides.title ?? 'Test Observation',
    content: overrides.content ?? 'Test content for observation',
    type: overrides.type ?? 'note',
    topicKey: overrides.topicKey ?? null,
    projectId: overrides.projectId ?? 'test-project',
    metadata: overrides.metadata ?? {},
  });
}
