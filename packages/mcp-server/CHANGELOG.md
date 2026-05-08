# Changelog

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [1.1.0] - 2026-05-07

### Features

- **mcp-server:** initialize Memento — persistent memory engine for AI agents
- **mcp-server:** add enhanced mem_config with ASCII banner
- **mcp-server:** add flexible config system with .mementorc and project-scoped storage
- **core,mcp-server:** add project-specific configuration with .mementorc
- **core,mcp-server:** add robust error handling and auto-create database directories
- **mcp-server:** bundle OpenCode slash commands with install-skill (#17)
- **mcp-server:** clean text responses for all tools with project context (#22)
- **core,mcp-server:** add mem_export and mem_import tools (#24)
- **core,mcp-server:** add mem_reset tool (#25)
- **mcp:** return human-readable messages from ACTION tools (#46)
- **mcp:** replace JSON responses with human-readable Markdown (#48)

### Bug Fixes

- **mcp-server:** migrate to SQLite persistent storage from in-memory
- **mcp-server:** corregir ejecutable npx para paquete MCP server
- corregir ejecución del paquete MCP server con npm run
- corregir todos los paquetes NPM para funcionar con Node.js
- **mcp-server:** replace JSON responses with clean text confirmations on write tools (#19)
- **mcp-server:** mem_capture_passive dedup against existing DB learnings
