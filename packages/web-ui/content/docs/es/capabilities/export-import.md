# Exportar e Importar

Exportá observaciones a formato JSON, XML o TXT para backups, migración, o compartir entre proyectos.

## Exportar

```bash
# Exportar todas las observaciones como JSON
memento export --format json --output backup.json

# Exportar por proyecto
memento export --project mi-app --format json

# Exportar por tipo y rango de fechas
memento export --type decision --from 2025-01-01 --to 2025-01-31
```

### Vía MCP

```typescript
// mem_export
{
  format: "json",           // json | xml | txt
  project_id: "mi-app",     // filtro opcional
  type: "decision",         // filtro opcional
  topic_key: "architecture", // filtro opcional
  date_from: "2025-01-01",  // opcional
  date_to: "2025-01-31",    // opcional
  include_deleted: false     // incluir eliminados soft?
}
```

### Respuesta

```json
{
  "format": "json",
  "recordCount": 42,
  "exportedAt": "2025-01-15T10:30:00Z",
  "content": "..."
}
```

## Formatos

| Formato | Caso de uso |
|---------|-------------|
| `json` | Legible por máquinas, re-importable, integración API |
| `xml` | Sistemas enterprise, integraciones SOAP |
| `txt` | Legible por humanos, grep-friendly, notas |

## Importar

Importar datos de un archivo JSON previamente exportado:

```bash
memento import backup.json --project mi-app
```

## Filtros

Todos los filtros son opcionales:

| Filtro | Descripción |
|--------|-------------|
| `project_id` | Exportar observaciones de un proyecto específico |
| `type` | Exportar solo un tipo de observación específico |
| `topic_key` | Exportar observaciones con un topic específico |
| `date_from` | String de fecha ISO — exportar desde esta fecha |
| `date_to` | String de fecha ISO — exportar hasta esta fecha |
| `include_deleted` | Incluir observaciones eliminadas soft |

## Ver también

- [Observaciones](/es/docs/core-concepts/observations) — lo que estás exportando
- [Merge](/es/docs/capabilities/merge) — consolidar después de importar
