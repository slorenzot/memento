# @slorenzot/memento-web-ui

[![NPM Version](https://img.shields.io/npm/v/@slorenzot/memento-web-ui.svg)](https://www.npmjs.com/package/@slorenzot/memento-web-ui)
[![License: CC BY-NC-ND 4.0](https://img.shields.io/badge/License-CC_BY--NC--ND_4.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-nd/4.0/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18+-blue.svg)](https://reactjs.org/)

> Modern React components and hooks for building Memento-powered web interfaces with Tailwind CSS styling and state management integration.

## 🚀 Instalación

```bash
# Using Bun (recomendado)
bun add @slorenzot/memento-web-ui

# Using npm
npm install @slorenzot/memento-web-ui

# Using yarn
yarn add @slorenzot/memento-web-ui
```

## 💡 Uso Básico

### TypeScript
```typescript
import { App } from '@slorenzot/memento-web-ui';
import { useMemory } from '@slorenzot/memento-web-ui';

function MyComponent() {
  const { observations, search, create } = useMemory();

  return (
    <div>
      <button onClick={() => search('arquitectura')}>
        Buscar
      </button>
      <App />
    </div>
  );
}
```

### Shell/Bun
```bash
# Ejecutar aplicación web
bunx @slorenzot/memento-web-ui

# O con puerto personalizado
PORT=5174 bunx @slorenzot/memento-web-ui
```

## 🔧 API Esencial

### Componentes Principales

#### `App`

Componente principal de la aplicación Memento Web UI.

**Props:**
```typescript
{
  dbPath?: string;           // Ruta personalizada a base de datos
  apiBase?: string;          // URL base de API personalizada
  theme?: 'light' | 'dark'; // Tema de la aplicación
}
```

**Ejemplo:**
```typescript
import { App } from '@slorenzot/memento-web-ui';

function RootComponent() {
  return (
    <App
      dbPath="./data/memento.db"
      apiBase="http://localhost:3000/api"
      theme="light"
    />
  );
}
```

---

#### Hooks Personalizados

##### `useMemory()`

Hook principal para acceder a la funcionalidad de memoria.

**Retorna:**
```typescript
{
  observations: Observation[];
  sessions: Session[];
  search: (query: SearchParams) => Promise<SearchResult>;
  createObservation: (data: CreateObservationData) => Promise<Observation>;
  updateObservation: (id: number, data: UpdateObservationData) => Promise<Observation>;
  deleteObservation: (id: number) => Promise<void>;
  loading: boolean;
  error: Error | null;
}
```

**Ejemplo:**
```typescript
function ObservationList() {
  const { observations, search, loading } = useMemory();

  const handleSearch = async () => {
    const results = await search({
      query: 'arquitectura',
      type: 'decision'
    });
    console.log('Resultados:', results);
  };

  return (
    <div>
      <button onClick={handleSearch}>
        {loading ? 'Buscando...' : 'Buscar'}
      </button>
      <ul>
        {observations.map(obs => (
          <li key={obs.id}>{obs.title}</li>
        ))}
      </ul>
    </div>
  );
}
```

---

##### `useSession()`

Hook para gestión de sesiones activas.

**Retorna:**
```typescript
{
  activeSession: Session | null;
  startSession: (data: CreateSessionData) => Promise<Session>;
  endSession: (id: number) => Promise<Session>;
  loading: boolean;
}
```

**Ejemplo:**
```typescript
function SessionManager() {
  const { activeSession, startSession, endSession, loading } = useSession();

  const handleStart = async () => {
    const session = await startSession({
      projectId: 'my-app',
      metadata: { agent: 'web-ui' }
    });
    console.log('Sesión iniciada:', session.uuid);
  };

  const handleEnd = async () => {
    if (activeSession) {
      await endSession(activeSession.id);
    }
  };

  return (
    <div>
      {!activeSession ? (
        <button onClick={handleStart}>
          {loading ? 'Iniciando...' : 'Iniciar Sesión'}
        </button>
      ) : (
        <button onClick={handleEnd}>
          {loading ? 'Finalizando...' : 'Finalizar Sesión'}
        </button>
      )}
    </div>
  );
}
```

---

##### `useSearch()`

Hook especializado para funcionalidad de búsqueda.

**Parámetros:**
- `debounceMs` (number): Tiempo de debounce en ms (default: 300)

**Retorna:**
```typescript
{
  query: string;
  results: SearchResult | null;
  searching: boolean;
  setQuery: (query: string) => void;
  search: (params: SearchParams) => Promise<SearchResult>;
}
```

**Ejemplo:**
```typescript
function SearchComponent() {
  const { query, setQuery, results, searching } = useSearch({ debounceMs: 300 });

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar en memoria..."
      />
      {searching && <p>Buscando...</p>}
      {results && (
        <ul>
          {results.observations.map(obs => (
            <li key={obs.id}>
              <strong>{obs.title}</strong>
              <p>{obs.content.substring(0, 100)}...</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

---

## 🎨 Componentes de UI

### `ObservationCard`

Tarjeta para mostrar una observación individual.

**Props:**
```typescript
{
  observation: Observation;
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
  compact?: boolean;
}
```

**Ejemplo:**
```typescript
function ObservationsList() {
  const { observations } = useMemory();

  return (
    <div className="grid gap-4">
      {observations.map(obs => (
        <ObservationCard
          key={obs.id}
          observation={obs}
          compact={true}
          onEdit={(id) => console.log('Editar:', id)}
          onDelete={(id) => console.log('Eliminar:', id)}
        />
      ))}
    </div>
  );
}
```

---

### `SearchBox`

Componente de búsqueda con autocompletado.

**Props:**
```typescript
{
  placeholder?: string;
  onSearch: (query: string) => void;
  filters?: SearchFilters;
  debounce?: number;
}
```

**Ejemplo:**
```typescript
function Header() {
  const handleSearch = (query: string) => {
    console.log('Buscando:', query);
  };

  return (
    <header className="bg-white shadow">
      <SearchBox
        placeholder="Buscar observaciones, decisiones, bugs..."
        onSearch={handleSearch}
        filters={{
          types: ['decision', 'bug', 'discovery', 'note'],
          defaultType: 'all'
        }}
        debounce={300}
      />
    </header>
  );
}
```

---

### `StatsPanel`

Panel de estadísticas del sistema de memoria.

**Props:**
```typescript
{
  projectId?: string;
  refreshInterval?: number;  // ms para auto-refresh
}
```

**Ejemplo:**
```typescript
function Dashboard() {
  return (
    <div className="p-6">
      <StatsPanel
        projectId="my-app"
        refreshInterval={60000} // Actualizar cada minuto
      />
    </div>
  );
}
```

---

### `TimelineView`

Vista de línea temporal de observaciones.

**Props:**
```typescript
{
  observations: Observation[];
  groupBy?: 'day' | 'week' | 'month';
  onObservationClick?: (id: number) => void;
}
```

**Ejemplo:**
```typescript
function Timeline() {
  const { observations } = useMemory();

  return (
    <div className="max-w-4xl mx-auto">
      <TimelineView
        observations={observations}
        groupBy="day"
        onObservationClick={(id) => console.log('Clic:', id)}
      />
    </div>
  );
}
```

---

## ⚡ Ejemplos Prácticos

### Ejemplo 1: Integración Completa en Next.js

```typescript
// app/page.tsx
'use client';

import { App, useMemory } from '@slorenzot/memento-web-ui';

export default function Home() {
  const { observations, loading } = useMemory();

  return (
    <main className="min-h-screen bg-gray-100">
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">
          Sistema de Memoria Memento
        </h1>

        {loading ? (
          <p className="text-center">Cargando observaciones...</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {observations.map(obs => (
              <ObservationCard
                key={obs.id}
                observation={obs}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
```

### Ejemplo 2: Componente de Búsqueda Avanzada

```typescript
import { useSearch, SearchBox } from '@slorenzot/memento-web-ui';

function AdvancedSearch() {
  const { query, setQuery, results, searching } = useSearch();

  const filters = {
    types: ['decision', 'bug', 'discovery', 'note'],
    defaultType: 'decision'
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">
        Búsqueda Avanzada
      </h2>

      <SearchBox
        value={query}
        onChange={setQuery}
        placeholder="Buscar en memoria..."
        filters={filters}
      />

      {searching && (
        <div className="mt-4 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="ml-2">Buscando...</p>
        </div>
      )}

      {results && results.observations.length > 0 && (
        <div className="mt-6">
          <h3 className="text-xl font-semibold mb-3">
            Resultados ({results.total})
          </h3>
          <div className="space-y-4">
            {results.observations.map(obs => (
              <ObservationCard
                key={obs.id}
                observation={obs}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

### Ejemplo 3: Panel de Administración

```typescript
import { useMemory, useSession, StatsPanel } from '@slorenzot/memento-web-ui';

function AdminPanel() {
  const { loading, error } = useMemory();
  const { activeSession, startSession, endSession } = useSession();

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Panel de Sesiones */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">
            Gestión de Sesiones
          </h2>

          {activeSession ? (
            <div className="space-y-3">
              <p className="text-green-600 font-medium">
                ✓ Sesión activa: {activeSession.uuid}
              </p>
              <button
                onClick={() => endSession(activeSession.id)}
                className="w-full bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              >
                Finalizar Sesión
              </button>
            </div>
          ) : (
            <button
              onClick={() => startSession({ projectId: 'admin' })}
              className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Iniciar Nueva Sesión
            </button>
          )}
        </div>

        {/* Panel de Estadísticas */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">
            Estadísticas del Sistema
          </h2>
          <StatsPanel refreshInterval={30000} />
        </div>
      </div>

      {/* Mensajes de Estado */}
      {loading && (
        <div className="mt-6 bg-blue-50 text-blue-700 p-4 rounded">
          Cargando datos del sistema...
        </div>
      )}

      {error && (
        <div className="mt-6 bg-red-50 text-red-700 p-4 rounded">
          Error: {error.message}
        </div>
      )}
    </div>
  );
}
```

### Ejemplo 4: Aplicación Standalone

```typescript
// index.tsx
import { App } from '@slorenzot/memento-web-ui';

// Configuración personalizada
const config = {
  dbPath: process.env.MEMENTO_DB_PATH || './data/memento.db',
  apiBase: process.env.MEMENTO_API_URL || 'http://localhost:3000/api',
  theme: (localStorage.getItem('theme') as 'light' | 'dark') || 'light'
};

// Renderizar aplicación
document.getElementById('root').render(
  <App {...config} />
);
```

## 🔧 Configuración

### Props del Componente App

```typescript
interface AppProps {
  dbPath?: string;           // Ruta a base de datos (default: './data/memento.db')
  apiBase?: string;          // URL base de API (default: 'http://localhost:3000/api')
  theme?: 'light' | 'dark'; // Tema de aplicación (default: 'light')
  locale?: string;           // Idioma de la interfaz (default: 'es')
}
```

### Variables de Entorno

- `MEMENTO_DB_PATH`: Ruta personalizada a base de datos
- `MEMENTO_API_URL`: URL base de API personalizada
- `MEMENTO_THEME`: Tema por defecto ('light'|'dark')
- `MEMENTO_LOCALE`: Idioma por defecto

**Ejemplo:**
```bash
# Configurar entorno
export MEMENTO_API_URL="http://api.example.com/api"
export MEMENTO_THEME="dark"

# Ejecutar aplicación
bunx @slorenzot/memento-web-ui
```

## ⚠️ Licencia Restrictiva

Este paquete está bajo **Licencia CC BY-NC-ND 4.0**:
- ✅ **Uso personal y educacional permitido**
- ✅ **Compartir con atribución al autor**
- ❌ **Uso comercial NO permitido**
- ❌ **Modificaciones o forks NO permitidos**

**Autor**: Soulberto Lorenzo (slorenzot@gmail.com)

## 🔄 Dependencias

### Dependencias Principales
- `react` - Framework de UI
- `react-dom` - Rendering en navegador
- `@tanstack/react-query` - Gestión de estado y cache
- `zustand` - Gestión de estado global
- `clsx` - Utilidad de clases CSS
- `date-fns` - Formateo de fechas
- `lucide-react` - Iconos SVG
- `zod` - Validación de esquemas

### Peer Dependencies
- `react` v18+
- `react-dom` v18+

## 🛠️ Desarrollo

```bash
# Clonar el proyecto
git clone https://github.com/slorenzot/memento.git
cd memento/packages/web-ui

# Instalar dependencias
bun install

# Desarrollo
bun run dev

# Build
bun run build

# Preview de build
bun run preview
```

## 📋 Changelog

### [0.1.0] - 2024-04-04
- **Added**: Versión inicial de componentes React
- **Added**: Hooks personalizados (useMemory, useSession, useSearch)
- **Added**: Componentes de UI (ObservationCard, SearchBox, StatsPanel)
- **Added**: Integración con Tailwind CSS
- **Added**: Soporte para temas claro/oscuro

## 👤 Autor

**Soulberto Lorenzo**  
- GitHub: [@slorenzot](https://github.com/slorenzot)
- Email: slorenzot@gmail.com

## 📄 Licencia

Este paquete está bajo Licencia **Creative Commons Attribution-NonCommercial-NoDerivs 4.0 International**.

[Ver Licencia Completa](https://github.com/slorenzot/memento/blob/main/LICENSE)

---

**⚠️ Importante**: Este paquete tiene licencia restrictiva. Respeta los términos de la licencia CC BY-NC-ND 4.0.

**[📖 English version](./README.md)**