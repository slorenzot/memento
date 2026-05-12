# Recuperación de contexto

La recuperación de contexto es cómo Memento ayuda a los agentes de IA a recordar lo que pasó en sesiones anteriores o antes de una compactación de contexto.

## El problema

Los agentes de IA para código tienen ventanas de contexto limitadas. Cuando el contexto se llena:
1. Los mensajes más antiguos se compactan/descartan
2. El agente "olvida" lo que hizo antes
3. El trabajo se duplica o las decisiones se revisitan

## La solución: `mem_context`

`mem_context` devuelve observaciones recientes ordenadas por fecha de creación (más recientes primero), con metadata de sesión. A diferencia de `mem_search`, NO usa FTS5 — es una query cronológica simple.

```typescript
// Obtener contexto reciente para un proyecto
const context = await engine.getRecentContext({
  projectId: 'my-app',
  limit: 20,
});
```

## Cuándo usar

| Situación | Herramienta |
|-----------|-------------|
| Inicio de sesión | `mem_context` — ¿qué se hizo antes? |
| Después de compactación | `mem_context` — recuperar lo perdido |
| Buscar algo específico | `mem_search` — búsqueda FTS5 |
| Ver estado actual | `mem_status` — health, stats, config |

## Protocolo de recuperación

Después de compactación o recuperación de sesión:

1. Llamar `mem_context` inmediatamente para obtener observaciones recientes
2. Revisar los resúmenes de sesión (type: `summary`) para contexto de alto nivel
3. Verificar observaciones fijadas — representan info crítica siempre necesaria
4. Continuar trabajando con el contexto recuperado

## Filtrado por ámbito

```typescript
// Contexto específico del proyecto
await engine.getRecentContext({ projectId: 'mi-app', scope: 'project' });

// Preferencias personales y conocimiento cross-project
await engine.getRecentContext({ scope: 'personal' });

// Todo
await engine.getRecentContext({ limit: 50 });
```

## Ver también

- [Sesiones](/es/docs/core-concepts/sessions) — ciclo de vida de sesiones
- [Búsqueda](/es/docs/core-concepts/search) — búsqueda FTS5 y semántica
- [Pin y Lock](/es/docs/capabilities/pin-lock) — inyectar siempre observaciones críticas
