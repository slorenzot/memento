# Preguntas Frecuentes

## General

### ¿Qué es Memento?

Memento es un sistema de memoria persistente para agentes de codificación de IA. Captura decisiones, descubrimientos, bugs y patrones de tus sesiones de código y los hace recuperables entre conversaciones.

### ¿En qué se diferencia de usar notas?

Memento está diseñado para que los agentes de IA lo usen automáticamente. Se integra vía MCP para que tu asistente de IA (Claude, Cursor, OpenCode) pueda guardar y recuperar memorias sin que copies cosas manualmente. También proporciona búsqueda de texto completo, búsqueda semántica, des duplicación y seguimiento de sesiones.

### ¿Necesito tener un servidor corriendo?

No. Memento usa SQLite — la base de datos es un solo archivo en tu máquina. Sin base de datos externa, sin Docker, sin servicio en la nube.

### ¿Mis datos son privados?

Sí. Todo se almacena localmente en un archivo SQLite. No se envían datos a servicios externos. La búsqueda semántica usa embeddings locales vía `@huggingface/transformers`.

## Configuración

### ¿Qué paquete debería instalar?

Depende de tu caso de uso:

- **Usuario de agente de IA** → Instala el servidor MCP (`@slorenzot/memento-mcp-server`)
- **Usuario de terminal** → Instala el CLI (`@slorenzot/memento-cli`)
- **Dashboard visual** → Instala el Web UI (`@slorenzot/memento-web-ui`)
- **Construir herramientas personalizadas** → Usa el paquete core (`@slorenzot/memento-core`)

### ¿Puedo usar múltiples paquetes juntos?

¡Sí! Todos comparten la misma base de datos. Puedes tener el servidor MCP corriendo para tu agente de IA mientras usas el CLI para búsquedas rápidas y el Web UI para navegar.

### ¿Funciona con Node.js?

Memento está construido para Bun (`bun:sqlite`). El Web UI usa `better-sqlite3` como polyfill de webpack para funcionar en Next.js. Para Node.js puro, necesitarías proveer tu propio binding de SQLite.

## Uso

### ¿Para qué sirven los tipos de observación?

Los tipos ayudan a filtrar y organizar memorias. Los 10 tipos cubren categorías comunes:

- `decision` — decisiones de arquitectura
- `bug` — correcciones de bugs con causa raíz
- `discovery` — hallazgos no obvios
- `pattern` — convenciones establecidas
- `summary` — resúmenes de sesión
- `learning` — lecciones extraídas
- `note` — información general
- `architecture` — diseño de sistema
- `config` — cambios de configuración
- `preference` — preferencias del usuario

### ¿Cómo funcionan las claves de tema?

Las claves de tema son strings jerárquicos que agrupan observaciones relacionadas:

```
architecture/auth-model
bugfix/n1-query
pattern/api-routing
```

Úsalas para organizar observaciones por preocupación. Permiten fusión, upsert y búsqueda filtrada.

### ¿Qué pasa cuando se llena el contexto?

Llama `mem_context` para recuperar observaciones recientes. Las observaciones fijadas siempre se incluyen. Los resúmenes de sesión dan contexto de alto nivel de lo que se logró.

### ¿Puedo hacer backup de mis datos?

¡Sí! Usa `mem_export` o el CLI:

```bash
memento export --format json --output backup.json
```

## Ver También

- [Inicio Rápido](/es/docs/quickstart) — para comenzar
- [Solución de Problemas](/es/docs/troubleshooting) — problemas comunes
