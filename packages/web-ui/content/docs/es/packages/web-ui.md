# Paquete Web UI

`@slorenzot/memento-web-ui` — Dashboard Next.js 15 App Router para explorar y gestionar la memoria.

## Stack tecnológico

- **Framework:** Next.js 15 (App Router, Server Components)
- **React:** 19
- **Estilos:** Tailwind CSS 4 con variables CSS
- **Estado:** Zustand 5
- **Iconos:** Lucide React
- **Base de datos:** `bun:sqlite` con polyfill `better-sqlite3` para webpack

## Ejecución

```bash
# Desarrollo
cd packages/web-ui
bun dev

# Build
bun build

# Producción
bun start
```

Puerto default: `8086`

## Estructura de rutas

| Ruta | Descripción |
|------|-------------|
| `/` | Dashboard con estadísticas y actividad reciente |
| `/observations` | Lista y filtrado de observaciones |
| `/observations/[id]` | Vista de detalle de observación |
| `/observations/[id]/edit` | Editar observación |
| `/observations/new` | Crear nueva observación |
| `/search` | Buscar observaciones |
| `/timeline` | Línea de tiempo cronológica |
| `/sessions` | Lista de sesiones |
| `/sessions/[id]` | Detalle de sesión |
| `/settings` | Configuración de la aplicación |
| `/docs` | Documentación |

## Rutas API

Todas las rutas API están bajo `/api/` y usan Next.js Route Handlers. Ver [Introducción API](/es/docs/api/introduction) para detalles.

## Sistema de diseño

La Web UI usa un sistema de diseño neutral y minimal definido en variables CSS (`globals.css`):

- **Colores:** Paleta neutral (blanco/negro/grises), sin colores de marca
- **Modo oscuro:** Soporte nativo vía clase `.dark`
- **Tipografía:** Stack de fuentes del sistema, monospace para código
- **Contenedor:** Ancho máximo 896px
- **Bordes redondeados:** 6px (sm), 8px (md), 12px (lg)

## Ver también

- [Introducción API](/es/docs/api/introduction) — endpoints REST
- [Arquitectura](/es/docs/architecture/database) — diseño de base de datos
