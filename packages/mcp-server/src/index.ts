#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// ============================================
// IN-MEMORY STORAGE
// ============================================

interface Observation {
  id: number;
  uuid: string;
  sessionId: number;
  title: string;
  content: string;
  type: "decision" | "bug" | "discovery" | "note";
  topicKey: string | null;
  projectId: string;
  createdAt: string;
  metadata: Record<string, unknown>;
}

interface Session {
  id: number;
  uuid: string;
  projectId: string;
  startedAt: string;
  endedAt: string | null;
  metadata: Record<string, unknown>;
}

let observations: Observation[] = [];
let sessions: Session[] = [];
let nextObsId = 1;
let nextSessionId = 1;
let activeSession: Session | null = null;

function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ============================================
// MCP SERVER
// ============================================

const server = new McpServer({
  name: "memento-mcp-server",
  version: "0.3.0",
});

// ============================================
// TOOLS
// ============================================

server.tool(
  "mem_save",
  "Save an observation to memory. Types: decision, bug, discovery, note.",
  {
    title: z.string().describe("Title of the observation"),
    content: z.string().describe("Content of the observation"),
    type: z
      .enum(["decision", "bug", "discovery", "note"])
      .optional()
      .describe("Type of observation (default: note)"),
    topic_key: z.string().optional().describe("Topic key for grouping"),
    project_id: z.string().optional().describe("Project identifier"),
    metadata: z.record(z.unknown()).optional().describe("Additional metadata"),
  },
  async ({ title, content, type, topic_key, project_id, metadata }) => {
    const sessionId = activeSession
      ? activeSession.id
      : (() => {
          const s: Session = {
            id: nextSessionId++,
            uuid: generateUUID(),
            projectId: project_id || "default",
            startedAt: new Date().toISOString(),
            endedAt: null,
            metadata: {},
          };
          sessions.push(s);
          activeSession = s;
          return s.id;
        })();

    const obs: Observation = {
      id: nextObsId++,
      uuid: generateUUID(),
      sessionId,
      title,
      content,
      type: type || "note",
      topicKey: topic_key || null,
      projectId: project_id || "default",
      createdAt: new Date().toISOString(),
      metadata: metadata || {},
    };
    observations.push(obs);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            { id: obs.id, uuid: obs.uuid, success: true },
            null,
            2
          ),
        },
      ],
    };
  }
);

server.tool(
  "mem_search",
  "Search observations using text matching.",
  {
    query: z.string().optional().describe("Search query"),
    type: z.enum(["decision", "bug", "discovery", "note"]).optional(),
    project_id: z.string().optional(),
    topic_key: z.string().optional(),
    limit: z.number().optional(),
    offset: z.number().optional(),
  },
  async ({ query, type, project_id, topic_key, limit, offset }) => {
    let filtered = [...observations];
    if (query) {
      const q = query.toLowerCase();
      filtered = filtered.filter(
        (o) =>
          o.title.toLowerCase().includes(q) ||
          o.content.toLowerCase().includes(q)
      );
    }
    if (type) filtered = filtered.filter((o) => o.type === type);
    if (project_id)
      filtered = filtered.filter((o) => o.projectId === project_id);
    if (topic_key)
      filtered = filtered.filter((o) => o.topicKey === topic_key);

    const off = offset || 0;
    const lim = limit || 20;

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              observations: filtered.slice(off, off + lim),
              total: filtered.length,
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

server.tool(
  "mem_get_observation",
  "Get a specific observation by ID.",
  {
    id: z.number().describe("Observation ID"),
  },
  async ({ id }) => {
    const obs = observations.find((o) => o.id === id);
    if (!obs) throw new Error(`Observation ${id} not found`);
    return {
      content: [{ type: "text", text: JSON.stringify(obs, null, 2) }],
    };
  }
);

server.tool(
  "mem_update",
  "Update an existing observation.",
  {
    id: z.number().describe("Observation ID"),
    title: z.string().optional(),
    content: z.string().optional(),
    type: z.enum(["decision", "bug", "discovery", "note"]).optional(),
    topic_key: z.string().optional(),
  },
  async ({ id, title, content, type, topic_key }) => {
    const idx = observations.findIndex((o) => o.id === id);
    if (idx === -1) throw new Error(`Observation ${id} not found`);
    if (title) observations[idx].title = title;
    if (content) observations[idx].content = content;
    if (type) observations[idx].type = type;
    if (topic_key) observations[idx].topicKey = topic_key;
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            { id: observations[idx].id, success: true },
            null,
            2
          ),
        },
      ],
    };
  }
);

server.tool(
  "mem_delete",
  "Delete an observation.",
  {
    id: z.number().describe("Observation ID"),
  },
  async ({ id }) => {
    const idx = observations.findIndex((o) => o.id === id);
    if (idx === -1) throw new Error(`Observation ${id} not found`);
    observations.splice(idx, 1);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ id, success: true }, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "mem_session_start",
  "Start a new memory session.",
  {
    project_id: z.string().describe("Project identifier"),
    metadata: z.record(z.unknown()).optional(),
  },
  async ({ project_id, metadata }) => {
    const s: Session = {
      id: nextSessionId++,
      uuid: generateUUID(),
      projectId: project_id,
      startedAt: new Date().toISOString(),
      endedAt: null,
      metadata: metadata || {},
    };
    sessions.push(s);
    activeSession = s;
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            { id: s.id, uuid: s.uuid, success: true },
            null,
            2
          ),
        },
      ],
    };
  }
);

server.tool(
  "mem_session_end",
  "End the current active session.",
  {},
  async () => {
    if (!activeSession) throw new Error("No active session");
    activeSession.endedAt = new Date().toISOString();
    const ended = { ...activeSession };
    activeSession = null;
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            { id: ended.id, uuid: ended.uuid, endedAt: ended.endedAt, success: true },
            null,
            2
          ),
        },
      ],
    };
  }
);

server.tool(
  "mem_list_sessions",
  "List all sessions.",
  {
    project_id: z.string().optional(),
    limit: z.number().optional(),
  },
  async ({ project_id, limit }) => {
    let filtered = [...sessions];
    if (project_id) filtered = filtered.filter((s) => s.projectId === project_id);
    const lim = limit || 20;
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            { sessions: filtered.slice(0, lim), total: filtered.length },
            null,
            2
          ),
        },
      ],
    };
  }
);

server.tool(
  "mem_get_session",
  "Get a specific session by ID.",
  {
    id: z.number().describe("Session ID"),
  },
  async ({ id }) => {
    const s = sessions.find((s) => s.id === id);
    if (!s) throw new Error(`Session ${id} not found`);
    return {
      content: [{ type: "text", text: JSON.stringify(s, null, 2) }],
    };
  }
);

server.tool(
  "mem_timeline",
  "Get chronological timeline of observations.",
  {
    project_id: z.string().optional(),
    limit: z.number().optional(),
    offset: z.number().optional(),
  },
  async ({ project_id, limit, offset }) => {
    let filtered = [...observations];
    if (project_id) filtered = filtered.filter((o) => o.projectId === project_id);
    filtered.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    const off = offset || 0;
    const lim = limit || 20;
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            { observations: filtered.slice(off, off + lim), total: filtered.length },
            null,
            2
          ),
        },
      ],
    };
  }
);

server.tool(
  "mem_stats",
  "Get memory statistics.",
  {},
  async () => {
    const byType: Record<string, number> = {};
    const byProject: Record<string, number> = {};
    for (const o of observations) {
      byType[o.type] = (byType[o.type] || 0) + 1;
      byProject[o.projectId] = (byProject[o.projectId] || 0) + 1;
    }
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              totalObservations: observations.length,
              totalSessions: sessions.length,
              byType,
              byProject,
              activeSession: activeSession
                ? { id: activeSession.id, projectId: activeSession.projectId }
                : null,
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

server.tool(
  "mem_health",
  "Check system health.",
  {},
  async () => {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              status: "healthy",
              version: "0.3.0",
              storage: "in-memory",
              observations: observations.length,
              sessions: sessions.length,
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

server.tool(
  "mem_config",
  "Get server configuration.",
  {},
  async () => {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              name: "memento-mcp-server",
              version: "0.3.0",
              storage: "in-memory",
              tools: 13,
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

// ============================================
// START SERVER
// ============================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Memento MCP Server v0.3.0 started");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
