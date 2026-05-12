# Paquete TUI

`@slorenzot/memento-tui` — Interfaz de usuario para terminal construida con Ink y React.

## Stack tecnológico

- **Framework:** Ink (React para CLI)
- **Módulo:** ESM
- **Estado:** React hooks (`useMemento`, `useSessions`, `useSearch`)
- **Backend:** `@slorenzot/memento-core`

## Instalación

```bash
bun add -g @slorenzot/memento-tui
memento-tui
```

## Vistas

| Vista | Descripción |
|-------|-------------|
| Dashboard | Resumen de estadísticas |
| Observaciones | Lista y exploración de observaciones |
| Sesiones | Lista de sesiones con detalles |
| Búsqueda | Búsqueda con resultados en tiempo real |
| Proyectos | Resumen de proyectos |
| Detalle | Vista de detalle de observación |

## Arquitectura

```
TUI (src/)
  ├── views/       — Componentes de pantalla (Dashboard, ObservationsList, etc.)
  ├── components/  — UI compartida (Badge, StatusBar, ListSelector, etc.)
  ├── hooks/       — Hooks de datos (useMemento, useSessions, useSearch)
  └── theme.ts     — Tema de colores
```

## Ver también

- [Paquete Core](/es/docs/packages/core) — engine subyacente
- [Paquete CLI](/es/docs/packages/cli) — alternativa CLI más simple
