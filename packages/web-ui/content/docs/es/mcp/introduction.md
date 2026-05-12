# Introducción a MCP

Memento se integra con agentes de codificación de IA a través del **Model Context Protocol (MCP)**. Esta es la forma principal en que los agentes de IA interactúan con Memento.

## ¿Qué es MCP?

MCP es un protocolo que permite a las aplicaciones de IA (Claude, Cursor, OpenCode, etc.) llamar herramientas provistas por servidores externos. El servidor MCP de Memento expone 21 herramientas para la gestión de memoria.

## Arquitectura

```
┌─────────────┐     Protocolo MCP     ┌──────────────────┐     bun:sqlite     ┌──────────┐
│  Agente IA   │ ◀──────────────────▶ │  memento-mcp     │ ◀────────────────▶ │ SQLite   │
│  (Claude,    │    JSON-RPC sobre    │  server          │    acceso directo  │ Base de  │
│  Cursor,     │    stdio/SSE         │  (21 tools)      │                    │ datos    │
│  OpenCode)   │                      │                  │                    │ (WAL)    │
└─────────────┘                      └──────────────────┘                    └──────────┘
```

## Configuración

### OpenCode

Agrega a tu configuración de OpenCode (`~/.config/opencode/config.json`):

```json
{
  "mcpServers": {
    "memento": {
      "command": "bun",
      "args": ["run", "--bun", "mcp"],
      "cwd": "/ruta/a/memento"
    }
  }
}
```

O instala globalmente:

```bash
bun install -g @slorenzot/memento-mcp-server
memento-mcp
```

### Claude Desktop

Agrega a `~/.claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "memento": {
      "command": "bun",
      "args": ["x", "@slorenzot/memento-mcp-server"]
    }
  }
}
```

### Cursor

Agrega a tu configuración MCP de Cursor:

```json
{
  "mcpServers": {
    "memento": {
      "command": "bun",
      "args": ["x", "@slorenzot/memento-mcp-server"],
      "env": {
        "MEMENTO_PROJECT": "mi-proyecto"
      }
    }
  }
}
```

## Variables de Entorno

| Variable | Por defecto | Descripción |
|----------|-------------|-------------|
| `MEMENTO_DB_PATH` | `./data/memento.db` | Ruta del archivo de base de datos |
| `MEMENTO_PROJECT` | `default` | ID de proyecto por defecto |
| `MEMENTO_LOG_LEVEL` | `info` | Nivel de verbosidad del log |

## Prueba Rápida

Después de configurar, pregúntale a tu agente de IA:

> "Busca en mi memoria memento alguna observación sobre autenticación"

Si la configuración es correcta, el agente llamará a `mem_search` y devolverá resultados.

## Ver También

- [Referencia de Herramientas](/es/docs/mcp/tools-reference) — las 21 herramientas con parámetros y ejemplos
- [Inicio Rápido](/es/docs/quickstart) — guía de inicio
