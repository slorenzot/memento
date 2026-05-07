# @slorenzot/memento-cli

[![NPM Version](https://img.shields.io/npm/v/@slorenzot/memento-cli.svg)](https://www.npmjs.com/package/@slorenzot/memento-cli)
[![License: CC BY-NC-ND 4.0](https://img.shields.io/badge/License-CC_BY--NC--ND_4.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-nd/4.0/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)

> Command line interface for Memento memory system with search, management, and administrative commands for AI coding agents.

## 🚀 Instalación

```bash
# Using Bun (recomendado)
bun add -g @slorenzot/memento-cli

# Using npm
npm install -g @slorenzot/memento-cli

# Using yarn
yarn global add @slorenzot/memento-cli
```

## 💡 Uso Básico

### Shell/Bun
```bash
# Ver ayuda general
memento --help

# Ver versión
memento --version
```

## 🔧 Comandos Disponibles

### Comandos Principales

#### `search [query]`
Busca observaciones en la memoria usando búsqueda full-text.

**Parámetros:**
- `query` (opcional): Texto de búsqueda

**Opciones:**
- `--type, -t`: Filtrar por tipo (`decision|bug|discovery|note`)
- `--project, -p`: Filtrar por ID de proyecto
- `--limit, -l`: Número máximo de resultados
- `--offset, -o`: Paginación de resultados

**Ejemplos:**
```bash
# Búsqueda simple
memento search "arquitectura base de datos"

# Búsqueda filtrada
memento search "configuración" --type decision --limit 5

# Búsqueda en proyecto específico
memento search "bug" --project my-app --type bug
```

---

#### `save [title] [content]`
Guarda una nueva observación en la memoria.

**Parámetros:**
- `title`: Título de la observación
- `content`: Contenido de la observación

**Opciones:**
- `--type, -t`: Tipo de observación (`decision|bug|discovery|note`)
- `--topic, -k`: Tópico o categoría
- `--project, -p`: ID del proyecto
- `--metadata, -m`: Metadatos JSON

**Ejemplos:**
```bash
# Guardar observación simple
memento save "Decisión importante" "Usar PostgreSQL en producción"

# Guardar con tipo y proyecto
memento save "Bug encontrado" "Error de conexión" --type bug --project my-app

# Guardar con metadatos
memento save "Configuración completada" "Servidor listo" --metadata '{"status":"ready","port":3000}'
```

---

#### `get [id]`
Obtiene una observación específica por ID.

**Parámetros:**
- `id`: ID numérico de la observación

**Ejemplos:**
```bash
# Obtener observación por ID
memento get 123

# La salida mostrará todos los detalles de la observación
```

---

#### `update <id> [options]`
Actualiza una observación existente.

**Parámetros:**
- `id`: ID numérico de la observación

**Opciones:**
- `--title, -t`: Nuevo título
- `--content, -c`: Nuevo contenido
- `--type`: Nuevo tipo
- `--topic, -k`: Nuevo tópico

**Ejemplos:**
```bash
# Actualizar título
memento update 123 --title "Título corregido"

# Actualizar contenido
memento update 123 --content "Contenido actualizado"

# Actualizar múltiples campos
memento update 123 --title "Nuevo" --type decision
```

---

#### `delete <id>`
Elimina una observación por ID.

**Parámetros:**
- `id`: ID numérico de la observación

**Ejemplos:**
```bash
# Eliminar observación
memento delete 123
```

---

### Comandos de Sesiones

#### `session start [project]`
Inicia una nueva sesión de seguimiento.

**Parámetros:**
- `project` (opcional): ID del proyecto

**Ejemplos:**
```bash
# Iniciar sesión
memento session start my-app
```

---

#### `session end <id>`
Finaliza una sesión activa.

**Parámetros:**
- `id`: ID numérico de la sesión

**Ejemplos:**
```bash
# Finalizar sesión
memento session end 456
```

---

#### `session list [project]`
Lista sesiones del proyecto.

**Parámetros:**
- `project` (opcional): ID del proyecto

**Opciones:**
- `--limit, -l`: Número máximo de resultados

**Ejemplos:**
```bash
# Listar todas las sesiones
memento session list

# Listar sesiones de proyecto específico
memento session list my-app --limit 10
```

---

### Comandos de Utilidad

#### `stats`
Muestra estadísticas del sistema de memoria.

**Ejemplos:**
```bash
# Ver estadísticas
memento stats

# Salida esperada:
# Total observaciones: 150
# Por tipo: decision: 45, bug: 30, discovery: 50, note: 25
# Sesiones activas: 3
# Última actualización: 2024-04-04 10:30:00
```

---

#### `timeline [project]`
Muestra una línea temporal de observaciones.

**Parámetros:**
- `project` (opcional): ID del proyecto

**Opciones:**
- `--limit, -l`: Número máximo de resultados
- `--session, -s`: Filtrar por sesión ID

**Ejemplos:**
```bash
# Ver timeline completo
memento timeline

# Ver timeline de proyecto específico
memento timeline my-app --limit 20
```

---

## 📝 API Programática

### Uso en Node.js/TypeScript

```typescript
import { CLI } from '@slorenzot/memento-cli';

// Crear instancia CLI
const cli = new CLI('./data/memento.db');

// Ejecutar comando programáticamente
// Nota: Este uso es para integración personalizada
// Para uso normal, usar los comandos de shell

// Los comandos principales se ejecutan a través del método run()
cli.run(['search', 'arquitectura']);

// Cerrar conexión
cli.close();
```

## ⚡ Ejemplos Prácticos

### Ejemplo 1: Flujo de Trabajo Completo

```bash
# Iniciar sesión para seguimiento
SESSION_ID=$(memento session start my-app | grep "ID:" | cut -d' ' -f2)
echo "Sesión iniciada: $SESSION_ID"

# Guardar observaciones durante el trabajo
memento save "Decisión de arquitectura" "Usar microservicios" --project my-app
memento save "Bug encontrado" "Error en autenticación" --type bug --project my-app

# Buscar decisiones anteriores
memento search "arquitectura" --type decision --project my-app

# Finalizar sesión
memento session end $SESSION_ID
```

### Ejemplo 2: Script de Búsqueda y Análisis

```bash
#!/bin/bash

# Buscar bugs del proyecto
echo "=== Buscando bugs en proyecto ==="
memento search "bug" --type bug --project my-app --limit 10

# Buscar decisiones recientes
echo ""
echo "=== Decisiones recientes ==="
memento search --type decision --project my-app --limit 5

# Mostrar estadísticas
echo ""
echo "=== Estadísticas del sistema ==="
memento stats
```

### Ejemplo 3: Integración con Git Hooks

```bash
# pre-commit hook
#!/bin/bash

# Guardar commits como observaciones
MESSAGE=$(git log -1 --pretty=%B)
memento save "Commit: $(git rev-parse --short HEAD)" "$MESSAGE" --type note

echo "Commit guardado en Memento"
```

### Ejemplo 4: Exportación y Backup

```bash
# Exportar observaciones del proyecto
memento timeline my-app --limit 1000 > backup-observations.txt

# Crear backup con metadatos
echo "Backup creado: $(date)" > backup-info.txt
memento stats >> backup-info.txt
```

## 🔧 Configuración

### Archivo de Configuración

La CLI busca configuración en `~/.memento/config.json`:

```json
{
  "databasePath": "./data/memento.db",
  "defaultProject": "my-app",
  "outputFormat": "json",
  "pagination": {
    "limit": 20,
    "offset": 0
  }
}
```

### Variables de Entorno

- `MEMENTO_DB_PATH`: Ruta personalizada de base de datos
- `MEMENTO_DEFAULT_PROJECT`: Proyecto por defecto

**Ejemplos:**
```bash
# Usar base de datos personalizada
export MEMENTO_DB_PATH="/custom/path/database.db"
memento search "query"
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
- `commander` - Framework de CLI
- `chalk` - Colores en terminal
- `ora` - Indicadores de progreso
- `ink` - Componentes de UI en terminal
- `zod` - Validación de esquemas

### Peer Dependencies
- `bun` v1.0+ (recomendado)
- `node` v20+ (compatible)

## 🛠️ Desarrollo

```bash
# Clonar el proyecto
git clone https://github.com/slorenzot/memento.git
cd memento/packages/cli

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
- **Fixed**: Mejora en manejo de argumentos CLI
- **Updated**: Optimización de salida de comandos

### [0.1.0] - 2024-04-04
- **Added**: Versión inicial de la CLI
- **Added**: Comandos de gestión de memoria
- **Added**: Comandos de búsqueda y estadísticas
- **Added**: Soporte completo de colores y progreso

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