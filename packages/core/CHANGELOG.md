# Changelog

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [1.1.0] - 2026-05-07

### Features

- **core:** initialize Memento — persistent memory engine for AI agents
- **core:** migrate to bun:sqlite from better-sqlite3
- **core:** add flexible config system with .mementorc and project-scoped storage
- **core,mcp-server:** add project-specific configuration with .mementorc
- **core,mcp-server:** add robust error handling and auto-create database directories
- **core,mcp-server:** add mem_export and mem_import tools (#24)
- **core,mcp-server:** add mem_reset tool (#25)
- **core:** close Engram gaps — expanded types, personal scope, auto-metadata, SQLITE retry (#38)
- **core:** add append-only journal with auto-metadata and invalidation (#58)

### Bug Fixes

- corregir ejecución del paquete MCP server con npm run
- corregir todos los paquetes NPM para funcionar con Node.js
- **core:** sanitize FTS5 queries to prevent crashes with special chars (#60, #67)
- **core:** replace FTS5 triggers with application-level sync (#73)
- **core:** use nullish coalescing for topicKey in updateObservation (#74)
- **core:** replace manual BEGIN/COMMIT with db.transaction() in importFromJson (#77)
