# Captura pasiva

La captura pasiva extrae aprendizajes de contenido de texto — como respuestas de agentes, code reviews, o notas de sesión — sin requerir llamadas explícitas a `mem_save` por cada item.

## Cómo funciona

1. **Parsear** — busca secciones como `## Key Learnings:` o `## Aprendizajes Clave:`
2. **Extraer** — bullets individuales o items numerados
3. **Deduplicar dentro del batch** — similitud Jaccard > 0.85 elimina duplicados
4. **Deduplicar contra la DB** — verifica aprendizajes existentes para evitar re-guardar
5. **Crear** — guarda items nuevos y únicos como observaciones tipo `learning`

## Uso

```typescript
const result = await engine.capturePassive({
  content: `
    ## Aprendizajes Clave:
    - SQLite FTS5 no maneja bien caracteres especiales en queries por prefijo
    - El modo WAL requiere manejo cuidadoso del pool de conexiones
    - Siempre usar queries parametrizadas con cláusulas FTS5 MATCH
  `,
  projectId: 'mi-app',
  source: 'code-review',
});
// Resultado: "Captured 3 learnings, 0 duplicates"
```

## Headers de sección soportados

El parser reconoce estos patrones de heading:

- `## Key Learnings:`
- `## Aprendizajes Clave:`
- `## Learnings:`
- `## Lecciones Aprendidas:`

## Deduplicación

La captura pasiva usa similitud Jaccard (overlap de word-set > 0.85) para detectar duplicados:

1. **Dentro del batch** — si dos items en el mismo texto son similares, solo se guarda uno
2. **Contra existentes** — si una observación `learning` existente en la DB es similar, la nueva se saltea

Esto significa que podés ejecutar `mem_capture_passive` sobre el mismo contenido múltiples veces sin crear duplicados.

## Cuándo usar

- Al final de una sesión de código con un agente de IA
- Después de un code review
- Cuando importás notas de fuentes externas
- Después de leer documentación o artículos

## Ver también

- [Observaciones](/es/docs/core-concepts/observations) — el tipo `learning`
- [Sesiones](/es/docs/core-concepts/sessions) — agrupar aprendizajes capturados
