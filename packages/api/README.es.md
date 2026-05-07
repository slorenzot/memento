# @slorenzot/memento-api

[![NPM Version](https://img.shields.io/npm/v/@slorenzot/memento-api.svg)](https://www.npmjs.com/package/@slorenzot/memento-api)
[![License: CC BY-NC-ND 4.0](https://img.shields.io/badge/License-CC_BY--NC--ND_4.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-nd/4.0/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)

> RESTful HTTP API providing programmatic access to Memento memory system with endpoints for observations, sessions, and system management.

## 🚀 Instalación

```bash
# Using Bun (recomendado)
bun add @slorenzot/memento-api

# Using npm
npm install @slorenzot/memento-api
```

## 💡 Uso Básico

### TypeScript
```typescript
import { APIServer } from '@slorenzot/memento-api';

// Inicializar servidor API
const server = new APIServer(3000, './data/memento.db');

// Iniciar servidor HTTP
await server.start();

// El servidor estará disponible en http://localhost:3000
```

### Shell/Bun
```bash
# Ejecutar servidor API
bunx @slorenzot/memento-api

# O con configuración personalizada
API_PORT=8080 DATABASE_PATH=./custom.db bunx @slorenzot/memento-api
```

## 🔧 API Esencial

### Clase Principal

#### `APIServer(port: number, dbPath: string)`

Constructor del servidor API HTTP.

**Parámetros:**
- `port`: Puerto donde escuchar el servidor (ej: 3000)
- `dbPath`: Ruta al archivo de base de datos SQLite

**Ejemplo:**
```typescript
const server = new APIServer(3000, './data/memento.db');
```

---

#### Métodos de Control

##### `start()`

Inicia el servidor HTTP y comienza a escuchar solicitudes.

**Retorna:** `Promise<void>`

**Ejemplo:**
```typescript
const server = new APIServer(3000, './data/memento.db');
await server.start();
console.log('Servidor iniciado en http://localhost:3000');
```

---

##### `close()`

Detiene el servidor HTTP y cierra la conexión con la base de datos.

**Retorna:** `void`

**Ejemplo:**
```typescript
const server = new APIServer(3000, './data/memento.db');
await server.start();

// En cleanup o shutdown
server.close();
```

---

## 🌐 Endpoints API

### Salud del Sistema

#### `GET /api/health`

Verifica el estado del sistema API.

**Response:**
```json
{
  "status": "healthy",
  "version": "0.1.1",
  "database": "connected",
  "uptime": "2h 30m"
}
```

---

### Gestión de Observaciones

#### `GET /api/observations`

Lista observaciones con filtros opcionales.

**Query Params:**
- `query` (string): Término de búsqueda full-text
- `type` (string): Filtrar por tipo (`decision|bug|discovery|note`)
- `project_id` (string): Filtrar por ID de proyecto
- `topic_key` (string): Filtrar por tópico
- `limit` (number): Número máximo de resultados
- `offset` (number): Paginación de resultados

**Response:**
```json
{
  "observations": [
    {
      "id": 1,
      "uuid": "abc123",
      "sessionId": 456,
      "title": "Decisión importante",
      "content": "Usar PostgreSQL en producción",
      "type": "decision",
      "topicKey": "architecture",
      "projectId": "my-app",
      "createdAt": "2024-04-04T10:30:00Z",
      "metadata": {}
    }
  ],
  "total": 150,
  "limit": 10,
  "offset": 0
}
```

**Ejemplo cURL:**
```bash
curl "http://localhost:3000/api/observations?limit=10&offset=0"
```

---

#### `POST /api/observations`

Crea una nueva observación.

**Request Body:**
```json
{
  "title": "string (requerido)",
  "content": "string (requerido)",
  "type": "decision|bug|discovery|note (opcional, default: note)",
  "topicKey": "string|null (opcional)",
  "projectId": "string (opcional)",
  "metadata": "object (opcional)"
}
```

**Response:**
```json
{
  "id": 151,
  "uuid": "def456",
  "sessionId": 456,
  "title": "Decisión importante",
  "content": "Usar PostgreSQL en producción",
  "type": "decision",
  "topicKey": "architecture",
  "projectId": "my-app",
  "createdAt": "2024-04-04T11:00:00Z",
  "metadata": {}
}
```

**Ejemplo cURL:**
```bash
curl -X POST http://localhost:3000/api/observations \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Decisión importante",
    "content": "Usar PostgreSQL en producción",
    "type": "decision",
    "projectId": "my-app"
  }'
```

---

#### `GET /api/observations/:id`

Obtiene una observación específica por ID.

**URL Params:**
- `id`: ID numérico de la observación

**Response:**
```json
{
  "id": 123,
  "uuid": "abc123",
  "sessionId": 456,
  "title": "Decisión importante",
  "content": "Usar PostgreSQL en producción",
  "type": "decision",
  "topicKey": "architecture",
  "projectId": "my-app",
  "createdAt": "2024-04-04T10:30:00Z",
  "metadata": {}
}
```

---

#### `PUT /api/observations/:id`

Actualiza una observación existente.

**URL Params:**
- `id`: ID numérico de la observación

**Request Body:**
```json
{
  "title": "string (opcional)",
  "content": "string (opcional)",
  "type": "decision|bug|discovery|note (opcional)",
  "topicKey": "string|null (opcional)",
  "metadata": "object (opcional)"
}
```

**Response:**
```json
{
  "id": 123,
  "uuid": "abc123",
  "title": "Título actualizado",
  "content": "Contenido actualizado",
  "type": "decision",
  "topicKey": "architecture",
  "projectId": "my-app",
  "createdAt": "2024-04-04T10:30:00Z",
  "metadata": {}
}
```

---

#### `DELETE /api/observations/:id`

Elimina una observación.

**URL Params:**
- `id`: ID numérico de la observación

**Response:**
```json
{
  "success": true,
  "message": "Observación eliminada exitosamente"
}
```

---

### Gestión de Sesiones

#### `POST /api/sessions`

Crea una nueva sesión.

**Request Body:**
```json
{
  "projectId": "string (opcional)",
  "metadata": "object (opcional)"
}
```

**Response:**
```json
{
  "id": 457,
  "uuid": "session-uuid-123",
  "projectId": "my-app",
  "startedAt": "2024-04-04T11:00:00Z",
  "endedAt": null,
  "metadata": {}
}
```

---

#### `PUT /api/sessions/:id/end`

Finaliza una sesión.

**URL Params:**
- `id`: ID numérico de la sesión

**Response:**
```json
{
  "id": 457,
  "uuid": "session-uuid-123",
  "projectId": "my-app",
  "startedAt": "2024-04-04T11:00:00Z",
  "endedAt": "2024-04-04T12:00:00Z",
  "metadata": {}
}
```

---

#### `GET /api/sessions`

Lista sesiones con filtros.

**Query Params:**
- `project_id` (string): Filtrar por ID de proyecto
- `limit` (number): Número máximo de resultados
- `offset` (number): Paginación

---

### Utilidades

#### `GET /api/stats`

Obtiene estadísticas del sistema.

**Response:**
```json
{
  "totalObservations": 150,
  "totalSessions": 45,
  "byType": {
    "decision": 45,
    "bug": 30,
    "discovery": 50,
    "note": 25
  },
  "byProject": {
    "my-app": 100,
    "other-project": 50
  }
}
```

---

#### `GET /api/timeline`

Obtiene línea temporal de observaciones.

**Query Params:**
- `project_id` (string): Filtrar por proyecto
- `session_id` (number): Filtrar por sesión
- `limit` (number): Número de resultados

---

## ⚡ Ejemplos Prácticos

### Ejemplo 1: Inicialización Completa del Servidor

```typescript
import { APIServer } from '@slorenzot/memento-api';

// Configuración
const port = parseInt(process.env.API_PORT || '3000', 10);
const dbPath = process.env.DATABASE_PATH || './data/memento.db';

// Crear e iniciar servidor
const server = new APIServer(port, dbPath);

// Manejo de shutdown
process.on('SIGINT', () => {
  console.log('Cerrando servidor...');
  server.close();
  process.exit(0);
});

// Iniciar servidor
await server.start();
console.log(`Servidor API iniciado en puerto ${port}`);
```

### Ejemplo 2: Uso con Express.js Personalizado

```typescript
import { APIServer } from '@slorenzot/memento-api';
import express from 'express';

// Crear servidor API Memento
const mementoAPI = new APIServer(3001, './data/memento.db');

// Crear servidor Express personalizado
const app = express();

// Agregar middleware de CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  next();
});

// Endpoint personalizado que usa Memento
app.get('/api/my-observations', async (req, res) => {
  // Aquí podrías usar el motor de memoria internamente
  // para lógica personalizada
  res.json({ message: 'Endpoint personalizado' });
});

// Iniciar servidores
await mementoAPI.start();
app.listen(3000, () => {
  console.log('Servidor Express en puerto 3000');
  console.log('Servidor Memento en puerto 3001');
});
```

### Ejemplo 3: Integración con Frontend

```typescript
// En aplicación React/Vue/Next.js
const API_BASE = 'http://localhost:3000/api';

// Función para buscar observaciones
async function searchObservations(query: string) {
  const response = await fetch(
    `${API_BASE}/observations?query=${encodeURIComponent(query)}`
  );
  return await response.json();
}

// Función para crear observación
async function createObservation(data: {
  title: string;
  content: string;
  type: string;
}) {
  const response = await fetch(`${API_BASE}/observations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  return await response.json();
}

// Uso en componente
const results = await searchObservations('arquitectura');
console.log('Resultados:', results);
```

### Ejemplo 4: Script de Automatización con cURL

```bash
#!/bin/bash

API_URL="http://localhost:3000/api"

# Crear sesión
SESSION=$(curl -s -X POST "$API_URL/sessions" \
  -H "Content-Type: application/json" \
  -d '{"projectId":"automated-script","metadata":{"type":"automation"}}')

SESSION_ID=$(echo $SESSION | grep -o '"id":[0-9]*' | grep -o '[0-9]*')
echo "Sesión creada: $SESSION_ID"

# Guardar observación
curl -s -X POST "$API_URL/observations" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"Automatización completada\",
    \"content\": \"Script ejecutado exitosamente\",
    \"type\": \"note\",
    \"projectId\": \"automated-script\"
  }"

# Finalizar sesión
curl -s -X PUT "$API_URL/sessions/$SESSION_ID/end"
echo "Sesión finalizada"
```

## 🔧 Configuración

### Variables de Entorno

- `API_PORT`: Puerto del servidor (default: 3000)
- `DATABASE_PATH`: Ruta a base de datos (default: ./data/memento.db)
- `JWT_SECRET`: Secreto para autenticación JWT (si se implementa)
- `CORS_ORIGIN`: Orígenes permitidos para CORS (default: *)

**Ejemplo:**
```bash
# Configurar puerto y base de datos
export API_PORT=8080
export DATABASE_PATH=/custom/path/database.db
bunx @slorenzot/memento-api
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
- `@slorenzot/memento-core` - Motor de memoria
- `express` - Framework de servidor HTTP
- `cors` - Middleware de CORS
- `helmet` - Seguridad de cabeceras HTTP
- `express-rate-limit` - Limitación de tasa de peticiones
- `jsonwebtoken` - Autenticación JWT
- `zod` - Validación de esquemas
- `dotenv` - Gestión de variables de entorno

### Peer Dependencies
- `bun` v1.0+ (recomendado)
- `node` v20+ (compatible)

## 🛠️ Desarrollo

```bash
# Clonar el proyecto
git clone https://github.com/slorenzot/memento.git
cd memento/packages/api

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

### [0.1.1] - 2024-04-04
- **Added**: API Server básico con endpoints RESTful
- **Added**: Endpoints de gestión de observaciones
- **Added**: Endpoints de gestión de sesiones
- **Added**: Endpoints de utilidad (stats, timeline)
- **Fixed**: Actualización de dependencias core

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