# Estructura del Monorepo

Memento está organizado como un monorepo de workspaces de Bun.

## Layout

```
memento/
├── packages/
│   ├── core/           → @slorenzot/memento-core
│   ├── mcp-server/     → @slorenzot/memento-mcp-server
│   ├── cli/            → @slorenzot/memento-cli
│   ├── api/            → @slorenzot/memento-api (deprecado)
│   └── web-ui/         → @slorenzot/memento-web-ui
├── apps/
│   └── tui/            → @slorenzot/memento-tui
├── docs/               → Documentación y resultados de comparación
├── package.json        → Configuración del workspace raíz
└── AGENTS.md           → Instrucciones para agentes de IA
```

## Flujo de Dependencias

```
core → mcp-server → cli / tui → web-ui
```

- **core** tiene cero dependencias externas (solo `bun:sqlite`)
- **mcp-server** depende de `core` y `@modelcontextprotocol/sdk`
- **cli** depende de `core`
- **web-ui** depende de `core` (vía Route Handlers)
- **tui** depende de `core`

## Pipeline de Build

```bash
# Compilar todos los paquetes
bun run --filter '*' build

# Compilar un paquete específico
bun run --filter @slorenzot/memento-core build

# Ejecutar todos los tests (compila primero)
bun test
```

### Salidas de Build

| Paquete | Herramienta de Build | Salida |
|---------|---------------------|--------|
| core | `tsc` | `dist/` (CJS) |
| mcp-server | `tsc` | `dist/` (CJS) |
| cli | `tsc` | `dist/` (CJS) |
| web-ui | `next build` | `.next/` |
| tui | `tsc` | `dist/` (ESM) |

## Versiones de Paquetes

| Paquete | Versión | Binario |
|---------|---------|---------|
| @slorenzot/memento-core | 1.0.0 | — |
| @slorenzot/memento-mcp-server | 1.0.0 | `memento-mcp` |
| @slorenzot/memento-cli | 1.0.0 | `memento` |
| @slorenzot/memento-web-ui | 0.2.0 | — |
| @slorenzot/memento-tui | 0.1.0 | `memento-tui` |

## Formatos de Módulo

| Paquete | Formato | Por qué |
|---------|---------|---------|
| core, mcp-server, cli | CJS | Compatibilidad con `bun:sqlite` |
| web-ui | Next.js | App Router con Server Components |
| tui | ESM | Ink requiere ESM |

## Aliases de Workspace

Las importaciones internas usan aliases `@memento/*`:

```typescript
// En web-ui
import { MemoryEngine } from '@slorenzot/memento-core';
```

Máximo 2 niveles de imports relativos (`../../`). Usa referencias de workspace para imports entre paquetes.

## Ver También

- [Paquete Core](/es/docs/packages/core) — detalles del motor
- [Arquitectura de Base de Datos](/es/docs/architecture/database) — diseño SQLite
