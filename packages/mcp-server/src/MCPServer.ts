import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolResult,
} from '@modelcontextprotocol/sdk/types.js';
import { MemoryEngine } from '@memento/core';
import type { Observation, Session } from '@memento/core';

export class MCPServer {
  private server: Server;
  private memory: MemoryEngine;
  private activeSession: Session | null = null;

  constructor(dbPath: string = './data/memento.db') {
    this.server = new Server({
      name: 'memento-server',
      version: '0.1.0',
    });
    this.memory = new MemoryEngine(dbPath);
    this.setupHandlers();
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: this.getToolDefinitions(),
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      return this.handleToolCall(request.params.name, request.params.arguments as Record<string, unknown>);
    });
  }

  private getToolDefinitions() {
    return [
      {
        name: 'mem_save',
        description: 'Save an observation to memory',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Title of the observation' },
            content: { type: 'string', description: 'Content of the observation' },
            type: {
              type: 'string',
              enum: ['decision', 'bug', 'discovery', 'note'],
              description: 'Type of observation',
            },
            topic_key: { type: 'string', description: 'Topic key for grouping' },
            project_id: { type: 'string', description: 'Project identifier' },
            metadata: { type: 'object', description: 'Additional metadata' },
          },
          required: ['title', 'content', 'type', 'project_id'],
        },
      },
      {
        name: 'mem_update',
        description: 'Update an existing observation',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Observation ID' },
            title: { type: 'string', description: 'New title' },
            content: { type: 'string', description: 'New content' },
            topic_key: { type: 'string', description: 'New topic key' },
            metadata: { type: 'object', description: 'New metadata' },
          },
          required: ['id'],
        },
      },
      {
        name: 'mem_delete',
        description: 'Delete an observation',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Observation ID' },
            soft: { type: 'boolean', description: 'Soft delete (default: true)' },
          },
          required: ['id'],
        },
      },
      {
        name: 'mem_search',
        description: 'Search observations',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Full-text search query' },
            type: {
              type: 'string',
              enum: ['decision', 'bug', 'discovery', 'note'],
              description: 'Filter by type',
            },
            project_id: { type: 'string', description: 'Filter by project' },
            topic_key: { type: 'string', description: 'Filter by topic' },
            limit: { type: 'number', description: 'Result limit' },
            offset: { type: 'number', description: 'Result offset' },
          },
        },
      },
      {
        name: 'mem_get_observation',
        description: 'Get observation by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Observation ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'mem_save_prompt',
        description: 'Save a user prompt',
        inputSchema: {
          type: 'object',
          properties: {
            content: { type: 'string', description: 'Prompt content' },
            project_id: { type: 'string', description: 'Project identifier' },
            metadata: { type: 'object', description: 'Additional metadata' },
          },
          required: ['content', 'project_id'],
        },
      },
      {
        name: 'mem_session_summary',
        description: 'Get current session summary',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'mem_context',
        description: 'Get recent context',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'string', description: 'Filter by project' },
            limit: { type: 'number', description: 'Number of recent items' },
          },
        },
      },
      {
        name: 'mem_timeline',
        description: 'Get timeline of observations',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'string', description: 'Filter by project' },
            limit: { type: 'number', description: 'Result limit' },
            offset: { type: 'number', description: 'Result offset' },
          },
        },
      },
      {
        name: 'mem_stats',
        description: 'Get memory statistics',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'mem_session_start',
        description: 'Start a new session',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'string', description: 'Project identifier' },
            metadata: { type: 'object', description: 'Session metadata' },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'mem_session_end',
        description: 'End current session',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'mem_suggest_topic_key',
        description: 'Suggest a topic key based on content',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Observation title' },
            content: { type: 'string', description: 'Observation content' },
          },
          required: ['title'],
        },
      },
      {
        name: 'mem_capture_passive',
        description: 'Passively capture context',
        inputSchema: {
          type: 'object',
          properties: {
            observations: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of observations to capture',
            },
            project_id: { type: 'string', description: 'Project identifier' },
          },
        },
      },
    ];
  }

  private async handleToolCall(name: string, args: Record<string, unknown>): Promise<CallToolResult> {
    try {
      let result: unknown;

      switch (name) {
        case 'mem_save': {
          const projectId = args.project_id as string;
          const sessionId = await this.getOrCreateSession(projectId);
          const observation = await this.memory.createObservation({
            sessionId,
            title: args.title as string,
            content: args.content as string,
            type: args.type as Observation['type'],
            topicKey: (args.topic_key as string) || null,
            projectId,
            metadata: (args.metadata as Record<string, unknown>) || {},
          });
          result = { id: observation.id, uuid: observation.uuid, success: true };
          break;
        }

        case 'mem_update': {
          const observation = await this.memory.updateObservation(args.id as number, {
            title: args.title as string | undefined,
            content: args.content as string | undefined,
            topicKey: args.topic_key as string | undefined,
            metadata: args.metadata as Record<string, unknown> | undefined,
          });
          result = { id: observation.id, success: true };
          break;
        }

        case 'mem_delete': {
          await this.memory.deleteObservation(args.id as number, args.soft as boolean ?? true);
          result = { id: args.id, success: true };
          break;
        }

        case 'mem_search': {
          const searchResult = await this.memory.search({
            query: args.query as string | undefined,
            type: args.type as Observation['type'] | undefined,
            projectId: args.project_id as string | undefined,
            topicKey: args.topic_key as string | undefined,
            limit: args.limit as number | undefined,
            offset: args.offset as number | undefined,
          });
          result = {
            observations: searchResult.observations.map((o) => ({
              id: o.id,
              uuid: o.uuid,
              title: o.title,
              content: o.content,
              type: o.type,
              topicKey: o.topicKey,
              projectId: o.projectId,
              createdAt: o.createdAt.toISOString(),
            })),
            total: searchResult.total,
          };
          break;
        }

        case 'mem_get_observation': {
          const observation = await this.memory.getObservation(args.id as number);
          if (!observation) {
            throw new Error('Observation not found');
          }
          result = {
            id: observation.id,
            uuid: observation.uuid,
            title: observation.title,
            content: observation.content,
            type: observation.type,
            topicKey: observation.topicKey,
            projectId: observation.projectId,
            createdAt: observation.createdAt.toISOString(),
            metadata: observation.metadata,
          };
          break;
        }

        case 'mem_save_prompt': {
          if (!this.activeSession) {
            throw new Error('No active session');
          }
          const projectId = args.project_id as string;
          const prompt = await this.memory.savePrompt({
            sessionId: this.activeSession.id,
            content: args.content as string,
            projectId,
            metadata: (args.metadata as Record<string, unknown>) || {},
          });
          result = { id: prompt.id, uuid: prompt.uuid, success: true };
          break;
        }

        case 'mem_session_summary': {
          if (!this.activeSession) {
            throw new Error('No active session');
          }
          const searchResult = await this.memory.search({
            projectId: this.activeSession.projectId,
            limit: 10,
          });
          result = {
            session: {
              id: this.activeSession.id,
              uuid: this.activeSession.uuid,
              projectId: this.activeSession.projectId,
              startedAt: this.activeSession.startedAt.toISOString(),
              endedAt: this.activeSession.endedAt?.toISOString(),
            },
            recentObservations: searchResult.observations.map((o) => ({
              id: o.id,
              title: o.title,
              type: o.type,
              createdAt: o.createdAt.toISOString(),
            })),
          };
          break;
        }

        case 'mem_context': {
          const limit = (args.limit as number) || 20;
          const searchResult = await this.memory.search({
            projectId: args.project_id as string | undefined,
            limit,
          });
          result = {
            observations: searchResult.observations.map((o) => ({
              id: o.id,
              title: o.title,
              type: o.type,
              content: o.content.slice(0, 200),
              createdAt: o.createdAt.toISOString(),
            })),
            total: searchResult.total,
          };
          break;
        }

        case 'mem_timeline': {
          const searchResult = await this.memory.search({
            projectId: args.project_id as string | undefined,
            limit: args.limit as number | undefined,
            offset: args.offset as number | undefined,
          });
          result = {
            observations: searchResult.observations.map((o) => ({
              id: o.id,
              title: o.title,
              type: o.type,
              topicKey: o.topicKey,
              createdAt: o.createdAt.toISOString(),
            })),
            total: searchResult.total,
          };
          break;
        }

        case 'mem_stats': {
          const allResult = await this.memory.search({});
          const byType = allResult.observations.reduce(
            (acc, obs) => {
              acc[obs.type] = (acc[obs.type] || 0) + 1;
              return acc;
            },
            {} as Record<string, number>
          );
          const byProject = allResult.observations.reduce(
            (acc, obs) => {
              acc[obs.projectId] = (acc[obs.projectId] || 0) + 1;
              return acc;
            },
            {} as Record<string, number>
          );
          result = {
            totalObservations: allResult.total,
            byType,
            byProject,
            activeSession: this.activeSession
              ? {
                  id: this.activeSession.id,
                  projectId: this.activeSession.projectId,
                  startedAt: this.activeSession.startedAt.toISOString(),
                }
              : null,
          };
          break;
        }

        case 'mem_session_start': {
          this.activeSession = await this.memory.createSession({
            projectId: args.project_id as string,
            endedAt: null,
            metadata: (args.metadata as Record<string, unknown>) || {},
          });
          result = {
            id: this.activeSession.id,
            uuid: this.activeSession.uuid,
            success: true,
          };
          break;
        }

        case 'mem_session_end': {
          if (!this.activeSession) {
            throw new Error('No active session');
          }
          this.activeSession = await this.memory.endSession(this.activeSession.id);
          result = {
            id: this.activeSession.id,
            uuid: this.activeSession.uuid,
            endedAt: this.activeSession.endedAt?.toISOString(),
            success: true,
          };
          break;
        }

        case 'mem_suggest_topic_key': {
          const title = args.title as string;
          const content = args.content as string;
          const text = `${title} ${content || ''}`;
          const words = text.toLowerCase().split(/\s+/);
          const keywords = words.filter((w) => w.length > 3);
          const topicKey = keywords.slice(0, 3).join('-').toLowerCase();
          result = { topicKey, confidence: 0.8 };
          break;
        }

        case 'mem_capture_passive': {
          const projectId = args.project_id as string;
          const observations = args.observations as string[];
          const sessionId = await this.getOrCreateSession(projectId);

          const created = [];
          for (const obsText of observations) {
            const obs = await this.memory.createObservation({
              sessionId,
              title: `Passive Capture ${created.length + 1}`,
              content: obsText,
              type: 'note',
              topicKey: null,
              projectId,
              metadata: { passive: true },
            });
            created.push({ id: obs.id, uuid: obs.uuid });
          }
          result = { observations: created, success: true };
          break;
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        isError: false,
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }, null, 2),
          },
        ],
        isError: true,
      };
    }
  }

  private async getOrCreateSession(projectId: string): Promise<number> {
    if (this.activeSession) {
      return this.activeSession.id;
    }
    this.activeSession = await this.memory.createSession({
      projectId,
      endedAt: null,
      metadata: {},
    });
    return this.activeSession.id;
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport); // eslint-disable-line @typescript-eslint/require-await
  }

  close() {
    this.memory.close();
  }
}
