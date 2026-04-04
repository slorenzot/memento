# Memento

[![License: CC BY-NC-ND 4.0](https://img.shields.io/badge/License-CC_BY--NC--ND_4.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-nd/4.0/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.0+-black.svg)](https://bun.sh)
[![MCP](https://img.shields.io/badge/MCP-Protocol-green.svg)](https://modelcontextprotocol.io)
[![NPM Version](https://img.shields.io/npm/v/@memento/core.svg)](https://www.npmjs.com/package/@memento/core)

**Memento** es un sistema de memoria persistente diseñado específicamente para agentes de codificación de IA. Resuelve el problema del olvido proporcionando un cerebro persistente que permite a los agentes mantener contexto, aprender y mejorar a través del tiempo.

## ⚠️ Importante: Licencia Restrictiva

Este proyecto está bajo **Licencia CC BY-NC-ND 4.0**:
- ✅ **Uso personal y educacional permitido**
- ✅ **Compartir con atribución al autor**
- ❌ **Uso comercial NO permitido**
- ❌ **Modificaciones o forks NO permitidos**
- ❌ **Distribución de versiones modificadas NO permitida**

**Autor:** Soulberto Lorenzo (slorenzot@gmail.com)

## 🎯 Características Principales

- 🔍 **Búsqueda Full-text**: Búsqueda semántica con SQLite FTS5 y ranking BM25
- 🧠 **Memoria Persistente**: Almacenamiento duradero con SQLite
- 🔌 **MCP Integration**: Compatible con Model Context Protocol
- 🌐 **Multi-interfaz**: CLI, API HTTP, y Web UI
- 📊 **Sesiones Inteligentes**: Seguimiento de conversaciones y contexto
- ⚡ **Alto Rendimiento**: Optimizado con Bun runtime
- 🛡️ **Type Safety**: Desarrollo con TypeScript estricto
- 🧪 **Bien Testado**: Cobertura de pruebas completa

## 🚀 Instalación

### Requisitos Previos
- [Bun](https://bun.sh/) v1.0+ (runtime y package manager)
- Node.js v20+ (para compatibilidad)

### Instalación desde GitHub
```bash
# Clonar el repositorio
git clone https://github.com/slorenzot/memento.git
cd memento

# Instalar dependencias
bun install

# Construir el proyecto
bun run build

# Verificar instalación
bun test
```

## 📦 Paquetes NPM

- [`@memento/core`](https://www.npmjs.com/package/@memento/core) - Motor de memoria central
- [`@memento/mcp-server`](https://www.npmjs.com/package/@memento/mcp-server) - Servidor MCP
- [`@memento/cli`](https://www.npmjs.com/package/@memento/cli) - CLI interface
- [`@memento/api`](https://www.npmjs.com/package/@memento/api) - API HTTP
- [`@memento/web-ui`](https://www.npmjs.com/package/@memento/web-ui) - Interfaz web React

## 📦 Uso

### MCP Server (Recomendado para Agentes IA)

```bash
# Instalar globalmente
bun add -g @memento/mcp-server

# Iniciar servidor MCP
memento-server

# Configurar en MCP client (Claude Desktop, VS Code, etc.)
# Command: memento-server
```

**Herramientas MCP Disponibles:**
- `mem_save` - Guardar observaciones
- `mem_search` - Búsqueda full-text
- `mem_session_start` - Iniciar sesión
- `mem_session_end` - Finalizar sesión
- `mem_get` - Obtener observación específica
- `mem_update` - Actualizar observación
- `mem_delete` - Eliminar observación
- `mem_timeline` - Línea temporal
- `mem_stats` - Estadísticas
- `mem_list_sessions` - Listar sesiones
- `mem_get_session` - Obtener sesión
- `mem_import` - Importar datos
- `mem_export` - Exportar datos
- `mem_health` - Verificar salud
- `mem_config` - Configuración

### CLI Interface

```bash
# Instalar globalmente
bun add -g @memento/cli

# Búsqueda en memoria
memento search "consulta de búsqueda"

# Guardar nueva observación
memento save "Título" "Contenido de la observación"

# Obtener observación por ID
memento get <uuid>

# Ver estadísticas
memento stats

# Ver timeline
memento timeline
```

### HTTP API

```bash
# Instalar
bun add @memento/api

# Iniciar servidor API
memento-api

# Ejemplos de uso
curl http://localhost:3000/api/health
curl http://localhost:3000/api/observations
curl -X POST http://localhost:3000/api/observations \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","content":"Test content"}'
```

### Web UI

```bash
# Instalar
bun add @memento/web-ui

# Iniciar interfaz web
memento-web-ui

# Abrir http://localhost:5173
```

## 🏗️ Arquitectura

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Agentes IA    │    │   Web UI        │    │   CLI           │
│ (Claude/OpenAI) │    │   (React)       │    │   (Bun)         │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────┬────────────────┴───────────┬──────────┘
                 │                          │
            ┌────▼─────┐               ┌─────▼─────┐
            │  MCP     │               │  API      │
            │  Server  │               │  HTTP     │
            └─────┬─────┘               └─────┬─────┘
                  │                          │
                  └─────────┬──────────────────┘
                            │
                      ┌─────▼─────┐
                      │   Core    │
                      │ Memento   │
                      └─────┬─────┘
                            │
                      ┌─────▼─────┐
                      │ Database  │
                      │ (SQLite)  │
                      └───────────┘
```

## 🔧 Desarrollo

### Scripts Disponibles
```bash
# Instalar dependencias
bun install

# Construir todos los paquetes
bun run build

# Ejecutar servidor de desarrollo
bun run dev

# Ejecutar pruebas
bun test

# Ejecutar pruebas en modo watch
bun test --watch

# Verificar tipos
bun run typecheck

# Linting
bun run lint

# Linting con auto-fix
bun run lint:fix
```

### Estructura del Proyecto
```
memento/
├── packages/
│   ├── core/           # Motor de memoria central
│   ├── mcp-server/     # Servidor MCP
│   ├── api/            # API HTTP
│   ├── cli/            # CLI interface
│   └── web-ui/         # Interfaz web React
├── apps/
│   └── memento/        # Aplicación principal
└── tools/              # Build tools
```

## 🧪 Testing

```bash
# Ejecutar todas las pruebas
bun test

# Ejecutar pruebas específicas
bun test packages/core/src/MemoryEngine.test.ts

# Ejecutar en modo watch
bun test --watch
```

## ⚠️ Restricciones de Licencia

**PROHIBIDO:**
- ❌ Uso comercial sin autorización explícita
- ❌ Crear forks o versiones modificadas
- ❌ Distribuir versiones modificadas
- ❌ Usar para fines comerciales o empresariales
- ❌ Olvidar la atribución al autor original

**PERMITIDO:**
- ✅ Uso personal y educacional
- ✅ Compartir el código original sin modificaciones
- ✅ Atribuir correctamente al autor (Soulberto Lorenzo)
- ✅ Usar para proyectos personales no comerciales

## 👤 Autor

**Soulberto Lorenzo**  
- GitHub: [@slorenzot](https://github.com/slorenzot)
- Email: slorenzot@gmail.com

## 🙏 Agradecimientos

- [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) - Por la integración con agentes IA
- [SQLite](https://www.sqlite.org/) - Por el motor de base de datos
- [Bun](https://bun.sh/) - Por el runtime y package manager
- [TypeScript](https://www.typescriptlang.org/) - Por la seguridad de tipos

## 📄 Licencia

Este proyecto está bajo Licencia **Creative Commons Attribution-NonCommercial-NoDerivs 4.0 International**.

[Ver Licencia Completa](LICENSE)

---

**⚠️ Recordar:** Este proyecto tiene licencia restrictiva. Respeta los términos de la licencia CC BY-NC-ND 4.0.
