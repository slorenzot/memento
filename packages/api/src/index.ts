#!/usr/bin/env node

import type { Server } from 'node:http';

import { MemoryEngine } from "@slorenzot/memento-core";
import type { Observation } from "@slorenzot/memento-core";
import express from "express";
import cors from "cors";
import helmet from "helmet";

export class APIServer {
  private port: number;
  private memory: MemoryEngine;
  private app: express.Application;
  private server: Server | null = null;

  constructor(port: number, dbPath: string) {
    this.port = port;
    this.memory = new MemoryEngine(dbPath);
    if (this.memory.isHealthy()) {
      console.error(`✓ Database initialized successfully at: ${dbPath}`);
    } else {
      const initError = this.memory.getInitError();
      console.error(`✗ Failed to initialize database at ${dbPath}:`, initError?.message);
    }
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware() {
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(express.json());
  }

  private setupRoutes() {
    this.app.get("/api/health", (_req, res) => {
      res.json({ status: "healthy", version: "0.2.0" });
    });

    this.app.get("/api/observations", async (req, res) => {
      try {
        const result = await this.memory.search({
          query: req.query.query as string,
          type: req.query.type as Observation['type'] | undefined,
          projectId: req.query.project_id as string,
          limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
          offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
        });
        res.json(result);
      } catch (error: unknown) {
        res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
      }
    });

    this.app.get("/api/observations/:id", async (req, res) => {
      try {
        const obs = await this.memory.getObservation(parseInt(req.params.id));
        if (!obs) { res.status(404).json({ error: "Not found" }); return; }
        res.json(obs);
      } catch (error: unknown) {
        res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
      }
    });

    this.app.post("/api/observations", async (req, res) => {
      try {
        const obs = await this.memory.createObservation({
          sessionId: req.body.sessionId || 1,
          title: req.body.title,
          content: req.body.content,
          type: req.body.type || "note",
          topicKey: req.body.topicKey || null,
          projectId: req.body.projectId || "default",
          metadata: req.body.metadata || {},
        });
        res.status(201).json(obs);
      } catch (error: unknown) {
        res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
      }
    });

    this.app.delete("/api/observations/:id", async (req, res) => {
      try {
        await this.memory.deleteObservation(parseInt(req.params.id));
        res.json({ success: true });
      } catch (error: unknown) {
        res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
      }
    });
  }

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.port, () => {
        console.log(`Memento API server running on port ${this.port}`);
        resolve();
      });
    });
  }

  close(): void {
    if (this.server) this.server.close();
    this.memory.close();
  }
}

// Auto-start when run directly
if (require.main === module) {
  const port = parseInt(process.env.API_PORT || "3000", 10);
  const dbPath = process.env.DATABASE_PATH || "./data/memento.db";
  const server = new APIServer(port, dbPath);

  process.on("SIGINT", () => { server.close(); process.exit(0); });
  process.on("SIGTERM", () => { server.close(); process.exit(0); });

  server.start().catch((err) => {
    console.error("Failed to start:", err);
    process.exit(1);
  });
}
