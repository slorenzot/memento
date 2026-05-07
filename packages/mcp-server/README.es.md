# @slorenzot/memento-mcp-server

[![NPM Version](https://img.shields.io/npm/v/@slorenzot/memento-mcp-server.svg)](https://www.npmjs.com/package/@slorenzot/memento-mcp-server)
[![License: CC BY-NC-ND 4.0](https://img.shields.io/badge/License-CC_BY--NC--ND_4.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-nd/4.0/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)
[![MCP](https://img.shields.io/badge/MCP-Protocol-green.svg)](https://modelcontextprotocol.io)

> Model Context Protocol (MCP) server providing 15 memory tools for AI agent integration with Claude Desktop, VS Code, and other MCP clients.

## 🚀 Instalación

```bash
# Using Bun (recomendado)
bun add @slorenzot/memento-mcp-server

# Using npm
npm install @slorenzot/memento-mcp-server
```

## 💡 Uso Básico

### TypeScript
```typescript
import { MCPServer } from '@slorenzot/memento-mcp-server';

// Inicializar servidor MCP
const server = new MCPServer('./data/memento.db');

// Iniciar servidor (usa stdio para comunicación MCP)
// Nota: Este servidor está diseñado para ser ejecutado por clientes MCP
// No es necesario llamar start() manualmente en producción
```

### Shell/Bun
```bash
# Ejecutar servidor MCP (recomendado)
npx -p @slorenzot/memento-mcp-server

# O usando bunx (si está instalado globalmente)
bunx @slorenzot/memento-mcp-server

# Usar con variable de entorno para base de datos personalizada
MEMENTO_DB_PATH=/custom/path/database.db npx -p @slorenzot/memento-mcp-server
```

## 🔧 API Esencial

### Clase Principal

#### `MCPServer(dbPath?: string)`

Constructor del servidor MCP con integración automática al motor de memoria.

**Parámetros:**
- `dbPath` (opcional): Ruta al archivo de base de datos. Default: `'./data/memento.db'`

**Ejemplo:**
```typescript
const server = new MCPServer('./custom/path.db');
```

---

#### Métodos de Control

##### `start()`

Inicia el servidor MCP y comienza a escuchar solicitudes MCP via stdio.

**Retorna:** `Promise<void>`

**Nota:** Este método es llamado automáticamente cuando el servidor se inicia como proceso independiente.

---

##### `close()`

Detiene el servidor MCP y cierra la conexión con la base de datos.

**Retorna:** `void`

**Ejemplo:**
```typescript
const server = new MCPServer();

// En cleanup o shutdown
server.close();
```

---

## 🛠️ Herramientas MCP Disponibles

El servidor proporciona 15 herramientas MCP para gestión de memoria:

### Gestión de Observaciones

#### `mem_save`
Guarda una nueva observación en la memoria.

**Parámetros:**
```typescript
{
  title: string;
  content: string;
  type?: 'decision' | 'bug' | 'discovery' | 'note';
  topic_key?: string;
  project_id?: string;
  metadata?: Record<string, unknown>;
}
```

**Ejemplo de uso:**
```typescript
await mem_save({
  title: 'Decisión de arquitectura',
  content: 'Usar PostgreSQL en lugar de MySQL',
  type: 'decision',
  project_id: 'my-project'
});
```

---

#### `mem_search`
Busca observaciones usando búsqueda full-text.

**Parámetros:**
```typescript
{
  query?: string;
  type?: 'decision' | 'bug' | 'discovery' | 'note';
  project_id?: string;
  topic_key?: string;
  limit?: number;
  offset?: number;
}
```

---

#### `mem_get_observation`
Obtiene una observación específica por ID.

**Parámetros:**
```typescript
{
  id: number;
}
```

---

#### `mem_update`
Actualiza una observación existente.

**Parámetros:**
```typescript
{
  id: number;
  title?: string;
  content?: string;
  type?: 'decision' | 'bug' | 'discovery' | 'note';
  topic_key?: string;
  metadata?: Record<string, unknown>;
}
```

---

#### `mem_delete`
Elimina una observación por ID.

**Parámetros:**
```typescript
{
  id: number;
}
```

---

### Gestión de Sesiones

#### `mem_session_start`
Inicia una nueva sesión para seguimiento de conversaciones.

**Parámetros:**
```typescript
{
  project_id: string;
  metadata?: Record<string, unknown>;
}
```

---

#### `mem_session_end`
Finaliza una sesión activa.

**Parámetros:**
```typescript
{
  id: number;
}
```

---

#### `mem_list_sessions`
Lista todas las sesiones del proyecto.

**Parámetros:**
```typescript
{
  project_id?: string;
  limit?: number;
  offset?: number;
}
```

---

#### `mem_get_session`
Obtiene una sesión específica.

**Parámetros:**
```typescript
{
  id: number;
}
```

---

### Herramientas de Utilidad

#### `mem_timeline`
Obtiene una línea temporal de observaciones.

**Parámetros:**
```typescript
{
  project_id?: string;
  session_id?: number;
  limit?: number;
  offset?: number;
}
```

---

#### `mem_stats`
Obtiene estadísticas del sistema de memoria.

**Retorna:** Métricas de uso, totales por tipo, etc.

---

#### `mem_import`
Importa observaciones desde JSON.

**Parámetros:**
```typescript
{
  data: Array<{
    title: string;
    content: string;
    type?: string;
    project_id?: string;
  }>;
}
```

---

#### `mem_export`
Exporta observaciones a JSON.

**Parámetros:**
```typescript
{
  project_id?: string;
  type?: string;
  limit?: number;
}
```

---

### Herramientas de Sistema

#### `mem_health`
Verifica el estado del sistema de memoria.

**Retorna:** Estado de conexión, salud de base de datos, etc.

---

#### `mem_config`
Obtiene la configuración actual del servidor.

**Retorna:** Configuración de rutas, versión, etc.

---

## ⚡ Ejemplos Prácticos

### Ejemplo 1: Integración con Claude Desktop

```json
{
  "mcpServers": {
    "memento": {
      "command": "bun",
      "args": ["run", "node_modules/@slorenzot/memento-mcp-server/dist/index.js"],
      "env": {
        "DATABASE_PATH": "./data/memento.db"
      }
    }
  }
}
```

### Ejemplo 2: Uso Programático del Servidor

```typescript
import { MCPServer } from '@slorenzot/memento-mcp-server';

// Crear servidor personalizado
const server = new MCPServer('./memory.db');

// El servidor manejará automáticamente solicitudes MCP
// cuando sea ejecutado por un cliente MCP

// Para control manual (testing)
const toolResult = await server.handleToolCall('mem_save', {
  title: 'Test observación',
  content: 'Contenido de prueba',
  type: 'note',
  project_id: 'test-project'
});

console.log('Resultado:', toolResult);

// Cerrar cuando termine
server.close();
```

### Ejemplo 3: Flujo Completo de Sesión

```typescript
// Usando herramientas MCP a través del servidor

// 1. Iniciar sesión
const sessionStart = await mem_session_start({
  project_id: 'my-app',
  metadata: { agent: 'claude' }
});

console.log('Sesión iniciada:', sessionStart.id);

// 2. Guardar observaciones durante trabajo
await mem_save({
  title: 'Configuración completada',
  content: 'Servidor configurado en puerto 3000',
  type: 'decision',
  project_id: 'my-app'
});

// 3. Buscar decisiones anteriores
const searchResults = await mem_search({
  query: 'configuración servidor',
  type: 'decision'
});

console.log('Decisiones encontradas:', searchResults.observations);

// 4. Finalizar sesión
await mem_session_end({ id: sessionStart.id });

// 5. Obtener estadísticas
const stats = await mem_stats();
console.log('Total observaciones:', stats.total);
console.log('Por tipo:', stats.by_type);
```

## 🔗 Integración con Clientes MCP

### Claude Desktop
```json
{
  "mcpServers": {
    "memento": {
      "command": "bun",
      "args": [
        "run",
        "node_modules/@slorenzot/memento-mcp-server/dist/index.js"
      ],
      "env": {
        "DATABASE_PATH": "${userHome}/.memento/database.db"
      }
    }
  }
}
```

### VS Code (con extensión MCP)
```json
{
  "mcp.servers": {
    "memento": {
      "command": "bun",
      "args": [
        "run",
        "node_modules/@slorenzot/memento-mcp-server/dist/index.js"
      ]
    }
  }
}
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
- `@modelcontextprotocol/sdk` - SDK de Model Context Protocol
- `zod` - Validación de esquemas

### Peer Dependencies
- `bun` v1.0+ (recomendado)
- `node` v20+ (compatible)

## 🛠️ Desarrollo

```bash
# Clonar el proyecto
git clone https://github.com/slorenzot/memento.git
cd memento/packages/mcp-server

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
- **Fixed**: Actualización de dependencias core
- **Fixed**: Corrección de método deleteObservation
- **Updated**: Mejora en validación de parámetros

### [0.1.0] - 2024-04-04
- **Added**: Versión inicial del servidor MCP
- **Added**: 15 herramientas de gestión de memoria
- **Added**: Integración completa con Model Context Protocol
- **Added**: Soporte para Claude Desktop y VS Code

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