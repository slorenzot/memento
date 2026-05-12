# Merge

Mergeá observaciones relacionadas en un único registro sintetizado. Útil para consolidar observaciones duplicadas o superpuestas.

## Estrategias

| Estrategia | Cómo funciona |
|------------|---------------|
| `by_topic` | Merge todas las observaciones con el mismo `topic_key` |
| `by_similarity` | Merge observaciones con similitud Jaccard > 0.85 |
| `by_ids` | Merge IDs de observaciones específicas |

## Siempre hacer dry-run primero

```typescript
// Previsualizar qué se mergearía (sin cambios)
const preview = await engine.mergeObservations({
  projectId: 'mi-app',
  topicKey: 'architecture/auth-model',
  strategy: 'by_topic',
  dryRun: true,
});
// Resultado: "Preview: 3 merge groups found (dry run)"
```

Revisar la preview, luego ejecutar:

```typescript
const result = await engine.mergeObservations({
  projectId: 'mi-app',
  topicKey: 'architecture/auth-model',
  strategy: 'by_topic',
  dryRun: false,
});
// Resultado: "Merged 3 groups (12 observations consolidated)"
```

## Qué pasa durante el merge

1. **Identificar candidatos** — basado en la estrategia
2. **Sintetizar** — combinar contenido de todas las observaciones del grupo
3. **Crear merged** — una nueva observación reemplaza las originales
4. **Soft-delete originales** — las observaciones fuente se eliminan soft (no se borran permanentemente)

La observación merged:
- Hereda el `topic_key` del grupo
- Contiene contenido sintetizado de todos los originales
- Se etiqueta con metadata de merge

## Por similitud

La estrategia `by_similarity` usa similitud Jaccard sobre word sets:

```
Observación A: "SQLite FTS5 no maneja bien caracteres especiales"
Observación B: "FTS5 tiene problemas con caracteres especiales en SQLite"

Similitud Jaccard > 0.85 → CANDIDATO A MERGE
```

## Por IDs

Para control manual:

```typescript
await engine.mergeObservations({
  projectId: 'mi-app',
  observationIds: [42, 43, 44],
  strategy: 'by_ids',
});
```

## Ver también

- [Observaciones](/es/docs/core-concepts/observations) — topic keys y agrupación
- [Exportar e Importar](/es/docs/capabilities/export-import) — backup antes de mergear
