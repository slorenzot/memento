# Observaciones

Las observaciones son la unidad de datos principal de Memento. Representan un conocimiento capturado durante una sesión de código — una decisión, una corrección de bug, un descubrimiento, un patrón, o cualquier información no obvia que valga la pena recordar.

## Anatomía de una observación

```
┌─────────────────────────────────────────────┐
│  Observación #42                              │
│  Título: "Corregí query N+1 en UserList"     │
│  Tipo: bug                                    │
│  Topic: bugfix/n1-query-userlist              │
│  Proyecto: my-project                         │
│  Ámbito: project                              │
│  Fijada: false       Solo lectura: false      │
│  Creada: 2025-01-15T10:30:00Z                │
│  Sesión: #7                                   │
├─────────────────────────────────────────────┤
│  ## Qué                                       │
│  El componente UserList ejecutaba una query   │
│  separada por cada perfil de usuario...       │
│                                               │
│  ## Por qué                                   │
│  Degradación de performance con 100+ usuarios │
│                                               │
│  ## Dónde                                     │
│  src/components/UserList.tsx                   │
│                                               │
│  ## Aprendido                                 │
│  El patrón DataLoader resuelve N+1 en GraphQL │
└─────────────────────────────────────────────┘
```

## 10 tipos de observación

| Tipo | Propósito | Ejemplo |
|------|-----------|---------|
| `decision` | Decisiones de arquitectura o diseño | "Elegí SQLite en vez de PostgreSQL" |
| `bug` | Correcciones de bugs con causa raíz | "Corregí query N+1 en UserList" |
| `discovery` | Hallazgos no obvios sobre el codebase | "Caracteres especiales FTS5 necesitan escape" |
| `note` | Información general | "El rate limit de la API es 100 req/min" |
| `summary` | Resúmenes de sesión (auto-generados) | "Resumen de sesión — 2025-01-15" |
| `learning` | Lecciones extraídas | "Siempre usar DataLoader para carga batch" |
| `pattern` | Convenciones establecidas | "Todas las rutas API siguen /api/{recurso}" |
| `architecture` | Decisiones de diseño del sistema | "Monorepo con bun workspaces" |
| `config` | Cambios de configuración | "Configurar modo WAL para SQLite" |
| `preference` | Preferencias del usuario | "Usar formato conventional commits" |

## Formato del contenido

El contenido de las observaciones sigue un formato estructurado:

```markdown
## Qué
Una oración describiendo qué se hizo.

## Por qué
Qué motivó esto (pedido del usuario, bug, performance, etc.).

## Dónde
Archivos o rutas afectados.

## Aprendido
Gotchas, casos edge, cosas que sorprendieron.
```

Esto es una convención, no obligatorio — el campo de contenido acepta cualquier texto. Pero seguir este formato hace las observaciones más útiles y fáciles de buscar.

## Topic Keys

Los topic keys agrupan observaciones relacionadas. Usá keys estables y jerárquicos:

```
architecture/auth-model
architecture/persistence
bugfix/n1-query-userlist
pattern/api-routing
config/deployment
```

Los topic keys permiten:
- **Agrupar** — encontrar todas las observaciones sobre un tema
- **Mergear** — consolidar observaciones duplicadas por tema
- **Upsertar** — actualizar un tema en evolución en vez de crear duplicados

## Ámbitos (Scopes)

Las observaciones pueden estar en:

- **`project`** (default) — específicas de un codebase
- **`personal`** — preferencias y convenciones cross-project

Las observaciones personales aparecen en todos los proyectos. Usalas para preferencias de herramientas, estilo de código, o conocimiento general.

## Fijar (Pin) y Solo lectura

- Las observaciones **fijadas** siempre se inyectan en el contexto del agente de IA
- Las observaciones de **solo lectura** no pueden ser modificadas por agentes de IA (solo usuarios vía CLI)

Usá fijar con moderación — las observaciones fijadas consumen tokens en cada conversación.

## Ver también

- [Sesiones](/es/docs/core-concepts/sessions) — agrupá observaciones por conversación
- [Búsqueda](/es/docs/core-concepts/search) — encontrá observaciones con FTS5
- [Herramientas MCP](/es/docs/mcp/tools-reference) — `mem_save`, `mem_search`, `mem_get_observation`
