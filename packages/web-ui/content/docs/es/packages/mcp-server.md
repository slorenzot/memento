# Paquete MCP Server

`@slorenzot/memento-mcp-server` — Servidor Model Context Protocol que expone 21 herramientas para integración con agentes de IA.

## Instalación

```bash
bun add @slorenzot/memento-mcp-server
```

## Ejecución

```bash
# Iniciar servidor MCP (transporte stdio)
memento-mcp

# O vía bun
bun run mcp
```

## Arquitectura

El servidor MCP envuelve `@slorenzot/memento-core` y expone su funcionalidad como herramientas MCP usando `@modelcontextprotocol/sdk`.

```
MCP Server (tools.ts)
  ├── registerTools() — registra las 21 herramientas
  ├── formatters.ts — formatea respuestas como Markdown
  └── McpServerContext — mantiene engine, proyecto, estado de sesión
```

## Categorías de herramientas

| Categoría | Herramientas |
|-----------|-------------|
| Observaciones | `mem_save`, `mem_search`, `mem_get_observation`, `mem_update`, `mem_replace` |
| Ciclo de vida | `mem_delete`, `mem_merge` |
| Pin y Lock | `mem_pin`, `mem_unpin`, `mem_lock`, `mem_unlock` |
| Sesiones | `mem_session_start`, `mem_session_end`, `mem_session_summary` |
| Conveniencia | `mem_context`, `mem_capture_passive`, `mem_status` |
| Exportación | `mem_export` |
| Journal | `mem_journal_write`, `mem_journal_read`, `mem_journal_search` |

## Testing

El servidor MCP se testea vía:

```bash
bun test packages/mcp-server
```

Los tests usan `registerTools()` con un `McpServerContext` de test para evitar efectos secundarios de import.

## Ver también

- [Introducción MCP](/es/docs/mcp/introduction) — guías de configuración
- [Referencia de herramientas](/es/docs/mcp/tools-reference) — las 21 herramientas
- [Paquete Core](/es/docs/packages/core) — engine subyacente
