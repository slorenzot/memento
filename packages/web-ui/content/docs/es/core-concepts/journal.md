# Journal

El Journal es un log de evidencia append-only e immutable. A diferencia de las observaciones (que pueden actualizarse, mergearse o eliminarse), las entradas del journal son registros permanentes con auditoría completa.

## Cuándo usar el Journal

Usá el journal cuando necesitás:
- **Auditoría** — quién hizo qué, cuándo y por qué
- **Registros inmutables** — las entradas no pueden editarse ni eliminarse
- **Evidencia** — para compliance, debugging, o post-mortems

Usá observaciones para:
- Conocimiento en evolución que puede cambiar
- Decisiones que se refinan con el tiempo
- Notas generales y descubrimientos

## Estructura de una entrada del Journal

```
┌─────────────────────────────────────────────┐
│  Entrada del Journal #15                      │
│  Título: "Desplegué v2.1.0 a producción"     │
│  Tags: [deploy, production]                   │
│  Proyecto: mi-app                             │
│  Sesión: #7                                   │
│  Creada: 2025-01-15T14:30:00Z                │
├─────────────────────────────────────────────┤
│  Desplegué la versión 2.1.0 que contiene el  │
│  nuevo módulo de auth y correcciones de rate  │
│  limiting.                                    │
│                                               │
│  Hash de deploy: abc123def                    │
│  Plan de rollback: revertir a v2.0.9         │
│  Verificado: health check pasado              │
└─────────────────────────────────────────────┘
```

## Suplantación de entradas (Superseding)

Como las entradas del journal son inmutables, no podés editarlas. En su lugar, usá **superseding**:

```
Entrada #15: "Desplegué v2.1.0 a producción"
Entrada #16: "CORRECCIÓN: deploy de v2.1.0 revertido por memory leak"
              ↑ suplanta a #15
```

La entrada #15 se marca como `invalidated` con referencia a #16, preservando el historial completo.

## Tags

Los tags clasifican las entradas del journal para filtrado:

```typescript
await engine.writeJournal({
  title: 'Migración de base de datos completada',
  body: 'Agregué columna de embeddings a la tabla observations...',
  tags: ['migration', 'database', 'breaking-change'],
  projectId: 'mi-app',
});
```

Buscar por tags (lógica AND — todos los tags deben coincidir):

```typescript
await engine.searchJournal({
  tags: ['migration', 'breaking-change'],
});
```

## Herramientas

| Herramienta | Propósito |
|-------------|-----------|
| `mem_journal_write` | Crear una nueva entrada |
| `mem_journal_read` | Leer una entrada específica |
| `mem_journal_search` | Buscar entradas con FTS5, tags y filtros de fecha |

## Ver también

- [Observaciones](/es/docs/core-concepts/observations) — registros de conocimiento mutables
- [Sesiones](/es/docs/core-concepts/sessions) — agrupación por conversación
