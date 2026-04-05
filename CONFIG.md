# Configuración de Memento

Memento se puede configurar mediante un archivo `.mementorc` en la raíz del proyecto.

## Archivo .mementorc

El archivo `.mementorc` es un archivo JSON que contiene la configuración del proyecto:

```json
{
  "storageMethod": "database",
  "dbPath": ".memento/db/memento.db",
  "storagePath": "database/storage",
  "projectId": "my-project"
}
```

### Opciones de Configuración

#### `storageMethod` (opcional)
- **Tipo**: `"database"` | `"storage"`
- **Por defecto**: `"database"`
- **Descripción**: Método de almacenamiento a utilizar
  - `"database"`: Usa SQLite para almacenamiento persistente (recomendado)
  - `"storage"`: Usa almacenamiento basado en archivos (legacy)

#### `dbPath` (opcional)
- **Tipo**: `string`
- **Por defecto**: `".memento/db/memento.db"`
- **Descripción**: Ruta a la base de datos SQLite (solo se usa cuando `storageMethod` es `"database"`)
- **Rutas soportadas**:
  - Ruta relativa: `.memento/db/memento.db` (relativa al directorio del proyecto)
  - Ruta absoluta: `/absolute/path/to/memento.db`
  - Ruta con home: `~/.memento/db/memento.db`

#### `storagePath` (opcional)
- **Tipo**: `string`
- **Por defecto**: `"database/storage"`
- **Descripción**: Ruta al directorio de almacenamiento (usado para almacenamiento legacy basado en archivos)

#### `projectId` (opcional)
- **Tipo**: `string`
- **Por defecto**: Lee el nombre del `package.json`, o usa `"default"` si no está disponible
- **Descripción**: Identificador único del proyecto

## Variables de Entorno

También puedes sobrescribir la configuración usando variables de entorno:

```bash
MEMENTO_STORAGE_METHOD=database
MEMENTO_DB_PATH=/custom/path/memento.db
MEMENTO_STORAGE_PATH=/custom/storage
MEMENTO_PROJECT_ID=my-project
```

## Prioridad de Configuración

La configuración se carga en el siguiente orden (de menor a mayor prioridad):

1. Configuración por defecto
2. Archivo `.mementorc` del proyecto (busca recursivamente hacia arriba)
3. Archivo de configuración global (`~/.memento/config`)
4. Variables de entorno

## Ejemplo de Uso

### Configuración Local por Proyecto

Crea un archivo `.mementorc` en la raíz de tu proyecto:

```json
{
  "storageMethod": "database",
  "dbPath": ".memento/db/memento.db",
  "projectId": "my-awesome-app"
}
```

Esto creará una base de datos local en `.memento/db/memento.db` relativa a la raíz del proyecto.

### Configuración Global

Si quieres compartir la base de datos entre varios proyectos, puedes usar una ruta absoluta:

```json
{
  "storageMethod": "database",
  "dbPath": "~/.memento/shared/memento.db",
  "projectId": "shared-workspace"
}
```

### Sin Configuración

Si no creas un archivo `.mementorc`, Memento usará los valores por defecto:
- Base de datos en `.memento/db/memento.db`
- Project ID basado en el nombre del `package.json`
