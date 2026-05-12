# Referencia CLI

Memento proporciona una interfaz de línea de comandos para flujos de trabajo basados en terminal.

## Instalación

```bash
bun install -g @slorenzot/memento-cli
```

O úsalo directamente con `bunx`:

```bash
bunx @slorenzot/memento-cli <comando>
```

## Opciones Globales

| Opción | Descripción |
|--------|-------------|
| `--project <id>` | Identificador del proyecto (por defecto: `default`) |
| `--db <ruta>` | Ruta de la base de datos (por defecto: `./data/memento.db`) |
| `--help` | Mostrar ayuda |
| `--version` | Mostrar versión |

## Comandos

### `memento save`

Guarda una observación.

```bash
memento save "Corregido query N+1 en UserList" \
  --type bug \
  --project mi-app \
  --topic bugfix/n1-query

# Con contenido desde stdin
echo "## Qué\nCorregido el query" | memento save "Bug fix" --content-file -
```

**Opciones:**
- `--type` — tipo de observación (por defecto: `note`)
- `--project` — identificador del proyecto
- `--topic` — clave de tema
- `--scope` — `project` o `personal`
- `--content-file` — leer contenido desde archivo

### `memento search`

Busca observaciones.

```bash
memento search "modelo de autenticación"
memento search "base de datos" --type decision --limit 5
memento search "rendimiento" --mode semantic
```

**Opciones:**
- `--type` — filtrar por tipo
- `--project` — filtrar por proyecto
- `--topic` — filtrar por clave de tema
- `--limit` — resultados máximos (por defecto: 10)
- `--mode` — `keyword`, `semantic`, o `hybrid`
- `--sort` — `relevance` o `chronological`

### `memento context`

Obtiene el contexto reciente de un proyecto.

```bash
memento context
memento context --project mi-app --limit 20
```

### `memento get`

Obtiene los detalles completos de una observación.

```bash
memento get 42
```

### `memento session`

Gestiona sesiones.

```bash
memento session start --project mi-app
memento session end
memento session list
```

### `memento export`

Exporta observaciones.

```bash
memento export --format json --output backup.json
memento export --project mi-app --type decision
```

### `memento import`

Importa desde un archivo exportado previamente.

```bash
memento import backup.json --project mi-app
```

### `memento status`

Diagnósticos del sistema.

```bash
memento status
memento status --section health
memento status --section stats
```

### `memento projects`

Lista proyectos.

```bash
memento projects list
```

### `memento pin` / `memento unpin`

Fija o desfija observaciones.

```bash
memento pin 42
memento unpin 42
```

### `memento lock` / `memento unlock`

Bloquea o desbloquea observaciones como solo lectura.

```bash
memento lock 42
memento unlock 42
```
