# Solución de Problemas

## Problemas de Base de Datos

### Error "Database not initialized"

**Causa:** El archivo de base de datos SQLite no pudo ser creado o abierto.

**Solución:**
1. Verifica que el directorio existe y tiene permisos de escritura
2. Verifica que la variable de entorno `MEMENTO_DB_PATH` apunta a una ubicación válida
3. Revisa los permisos del archivo

```bash
# Verificar ruta de base de datos
memento status --section health

# Verificar que la ruta es escribible
touch ./data/memento.db
```

### Error "database is locked"

**Causa:** Otro proceso tiene un lock exclusivo sobre la base de datos.

**Solución:**
- El modo WAL permite lecturas concurrentes, pero las escrituras necesitan acceso exclusivo
- Busca procesos zombie usando la base de datos
- El PRAGMA `busy_timeout = 5000ms` debería manejar locks breves automáticamente

```bash
# Encontrar procesos usando la base de datos
lsof | grep memento.db
```

## Problemas de MCP

### El servidor MCP no responde

**Causa:** El proceso del servidor no está corriendo o no está configurado correctamente.

**Solución:**
1. Verifica que el servidor MCP inicia manualmente:

```bash
bun run mcp
# Debería iniciar sin errores
```

2. Revisa la configuración MCP de tu herramienta de IA:

```json
{
  "mcpServers": {
    "memento": {
      "command": "bun",
      "args": ["run", "--bun", "mcp"],
      "cwd": "/ruta/correcta/a/memento"
    }
  }
}
```

3. Reinicia tu herramienta de IA después de cambiar la configuración MCP

### Las herramientas no aparecen

**Causa:** El servidor MCP está corriendo pero las herramientas no están registradas.

**Solución:**
1. Revisa los logs del servidor por errores durante el inicio
2. Verifica que `@slorenzot/memento-core` esté instalado
3. Intenta ejecutar `memento status` para verificar que el motor funciona

## Problemas de Búsqueda

### La búsqueda no devuelve resultados

**Posibles causas:**
1. No hay observaciones todavía — guarda algunas primero
2. El índice FTS5 está desactualizado — reinicia la aplicación
3. La sintaxis de la consulta es incorrecta

**Solución:**
```bash
# Verificar que existen observaciones
memento status --section stats

# Probar una consulta simple
memento search "test"

# Revisar un proyecto específico
memento search "test" --project mi-app
```

### La búsqueda semántica no funciona

**Causa:** El modelo de embeddings aún no se ha descargado.

**Solución:**
- La primera búsqueda semántica dispara la descarga del modelo (~23MB)
- Requiere `@huggingface/transformers` como peer dependency opcional
- Verifica la conectividad de red para la descarga inicial

## Problemas del Web UI

### El build falla con error de `bun:sqlite`

**Causa:** Next.js webpack no soporta `bun:sqlite` nativamente.

**Solución:**
- El web-ui usa un polyfill de `better-sqlite3` configurado en `next.config.ts`
- Asegúrate de que `better-sqlite3` esté instalado: `bun add better-sqlite3`
- Si los problemas persisten, revisa la configuración de webpack externals

### El modo oscuro no funciona

**Causa:** La clase `.dark` no se está aplicando al elemento `<html>`.

**Solución:**
1. Revisa la consola del navegador por errores
2. Verifica que el toggle de tema en settings funciona
3. Intenta agregar manualmente `class="dark"` a `<html>` en DevTools

## Rendimiento

### Búsqueda lenta con muchas observaciones

**Solución:**
1. Usa filtros `type` y `project_id` para acotar resultados
2. Comienza con búsqueda por palabras clave (modo más rápido)
3. Solo usa semántica/híbrido cuando la búsqueda por palabras clave no encuentre lo que necesitas
4. Considera fusionar observaciones duplicadas

### Archivo de base de datos grande

**Solución:**
1. Purga observaciones eliminadas lógicamente:

```bash
memento status --section config  # Verificar tamaño de base de datos
```

2. Exporta y re-importa para compactar:

```bash
memento export --format json --output backup.json
# Eliminar base de datos antigua
# Importar limpia
memento import backup.json
```

## Obtener Ayuda

- Revisa las [Preguntas Frecuentes](/es/docs/faq) para preguntas comunes
- Repasa [Conceptos Core](/es/docs/core-concepts/observations) para patrones de uso
- Abre un issue en GitHub con pasos de reproducción
