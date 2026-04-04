# @slorenzot/memento-core

[![NPM Version](https://img.shields.io/npm/v/@slorenzot/memento-core.svg)](https://www.npmjs.com/package/@slorenzot/memento-core)
[![License: CC BY-NC-ND 4.0](https://img.shields.io/badge/License-CC_BY--NC--ND_4.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-nd/4.0/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)

> Core memory engine with SQLite FTS5 search, session management, and observation persistence for AI coding agents.

## 🚀 Instalación

```bash
# Using Bun (recomendado)
bun add @slorenzot/memento-core

# Using npm
npm install @slorenzot/memento-core
```

## 💡 Uso Básico

### TypeScript
```typescript
import { MemoryEngine } from '@slorenzot/memento-core';

// Inicializar motor de memoria
const memory = new MemoryEngine('./data/memento.db');

// Crear una observación
const observation = await memory.createObservation({
  title: 'Decisión de arquitectura',
  content: 'Usar SQLite como motor de base de datos',
  type: 'decision',
  topicKey: 'architecture',
  projectId: 'my-project'
});

console.log('Observación guardada:', observation);
```

### Shell/Bun
```bash
# Ejecutar script TypeScript con motor de memoria
bun run memory-script.ts
```

## 🔧 API Esencial

### Clase Principal

#### `MemoryEngine(dbPath?: string)`

Constructor del motor de memoria.

**Parámetros:**
- `dbPath` (opcional): Ruta al archivo de base de datos SQLite. Default: `'./data/memento.db'`

**Ejemplo:**
```typescript
const memory = new MemoryEngine('./custom/path.db');
```

---

#### Métodos de Observaciones

##### `createObservation(data)`

Crea una nueva observación en la memoria.

**Parámetros:**
```typescript
{
  title: string;
  content: string;
  type: 'decision' | 'bug' | 'discovery' | 'note';
  topicKey?: string | null;
  projectId: string;
  sessionId?: number;
  metadata?: Record<string, unknown>;
}
```

**Retorna:** `Promise<Observation>`

**Ejemplo:**
```typescript
const observation = await memory.createObservation({
  title: 'Bug encontrado',
  content: 'Error de conexión al servidor',
  type: 'bug',
  projectId: 'project-123',
  metadata: { severity: 'high', priority: 1 }
});
```

---

##### `search(params)`

Busca observaciones usando búsqueda full-text FTS5.

**Parámetros:**
```typescript
{
  query?: string;
  type?: 'decision' | 'bug' | 'discovery' | 'note';
  projectId?: string;
  topicKey?: string;
  limit?: number;
  offset?: number;
}
```

**Retorna:** `Promise<SearchResult>`

**Ejemplo:**
```typescript
const results = await memory.search({
  query: 'arquitectura base de datos',
  type: 'decision',
  projectId: 'project-123',
  limit: 10
});

console.log(`Encontrados ${results.total} observaciones:`);
results.observations.forEach(obs => console.log(obs.title));
```

---

##### `getObservation(id)`

Obtiene una observación por su ID.

**Parámetros:**
- `id`: ID numérico de la observación

**Retorna:** `Promise<Observation | null>`

**Ejemplo:**
```typescript
const observation = await memory.getObservation(123);
if (observation) {
  console.log('Observación encontrada:', observation.title);
}
```

---

##### `updateObservation(id, updates)`

Actualiza una observación existente.

**Parámetros:**
- `id`: ID numérico de la observación
- `updates`: Objeto con campos a actualizar

**Retorna:** `Promise<Observation>`

**Ejemplo:**
```typescript
const updated = await memory.updateObservation(123, {
  title: 'Título actualizado',
  content: 'Contenido modificado'
});
```

---

##### `deleteObservation(id)`

Elimina una observación por su ID.

**Parámetros:**
- `id`: ID numérico de la observación

**Retorna:** `Promise<void>`

**Ejemplo:**
```typescript
await memory.deleteObservation(123);
console.log('Observación eliminada');
```

---

#### Métodos de Sesiones

##### `createSession(data)`

Crea una nueva sesión para seguimiento de conversaciones.

**Parámetros:**
```typescript
{
  projectId: string;
  metadata?: Record<string, unknown>;
}
```

**Retorna:** `Promise<Session>`

**Ejemplo:**
```typescript
const session = await memory.createSession({
  projectId: 'my-project',
  metadata: { agent: 'claude', userId: 'user-123' }
});

console.log('Sesión iniciada:', session.uuid);
```

---

##### `getSession(id)`

Obtiene una sesión por su ID.

**Parámetros:**
- `id`: ID numérico de la sesión

**Retorna:** `Promise<Session | null>`

**Ejemplo:**
```typescript
const session = await memory.getSession(456);
if (session) {
  console.log('Sesión encontrada:', session.uuid);
}
```

---

##### `endSession(id)`

Finaliza una sesión activa.

**Parámetros:**
- `id`: ID numérico de la sesión

**Retorna:** `Promise<Session>`

**Ejemplo:**
```typescript
const endedSession = await memory.endSession(456);
console.log('Sesión finalizada:', endedSession.endedAt);
```

---

#### Método de Cierre

##### `close()`

Cierra la conexión con la base de datos.

**Retorna:** `void`

**Ejemplo:**
```typescript
// En cleanup de aplicación
memory.close();
```

---

## 📝 Tipos Principales

```typescript
interface Observation {
  id: number;
  uuid: string;
  sessionId: number;
  title: string;
  content: string;
  type: 'decision' | 'bug' | 'discovery' | 'note';
  topicKey: string | null;
  projectId: string;
  createdAt: Date;
  metadata: Record<string, unknown>;
}

interface Session {
  id: number;
  uuid: string;
  projectId: string;
  startedAt: Date;
  endedAt: Date | null;
  metadata: Record<string, unknown>;
}

interface SearchParams {
  query?: string;
  type?: Observation['type'];
  projectId?: string;
  topicKey?: string;
  limit?: number;
  offset?: number;
}

interface SearchResult {
  observations: Observation[];
  total: number;
}
```

## ⚡ Ejemplos Prácticos

### Ejemplo 1: Flujo Completo de Memoria

```typescript
import { MemoryEngine } from '@slorenzot/memento-core';

const memory = new MemoryEngine('./memory.db');

// Crear sesión para seguimiento
const session = await memory.createSession({
  projectId: 'my-app',
  metadata: { agent: 'claude' }
});

// Guardar observaciones durante el trabajo
await memory.createObservation({
  sessionId: session.id,
  title: 'Configuración de servidor',
  content: 'Usar Express.js con middleware de seguridad',
  type: 'decision',
  projectId: 'my-app',
  topicKey: 'backend'
});

await memory.createObservation({
  sessionId: session.id,
  title: 'Bug en autenticación',
  content: 'El JWT no expira correctamente',
  type: 'bug',
  projectId: 'my-app',
  topicKey: 'security'
});

// Buscar decisiones relacionadas
const decisions = await memory.search({
  type: 'decision',
  projectId: 'my-app'
});

console.log('Decisiones tomadas:', decisions.observations);

// Finalizar sesión
await memory.endSession(session.id);

// Cerrar conexión
memory.close();
```

### Ejemplo 2: Búsqueda Avanzada

```typescript
import { MemoryEngine } from '@slorenzot/memento-core';

const memory = new MemoryEngine('./memory.db');

// Búsqueda compleja con múltiples filtros
const results = await memory.search({
  query: 'base de datos arquitectura',
  type: 'decision',
  projectId: 'my-app',
  limit: 5,
  offset: 10
});

console.log(`Total de resultados: ${results.total}`);
results.observations.forEach((obs, index) => {
  console.log(`${index + 1}. ${obs.title}`);
  console.log(`   ${obs.content.substring(0, 100)}...`);
  console.log(`   Tipo: ${obs.type} | Tópico: ${obs.topicKey}`);
});

memory.close();
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
- `zod` - Validación de esquemas
- `nanoid` - Generación de IDs únicos

### Peer Dependencies
- `bun` v1.0+ (recomendado)
- `node` v20+ (compatible)

## 🛠️ Desarrollo

```bash
# Clonar el proyecto
git clone https://github.com/slorenzot/memento.git
cd memento/packages/core

# Instalar dependencias
bun install

# Desarrollo
bun run dev

# Build
bun run build

# Tests
bun test
```

## 📋 Changelog

### [0.1.0] - 2024-04-04
- **Added**: Versión inicial del motor de memoria
- **Added**: SQLite con FTS5 para búsqueda full-text
- **Added**: Gestión de sesiones y observaciones
- **Added**: Soporte completo de TypeScript

## 👤 Autor

**Soulberto Lorenzo**  
- GitHub: [@slorenzot](https://github.com/slorenzot)
- Email: slorenzot@gmail.com

## 📄 Licencia

Este paquete está bajo Licencia **Creative Commons Attribution-NonCommercial-NoDerivs 4.0 International**.

[Ver Licencia Completa](https://github.com/slorenzot/memento/blob/main/LICENSE)

---

**⚠️ Importante**: Este paquete tiene licencia restrictiva. Respeta los términos de la licencia CC BY-NC-ND 4.0.