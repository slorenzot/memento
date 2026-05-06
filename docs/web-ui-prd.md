# PRD: Memento Web UI — Next.js 15 App Router

> **Versión**: 1.0
> **Fecha**: Mayo 2026
> **Autor**: Soulberto Lorenzo
> **Estado**: Aprobado
> **Issue**: #30

---

## 1. Visión y Propósito

### Visión

Construir una interfaz web moderna y funcional para Memento usando Next.js 15 App Router. La UI reemplaza el skeleton actual (Vite + React 18) con una aplicación full-stack que integra el motor de memoria directamente via Server Components y expone una REST API completa via Route Handlers.

### Propósito

- **Interacción visual** con el sistema de memoria persistente
- **Dashboard ejecutivo** con métricas en tiempo real
- **CRUD completo** de observaciones, sesiones y proyectos
- **Búsqueda visual** con FTS5 y ranking BM25
- **REST API** para consumidores externos (CLI, agentes IA, integraciones)
- **Responsive** desktop + mobile con dark mode

### Problema que Resuelve

```
┌───────────────────────────────────────────────────────────────┐
│ HOY:                                                          │
│   - Solo interactúas via CLI (terminal) o MCP (agentes IA)   │
│   - No hay forma visual de ver estado del sistema             │
│   - No hay dashboard para monitorear observaciones            │
│   - web-ui es un skeleton (h1 + p, 8 líneas)                 │
│                                                                │
│ DESPUÉS:                                                       │
│   - Dashboard con stats en tiempo real                        │
│   - Browse, crear, editar, eliminar observaciones             │
│   - Búsqueda full-text visual con resultados rankeados        │
│   - Timeline cronológico agrupado por día                     │
│   - Gestión de sesiones con observaciones vinculadas          │
│   - REST API para cualquier consumidor HTTP                   │
└───────────────────────────────────────────────────────────────┘
```

---

## 2. Decisiones Arquitectónicas

### ADR-1: Next.js 15 App Router (no Vite + React SPA)

**Contexto:** El paquete `web-ui` usa Vite + React 18 como SPA.

**Decisión:** Migrar a Next.js 15 con App Router.

**Razones:**
1. **Server Components** eliminan client-side fetching para reads — datos van directo del engine al HTML
2. **Server Actions** simplifican mutations — formulario → server action → DB, sin API intermedio
3. **Route Handlers** reemplazan `@slorenzot/memento-api` — un solo paquete sirve UI y API
4. **Layouts anidados** con persistencia de estado al navegar
5. **Loading/Error boundaries** nativos por ruta
6. **SEO** no es relevante para herramienta local, pero las optimizaciones de Next.js sí aplican

**Consecuencias:**
- Eliminar Vite, `@vitejs/plugin-react`, `vite.config.js`
- React 19 (Next.js 15 lo requiere)
- No se necesita `@tanstack/react-query` — Server Components + Server Actions reemplazan data fetching

### ADR-2: API Routes integradas (no Express separado)

**Contexto:** El issue original proponía `@slorenzot/memento-api` con Express como backend separado.

**Decisión:** Usar Next.js Route Handlers (`app/api/`) para toda la API REST.

**Razones:**
1. Memento es **local-first** — no necesita API remota separada
2. **Un solo servidor** — `bun run dev` levanta todo
3. Route Handlers tienen acceso directo al `MemoryEngine` en el servidor
4. Misma interfaz REST para consumidores externos
5. Elimina la complejidad de dos procesos, CORS, proxy

**Consecuencias:**
- `@slorenzot/memento-api` queda deprecado (o se convierte en thin wrapper)
- La API corre en el mismo puerto que la UI (3000)
- CLI y agentes externos consumen `http://localhost:3000/api/*`

### ADR-3: Server Components por defecto

**Contexto:** La mayoría de las páginas son de solo lectura (listar, ver detalle, dashboard).

**Decisión:** Todas las páginas son Server Components por defecto. Solo son Client Components: formularios interactivos, filtros con estado, y componentes con event handlers.

**Regla:**
- `"use client"` solo cuando el componente tiene: `useState`, `useEffect`, `onClick`, `onChange`, o browser APIs
- Todo lo demás: Server Component (default)

### ADR-4: Zustand para UI State, sin TanStack Query

**Contexto:** El paquete actual tiene `@tanstack/react-query` instalado.

**Decisión:** Eliminar TanStack Query. Usar Zustand solo para UI state (sidebar abierto/cerrado, tema, filtros activos). Server Components manejan data fetching.

**Razones:**
- Server Components hacen el fetching en el servidor — no hay waterfalls client-side
- Server Actions manejan mutations — no hay estados de loading manuales
- TanStack Query agrega complejidad innecesaria con Server Components
- Zustand es más simple para estado UI puro

### ADR-5: TailwindCSS sin librerías de charts

**Contexto:** El dashboard necesita visualización de datos (distribución por tipo, conteo por proyecto).

**Decisión:** Usar TailwindCSS puro para barras y elementos visuales. Sin Recharts, Chart.js, ni D3.

**Razones:**
- Los datos son simples (4 tipos, N proyectos) — barras CSS son suficientes
- Mantiene el bundle pequeño
- Sin dependencia adicional

---

## 3. Arquitectura Técnica

### Diagrama de Alto Nivel

```
┌─────────────────────────────────────────────────────────────────┐
│                     NEXT.JS 15 APP                              │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Server Components (RSC)                                  │  │
│  │  ┌─────────┐ ┌──────────┐ ┌─────────┐ ┌────────────┐    │  │
│  │  │Dashboard│ │Obs List  │ │Timeline │ │Sessions    │    │  │
│  │  │  page   │ │  page    │ │  page   │ │   page     │    │  │
│  │  └────┬────┘ └────┬─────┘ └────┬────┘ └─────┬──────┘    │  │
│  │       │           │            │             │            │  │
│  │       └───────────┼────────────┼─────────────┘            │  │
│  │                   │            │                          │  │
│  │           ┌───────▼────────────▼───────┐                  │  │
│  │           │   MemoryEngine (singleton) │                  │  │
│  │           │   @slorenzot/memento-core  │                  │  │
│  │           └───────────┬────────────────┘                  │  │
│  └───────────────────────┼───────────────────────────────────┘  │
│                          │                                       │
│  ┌───────────────────────┼───────────────────────────────────┐  │
│  │  Client Components    │                                   │  │
│  │  ┌──────────────┐ ┌───▼───────┐ ┌──────────────┐        │  │
│  │  │ObsEditor    │ │ObsFilters │ │Sidebar       │        │  │
│  │  │(form)       │ │(state)    │ │(navigation) │        │  │
│  │  └──────┬──────┘ └─────┬─────┘ └──────┬───────┘        │  │
│  │         │              │               │                 │  │
│  │    Server Actions  Zustand Store  Zustand Store         │  │
│  │  └──────────────────────────────────────────────────────┘  │
│                                                              │  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Route Handlers (REST API)                               │  │
│  │  /api/health  /api/stats  /api/observations              │  │
│  │  /api/observations/search  /api/sessions  /api/export    │  │
│  │  → Para CLI, agentes IA, integraciones externas          │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │   SQLite + FTS5   │
                    │   (local file)    │
                    └───────────────────┘
```

### Flujo de Datos

**Reads (Server Components):**

```
Browser → GET /observations
         → Server Component (page.tsx)
         → MemoryEngine.search()
         → SQLite
         → HTML response (streamed)
```

**Mutations (Server Actions):**

```
Browser → Form submit
         → Server Action (actions.ts)
         → MemoryEngine.createObservation()
         → SQLite
         → revalidatePath('/observations')
         → HTML actualizado
```

**REST API (Route Handlers):**

```
curl → GET /api/observations
     → Route Handler (route.ts)
     → MemoryEngine.search()
     → JSON response
```

---

## 4. Estructura de Archivos

```
packages/web-ui/
├── package.json                          # Next.js 15 + React 19
├── next.config.ts                        # Next.js config
├── tailwind.config.ts                    # TailwindCSS (reutilizado)
├── postcss.config.mjs                    # PostCSS (ESM para Next.js)
├── tsconfig.json                         # TypeScript Next.js
│
├── public/
│   └── favicon.svg                       # Memento brain icon
│
├── src/
│   ├── app/
│   │   ├── layout.tsx                    # Root layout: html, body, sidebar
│   │   ├── page.tsx                      # Dashboard (Server Component)
│   │   ├── loading.tsx                   # Global loading skeleton
│   │   ├── error.tsx                     # Global error boundary
│   │   ├── not-found.tsx                 # 404 page
│   │   ├── globals.css                   # Tailwind directives + custom vars
│   │   │
│   │   ├── observations/
│   │   │   ├── page.tsx                  # Lista paginada con filtros
│   │   │   ├── loading.tsx               # Observations loading skeleton
│   │   │   ├── [id]/
│   │   │   │   ├── page.tsx              # Detalle de observación
│   │   │   │   └── edit/
│   │   │   │       └── page.tsx          # Editar observación
│   │   │   └── new/
│   │   │       └── page.tsx              # Crear observación
│   │   │
│   │   ├── search/
│   │   │   └── page.tsx                  # Búsqueda FTS5
│   │   │
│   │   ├── timeline/
│   │   │   └── page.tsx                  # Vista cronológica
│   │   │
│   │   ├── sessions/
│   │   │   ├── page.tsx                  # Lista de sesiones
│   │   │   └── [id]/
│   │   │       └── page.tsx              # Detalle de sesión
│   │   │
│   │   └── api/                          # REST API (Route Handlers)
│   │       ├── health/
│   │       │   └── route.ts              # GET /api/health
│   │       ├── stats/
│   │       │   └── route.ts              # GET /api/stats
│   │       ├── config/
│   │       │   └── route.ts              # GET /api/config
│   │       ├── observations/
│   │       │   ├── route.ts              # GET (list), POST (create)
│   │       │   ├── search/
│   │       │   │   └── route.ts          # POST (FTS5 search)
│   │       │   ├── timeline/
│   │       │   │   └── route.ts          # GET (chronological)
│   │       │   ├── deleted/
│   │       │   │   └── route.ts          # GET (soft-deleted list)
│   │       │   ├── merge/
│   │       │   │   └── route.ts          # POST (merge observations)
│   │       │   ├── export/
│   │       │   │   └── route.ts          # POST (export JSON/XML/TXT)
│   │       │   └── [id]/
│   │       │       ├── route.ts          # GET, PATCH, DELETE
│   │       │       └── restore/
│   │       │           └── route.ts      # POST (restore soft-deleted)
│   │       ├── sessions/
│   │       │   ├── route.ts              # GET (list), POST (create)
│   │       │   └── [id]/
│   │       │       └── route.ts          # GET, PATCH (end session)
│   │       └── projects/
│   │           └── route.ts              # GET (list projects with stats)
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx               # Client: navegación lateral con links
│   │   │   ├── Header.tsx                # Client: header con search + theme toggle
│   │   │   └── MobileNav.tsx             # Client: hamburger menu mobile
│   │   │
│   │   ├── dashboard/
│   │   │   ├── StatsCards.tsx            # Server: 4 tarjetas de métricas
│   │   │   ├── RecentActivity.tsx        # Server: últimas 5 observaciones
│   │   │   ├── TypeDistribution.tsx      # Server: barras CSS por tipo
│   │   │   └── ProjectList.tsx           # Server: proyectos con conteo
│   │   │
│   │   ├── observations/
│   │   │   ├── ObservationCard.tsx        # Server: tarjeta compacta para listas
│   │   │   ├── ObservationEditor.tsx      # Client: formulario crear/editar
│   │   │   └── ObservationFilters.tsx     # Client: filtros tipo/proyecto/fecha
│   │   │
│   │   ├── search/
│   │   │   └── SearchResults.tsx          # Server: resultados con ranking
│   │   │
│   │   ├── timeline/
│   │   │   └── TimelineGroup.tsx          # Server: grupo por fecha
│   │   │
│   │   ├── sessions/
│   │   │   └── SessionCard.tsx            # Server: tarjeta de sesión
│   │   │
│   │   └── shared/
│   │       ├── EmptyState.tsx             # Server: estado vacío reutilizable
│   │       ├── LoadingSpinner.tsx         # Server: spinner de carga
│   │       ├── ErrorMessage.tsx           # Client: error display
│   │       ├── RelativeTime.tsx           # Server: "5m ago", "2h ago"
│   │       ├── Badge.tsx                  # Server: type badge coloreado
│   │       └── ConfirmDialog.tsx          # Client: diálogo de confirmación
│   │
│   ├── lib/
│   │   ├── engine.ts                     # Singleton MemoryEngine (server-only)
│   │   ├── actions.ts                    # Server Actions para mutations
│   │   └── utils.ts                      # Helpers: formatDate, truncate, etc.
│   │
│   └── stores/
│       └── ui-store.ts                   # Zustand: sidebar, tema, filtros
```

**Total: ~48 archivos**

---

## 5. Detalle por Componente

### 5.1 Engine Singleton (`src/lib/engine.ts`)

```typescript
import { MemoryEngine } from '@slorenzot/memento-core';
import { readConfig } from '@slorenzot/memento-core';

let _engine: MemoryEngine | null = null;

export function getEngine(): MemoryEngine {
  if (!_engine) {
    const config = readConfig(); // reads .mementorc
    _engine = new MemoryEngine(config.dbPath);
  }
  return _engine;
}
```

**Regla:** Este archivo SOLO se importa en Server Components, Server Actions y Route Handlers. NUNCA en Client Components.

### 5.2 Server Actions (`src/lib/actions.ts`)

```typescript
'use server';

import { getEngine } from './engine';
import { revalidatePath } from 'next/cache';

export async function createObservation(formData: FormData) {
  const engine = getEngine();
  // ... validación con zod
  await engine.createObservation({ ... });
  revalidatePath('/observations');
}

export async function updateObservation(id: number, formData: FormData) {
  const engine = getEngine();
  await engine.updateObservation(id, { ... });
  revalidatePath(`/observations/${id}`);
}

export async function deleteObservation(id: number, reason?: string) {
  const engine = getEngine();
  await engine.deleteObservation(id, reason);
  revalidatePath('/observations');
}

export async function restoreObservation(id: number) {
  const engine = getEngine();
  await engine.restoreObservation(id);
  revalidatePath('/observations');
}

export async function endSession(id: number) {
  const engine = getEngine();
  await engine.endSession(id);
  revalidatePath('/sessions');
}
```

### 5.3 Dashboard (`src/app/page.tsx`)

**Server Component** que carga datos directamente:

```typescript
import { getEngine } from '@/lib/engine';
import { StatsCards } from '@/components/dashboard/StatsCards';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { TypeDistribution } from '@/components/dashboard/TypeDistribution';
import { ProjectList } from '@/components/dashboard/ProjectList';

export default async function DashboardPage() {
  const engine = getEngine();
  const stats = await engine.getDashboardStats();
  const projects = await engine.listProjects();

  return (
    <div className="space-y-6">
      <StatsCards stats={stats} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentActivity observations={stats.recentObservations} />
        <TypeDistribution byType={stats.byType} />
      </div>
      <ProjectList projects={projects} />
    </div>
  );
}
```

### 5.4 Observation List (`src/app/observations/page.tsx`)

**Server Component** con searchParams para filtros:

```typescript
import { getEngine } from '@/lib/engine';
import { ObservationCard } from '@/components/observations/ObservationCard';
import { ObservationFilters } from '@/components/observations/ObservationFilters';

interface Props {
  searchParams: {
    type?: string;
    project?: string;
    page?: string;
  };
}

export default async function ObservationsPage({ searchParams }: Props) {
  const engine = getEngine();
  const page = parseInt(searchParams.page || '1');
  const limit = 20;

  const result = await engine.search({
    type: searchParams.type as any,
    projectId: searchParams.project,
    limit,
    offset: (page - 1) * limit,
  });

  return (
    <div>
      <ObservationFilters currentFilters={searchParams} />
      <div className="divide-y">
        {result.observations.map(obs => (
          <ObservationCard key={obs.id} observation={obs} />
        ))}
      </div>
      {/* Pagination */}
    </div>
  );
}
```

### 5.5 Observation Editor (`src/components/observations/ObservationEditor.tsx`)

**Client Component** con formulario interactivo:

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createObservation, updateObservation } from '@/lib/actions';

interface Props {
  observation?: Observation; // undefined = create mode
}

export function ObservationEditor({ observation }: Props) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setIsPending(true);
    try {
      if (observation) {
        await updateObservation(observation.id, formData);
        router.push(`/observations/${observation.id}`);
      } else {
        await createObservation(formData);
        router.push('/observations');
      }
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form action={handleSubmit}>
      {/* title, content, type, topicKey, projectId fields */}
    </form>
  );
}
```

### 5.6 Sidebar (`src/components/layout/Sidebar.tsx`)

**Client Component** con Zustand para estado:

```typescript
'use client';

import { useUIStore } from '@/stores/ui-store';
import { LayoutDashboard, Search, Clock, Database, Settings } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/observations', label: 'Observations', icon: Database },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/timeline', label: 'Timeline', icon: Clock },
  { href: '/sessions', label: 'Sessions', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const isOpen = useUIStore(s => s.sidebarOpen);

  return (
    <aside className={/* responsive classes */}>
      {/* Logo + nav items with active state */}
    </aside>
  );
}
```

---

## 6. REST API (Route Handlers)

### Endpoints

| Método | Ruta | Descripción | Engine Method |
|--------|------|-------------|---------------|
| GET | `/api/health` | Health check | `isHealthy()` + `getInitError()` |
| GET | `/api/stats` | Dashboard stats | `getDashboardStats()` |
| GET | `/api/config` | Config del sistema | Config + disk stats |
| GET | `/api/observations` | Lista paginada | `search({ limit, offset, ... })` |
| POST | `/api/observations` | Crear observación | `createObservation()` |
| GET | `/api/observations/:id` | Obtener por ID | `getObservation(id)` |
| PATCH | `/api/observations/:id` | Actualizar | `updateObservation(id, ...)` |
| DELETE | `/api/observations/:id` | Soft delete | `deleteObservation(id, reason)` |
| POST | `/api/observations/search` | FTS5 search | `search({ query, ... })` |
| GET | `/api/observations/timeline` | Cronológico | `search({ orderBy date })` |
| GET | `/api/observations/deleted` | Eliminados | `listDeleted()` |
| POST | `/api/observations/:id/restore` | Restaurar | `restoreObservation(id)` |
| POST | `/api/observations/purge` | Purge permanente | `purgeObservations()` |
| POST | `/api/observations/merge` | Merge observaciones | `mergeObservations()` |
| POST | `/api/observations/export` | Export JSON/XML/TXT | `exportObservations()` |
| GET | `/api/sessions` | Lista sesiones | `listSessions()` |
| POST | `/api/sessions` | Crear sesión | `createSession()` |
| GET | `/api/sessions/:id` | Detalle sesión | `getSession(id)` |
| PATCH | `/api/sessions/:id` | Terminar sesión | `endSession(id)` |
| GET | `/api/projects` | Lista proyectos | `listProjects()` |

### Formato de Respuesta

```typescript
// Success
{ "success": true, "data": { ... } }

// Error
{ "success": false, "error": "message", "hint": "suggestion" }

// List with pagination
{ "success": true, "data": [...], "total": 142, "page": 1, "limit": 20 }
```

### Ejemplo: Route Handler (`src/app/api/observations/route.ts`)

```typescript
import { getEngine } from '@/lib/engine';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const engine = getEngine();
    const { searchParams } = request.nextUrl;

    const result = await engine.search({
      type: searchParams.get('type') as any,
      projectId: searchParams.get('project'),
      limit: parseInt(searchParams.get('limit') || '20'),
      offset: parseInt(searchParams.get('offset') || '0'),
    });

    return NextResponse.json({
      success: true,
      data: result.observations,
      total: result.total,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const engine = getEngine();
    const body = await request.json();

    // Validación con zod
    const parsed = CreateObservationSchema.parse(body);

    const obs = await engine.createObservation({
      sessionId: parsed.sessionId || (await engine.createSession({ ... })).id,
      title: parsed.title,
      content: parsed.content,
      type: parsed.type,
      topicKey: parsed.topicKey || null,
      projectId: parsed.projectId || 'default',
      metadata: parsed.metadata || {},
    });

    return NextResponse.json({ success: true, data: obs }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }
}
```

---

## 7. UI Design Specifications

### Layout

```
┌────────────────────────────────────────────────────────────────┐
│ ┌──────────┐ ┌──────────────────────────────────────────────┐ │
│ │          │ │  Header: Search | Theme Toggle | Status      │ │
│ │ Sidebar  │ ├──────────────────────────────────────────────┤ │
│ │          │ │                                              │ │
│ │ 📊 Dash  │ │                                              │ │
│ │ 📋 Obs   │ │              Content Area                    │ │
│ │ 🔍 Search│ │              (Server Components)             │ │
│ │ 🕐 Time  │ │                                              │ │
│ │ 📅 Sess  │ │                                              │ │
│ │          │ │                                              │ │
│ │          │ │                                              │ │
│ └──────────┘ └──────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘
```

### Color Palette (TailwindCSS)

| Elemento | Clase Tailwind | Uso |
|----------|---------------|-----|
| Decision | `bg-blue-100 text-blue-800` | Badge, barra |
| Bug | `bg-red-100 text-red-800` | Badge, barra |
| Discovery | `bg-amber-100 text-amber-800` | Badge, barra |
| Note | `bg-gray-100 text-gray-800` | Badge, barra |
| Active session | `bg-green-100 text-green-800` | Indicador |
| Sidebar bg | `bg-gray-900 text-gray-100` | Dark sidebar |
| Content bg | `bg-white dark:bg-gray-950` | Light/dark |

### Responsive Breakpoints

| Breakpoint | Layout | Sidebar |
|------------|--------|---------|
| `<768px` (mobile) | Single column | Hidden, hamburger menu |
| `768px-1024px` (tablet) | Two column | Collapsed (icons only) |
| `>1024px` (desktop) | Two column | Full sidebar with labels |

### Dashboard Wireframe

```
┌───────────────────────────────────────────────────────────────┐
│  MEMENTO                                                       │
├───────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │ Total    │ │ Active   │ │ Deleted  │ │ Sessions │        │
│  │   142    │ │   139    │ │    3     │ │    2     │        │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
│                                                                │
│  ┌────────────────────────┐ ┌────────────────────────┐       │
│  │ Recent Activity        │ │ By Type                │       │
│  │                        │ │                        │       │
│  │ • Fix auth bug    5m   │ │ Decision ████░░ 45     │       │
│  │ • Add dark mode   2h   │ │ Bug       ████░░ 38     │       │
│  │ • Update docs     3h   │ │ Discovery ███░░░ 32     │       │
│  │ • Caching layer   1d   │ │ Note      ██░░░░ 24     │       │
│  │ • Refactor DB     2d   │ │                        │       │
│  └────────────────────────┘ └────────────────────────┘       │
│                                                                │
│  ┌────────────────────────────────────────────────────┐       │
│  │ Projects                                           │       │
│  │ memento       89 observations  •  2h ago           │       │
│  │ salesforce-app 53 observations  •  5h ago           │       │
│  └────────────────────────────────────────────────────┘       │
└───────────────────────────────────────────────────────────────┘
```

### Observation List Wireframe

```
┌───────────────────────────────────────────────────────────────┐
│  Observations                     [+ New Observation]         │
│                                                                │
│  Filters: [All Types ▾] [All Projects ▾] [Date Range]        │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ [BUG]    Fix authentication bug                    5m   │ │
│  │          Session management problem with JWT...          │ │
│  │          memento • auth                               │ │
│  ├─────────────────────────────────────────────────────────┤ │
│  │ [DEC]    Add dark mode support                     2h   │ │
│  │          Implemented CSS variables for theme...          │ │
│  │          memento • ui/theme                            │ │
│  ├─────────────────────────────────────────────────────────┤ │
│  │ [DISC]   Update API documentation                  3h   │ │
│  │          Found that endpoints need versioning...         │ │
│  │          salesforce-app • api                          │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                                │
│  Page 1 of 8  [< Prev] [Next >]                               │
└───────────────────────────────────────────────────────────────┘
```

### Search Page Wireframe

```
┌───────────────────────────────────────────────────────────────┐
│  Search                                                        │
│                                                                │
│  ┌───────────────────────────────────────────────────┐ [🔍]  │
│  │ Search observations...                              │       │
│  └───────────────────────────────────────────────────┘       │
│                                                                │
│  Filters: [All Types ▾] [All Projects ▾]                     │
│                                                                │
│  5 results for "authentication"                                │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ [BUG] 98%  Fix authentication bug                   5m  │ │
│  │           Session management problem with JWT tokens     │ │
│  ├─────────────────────────────────────────────────────────┤ │
│  │ [BUG] 85%  JWT token expiration issue              2h   │ │
│  │           Tokens expiring too quickly causing...         │ │
│  ├─────────────────────────────────────────────────────────┤ │
│  │ ...                                                     │ │
│  └─────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
```

### Timeline Wireframe

```
┌───────────────────────────────────────────────────────────────┐
│  Timeline                                                      │
│                                                                │
│  ── Today ──────────────────────────────────────────────────  │
│  [BUG]    Fix authentication bug              5m ago          │
│  [DEC]    Add dark mode support               2h ago          │
│  [DISC]   Update API documentation            3h ago          │
│                                                                │
│  ── Yesterday ──────────────────────────────────────────────  │
│  [NOTE]   Implement caching layer             1 day ago       │
│  [DEC]    Refactor database queries           1 day ago       │
│                                                                │
│  ── May 3, 2026 ───────────────────────────────────────────  │
│  [BUG]    Session timeout handling            2 days ago      │
│  [DISC]   Found N+1 in UserList              2 days ago      │
│                                                                │
│  [Load more...]                                                │
└───────────────────────────────────────────────────────────────┘
```

---

## 8. Dependencias

### package.json Final

```json
{
  "name": "@slorenzot/memento-web-ui",
  "version": "1.0.0",
  "description": "Web UI and REST API for Memento memory system — Next.js 15",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "next": "^15.3.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@slorenzot/memento-core": "^1.0.0",
    "zustand": "^5.0.0",
    "lucide-react": "^0.500.0",
    "clsx": "^2.1.0",
    "date-fns": "^4.0.0",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@types/node": "^22.0.0",
    "typescript": "^5.7.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "@tailwindcss/postcss": "^4.0.0"
  }
}
```

### Dependencias Eliminadas (vs Vite)

| Paquete | Razón |
|---------|-------|
| `vite` | Reemplazado por Next.js |
| `@vitejs/plugin-react` | No necesario con Next.js |
| `@tanstack/react-query` | Server Components reemplazan data fetching |
| `react@18` | Next.js 15 requiere React 19 |
| `react-dom@18` | Next.js 15 requiere React 19 |
| `@types/react@18` | Actualizado a v19 |
| `@types/react-dom@18` | Actualizado a v19 |
| `bun-types` | No necesario |

---

## 9. Phases de Implementación

### Phase 1: Setup Next.js (~30 min)

**Objetivo:** Next.js corriendo con TailwindCSS, engine accesible.

| # | Tarea | Archivo |
|---|-------|---------|
| 1 | Eliminar config Vite | `vite.config.js`, `tsconfig.node.json` |
| 2 | Actualizar `package.json` | Next.js 15 + React 19 deps |
| 3 | Crear `next.config.ts` | Config básica |
| 4 | Ajustar `postcss.config.mjs` | Formato ESM |
| 5 | Actualizar `tsconfig.json` | Config Next.js |
| 6 | Crear `src/app/globals.css` | Tailwind directives |
| 7 | Crear `src/app/layout.tsx` | Root layout |
| 8 | Crear `src/app/page.tsx` | Dashboard placeholder |
| 9 | Crear `src/lib/engine.ts` | Singleton MemoryEngine |
| 10 | Eliminar `index.html` | No necesario con Next.js |

**Verificación:** `bun run dev` → Next.js levanta en `localhost:3000` → muestra "Memento Dashboard"

---

### Phase 2: Layout + Navigation (~1 hr)

**Objetivo:** Shell visual con sidebar, header, navegación funcional.

| # | Tarea | Archivo |
|---|-------|---------|
| 1 | Crear Sidebar | `src/components/layout/Sidebar.tsx` |
| 2 | Crear Header | `src/components/layout/Header.tsx` |
| 3 | Crear MobileNav | `src/components/layout/MobileNav.tsx` |
| 4 | Crear Zustand store | `src/stores/ui-store.ts` |
| 5 | Actualizar root layout | `src/app/layout.tsx` |
| 6 | Crear `loading.tsx` | Global loading skeleton |
| 7 | Crear `error.tsx` | Global error boundary |
| 8 | Crear `not-found.tsx` | 404 page |

**Verificación:** Sidebar navega entre rutas, responsive funciona, dark mode sigue sistema.

---

### Phase 3: Dashboard (~2 hr)

**Objetivo:** Dashboard funcional con datos reales.

| # | Tarea | Archivo |
|---|-------|---------|
| 1 | Dashboard page | `src/app/page.tsx` |
| 2 | Stats cards | `src/components/dashboard/StatsCards.tsx` |
| 3 | Recent activity | `src/components/dashboard/RecentActivity.tsx` |
| 4 | Type distribution | `src/components/dashboard/TypeDistribution.tsx` |
| 5 | Project list | `src/components/dashboard/ProjectList.tsx` |
| 6 | Relative time | `src/components/shared/RelativeTime.tsx` |
| 7 | Badge component | `src/components/shared/Badge.tsx` |
| 8 | Utils | `src/lib/utils.ts` |

**Verificación:** Dashboard muestra datos reales de la DB local.

---

### Phase 4: Observations CRUD (~3 hr)

**Objetivo:** CRUD completo de observaciones desde la UI.

| # | Tarea | Archivo |
|---|-------|---------|
| 1 | Observation list page | `src/app/observations/page.tsx` |
| 2 | Observation detail page | `src/app/observations/[id]/page.tsx` |
| 3 | Create observation page | `src/app/observations/new/page.tsx` |
| 4 | Edit observation page | `src/app/observations/[id]/edit/page.tsx` |
| 5 | Observation card | `src/components/observations/ObservationCard.tsx` |
| 6 | Observation editor | `src/components/observations/ObservationEditor.tsx` |
| 7 | Observation filters | `src/components/observations/ObservationFilters.tsx` |
| 8 | Server actions | `src/lib/actions.ts` |
| 9 | Confirm dialog | `src/components/shared/ConfirmDialog.tsx` |
| 10 | Empty state | `src/components/shared/EmptyState.tsx` |
| 11 | Loading spinner | `src/components/shared/LoadingSpinner.tsx` |
| 12 | Loading per-ruta | `src/app/observations/loading.tsx` |

**Verificación:** Crear, ver, editar, eliminar observaciones desde la UI.

---

### Phase 5: API Routes (REST) (~2 hr)

**Objetivo:** REST API completa para consumidores externos.

| # | Tarea | Archivo |
|---|-------|---------|
| 1 | Health endpoint | `src/app/api/health/route.ts` |
| 2 | Stats endpoint | `src/app/api/stats/route.ts` |
| 3 | Config endpoint | `src/app/api/config/route.ts` |
| 4 | Observations CRUD | `src/app/api/observations/route.ts` |
| 5 | Observation by ID | `src/app/api/observations/[id]/route.ts` |
| 6 | Search endpoint | `src/app/api/observations/search/route.ts` |
| 7 | Timeline endpoint | `src/app/api/observations/timeline/route.ts` |
| 8 | Deleted list | `src/app/api/observations/deleted/route.ts` |
| 9 | Restore endpoint | `src/app/api/observations/[id]/restore/route.ts` |
| 10 | Merge endpoint | `src/app/api/observations/merge/route.ts` |
| 11 | Export endpoint | `src/app/api/observations/export/route.ts` |
| 12 | Sessions CRUD | `src/app/api/sessions/route.ts` |
| 13 | Session by ID | `src/app/api/sessions/[id]/route.ts` |
| 14 | Projects endpoint | `src/app/api/projects/route.ts` |

**Verificación:** `curl http://localhost:3000/api/health` → `{"status":"healthy"}`

---

### Phase 6: Search + Timeline (~2 hr)

**Objetivo:** Búsqueda visual FTS5 y timeline cronológico.

| # | Tarea | Archivo |
|---|-------|---------|
| 1 | Search page | `src/app/search/page.tsx` |
| 2 | Search results | `src/components/search/SearchResults.tsx` |
| 3 | Timeline page | `src/app/timeline/page.tsx` |
| 4 | Timeline group | `src/components/timeline/TimelineGroup.tsx` |
| 5 | Utils para agrupar | `src/lib/utils.ts` (groupByDate) |

**Verificación:** Búsqueda FTS5 funcional, timeline agrupado por día.

---

### Phase 7: Sessions + Polish (~2 hr)

**Objetivo:** Gestión de sesiones, responsive final, dark mode.

| # | Tarea | Archivo |
|---|-------|---------|
| 1 | Sessions list page | `src/app/sessions/page.tsx` |
| 2 | Session detail page | `src/app/sessions/[id]/page.tsx` |
| 3 | Session card | `src/components/sessions/SessionCard.tsx` |
| 4 | Dark mode polish | `tailwind.config.ts` (darkMode: 'class') |
| 5 | Loading skeletons | `loading.tsx` por ruta |
| 6 | Error boundaries | `error.tsx` por ruta |
| 7 | Responsive polish | Mobile nav, breakpoints |

**Verificación:** UI completa, responsive, dark mode, error states.

---

## 10. Estimación Total

| Phase | Tiempo | Archivos | Dependencia |
|-------|--------|----------|-------------|
| P1: Setup Next.js | ~30 min | 10 | — |
| P2: Layout + Nav | ~1 hr | 8 | P1 |
| P3: Dashboard | ~2 hr | 8 | P2 |
| P4: CRUD Observations | ~3 hr | 12 | P2 |
| P5: API Routes | ~2 hr | 14 | P1 |
| P6: Search + Timeline | ~2 hr | 5 | P2 |
| P7: Sessions + Polish | ~2 hr | 7+ | P4, P6 |
| **TOTAL** | **~12.5 hr** | **~48** | |

### Ejecución Óptima

```
P1 (Setup) → P2 (Layout) → P3 + P5 en PARALELO → P4 → P6 → P7
                 30min         1hr          2+2 hr paralelo   3hr   2hr   2hr
```

---

## 11. Acceptance Criteria

- [ ] Next.js 15 App Router corriendo con `bun run dev`
- [ ] Dashboard muestra stats reales de la DB local (getDashboardStats)
- [ ] Lista de observaciones con paginación y filtros por tipo/proyecto
- [ ] Crear observación desde UI con formulario validado
- [ ] Editar observación existente
- [ ] Soft-delete con diálogo de confirmación
- [ ] Restaurar observaciones eliminadas
- [ ] Búsqueda FTS5 con resultados rankeados visualmente
- [ ] Timeline cronológico agrupado por día
- [ ] Lista de sesiones con duración y observaciones vinculadas
- [ ] REST API responde en `/api/*` con formato JSON consistente
- [ ] `curl /api/health` devuelve `{ "status": "healthy" }`
- [ ] Responsive: mobile (sidebar oculto), tablet (colapsado), desktop (completo)
- [ ] Dark mode sigue preferencia del sistema
- [ ] Loading states en cada ruta (skeletons)
- [ ] Error boundaries en cada ruta
- [ ] Estado vacío (EmptyState) cuando no hay datos
- [ ] TailwindCSS puro, sin librerías de charts externas

---

## 12. Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| `bun:sqlite` no funciona en Next.js server | Media | Alto | Next.js corre con Node.js, no Bun. Usar `better-sqlite3` como fallback o ejecutar con `bun run dev` |
| React 19 breaking changes con librerías | Baja | Medio | Librerías actualizadas (zustand 5, lucide-react, date-fns 4) |
| Server Components confusión con `'use client'` | Media | Bajo | Regla clara: solo Client Components para interactividad |
| TailwindCSS 3 vs 4 conflict | Baja | Medio | Mantener TailwindCSS 3.x estable |

### Nota crítica sobre `bun:sqlite`

El `MemoryEngine` usa `import { Database } from 'bun:sqlite'`. Next.js por defecto corre con Node.js, no Bun. **Opciones:**

1. **Ejecutar Next.js con Bun:** `bun run dev` (Bun soporta Next.js)
2. **Fallback a `better-sqlite3`:** Si Bun no funciona bien con Next.js, cambiar el import en core
3. **Condicionar el import:** Engine detecta runtime y usa el módulo apropiado

**Recomendación:** Intentar con `bun run dev` primero. Si hay problemas, evaluar `better-sqlite3`.

---

## 13. Out of Scope (v1.1+)

- Autenticación / usuarios
- Multi-tenancy
- Sync en la nube
- Plugin system
- GraphQL API
- Notificaciones
- Semantic search con embeddings
- Drag-and-drop para reordenar
- Real-time updates (WebSocket)
- Mobile app nativa
