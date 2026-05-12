# Sesiones

Las sesiones agrupan observaciones por conversación. Piensa en ellas como una "sesión de código" — todo lo que pasó entre abrir y cerrar tu editor.

## Ciclo de Vida

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   INICIADA    │────▶│   ACTIVA     │────▶│   TERMINADA  │
│  mem_session  │     │  observaciones│     │  mem_session  │
│  _start       │     │  se guardan  │     │  _end         │
└──────────────┘     └──────────────┘     └──────────────┘
```

1. **Inicio** — `mem_session_start` crea una nueva sesión con un ID de proyecto
2. **Activa** — todas las llamadas a `mem_save` se agrupan bajo la sesión activa
3. **Fin** — `mem_session_end` cierra la sesión (requerido para un ciclo de vida limpio)

## Creación Automática de Sesión

Si llamas `mem_save` sin iniciar una sesión primero, Memento crea una automáticamente. Esto es conveniente pero menos organizado — se recomienda la gestión explícita de sesiones.

## Resumen de Sesión

Al final de una conversación, usa `mem_session_summary` para capturar lo que se logró:

```
## Objetivo
Agregar soporte de modo oscuro al web UI

## Descubrimientos
- Tailwind CSS 4 usa la directiva @theme para design tokens
- Zustand 5 tiene una API simplificada sin necesidad de provider

## Logros
- Implementado toggle de modo oscuro con detección de preferencia del sistema
- Actualizados todos los componentes para usar variables CSS
- Agregada persistencia vía localStorage

## Próximos Pasos
- Agregar override de tema por página
- Probar con renderizado SSR

## Archivos Relevantes
- packages/web-ui/src/app/globals.css — design tokens
- packages/web-ui/src/stores/ui-store.ts — estado del tema
```

## Sesiones Múltiples

Solo una sesión puede estar activa a la vez. Iniciar una nueva sesión reemplaza la anterior. Esto coincide con el flujo de trabajo típico de código donde trabajas en una cosa a la vez.

## Metadatos de Sesión

Las sesiones llevan metadatos para filtrado y visualización:

```typescript
await engine.createSession({
  projectId: 'mi-proyecto',
  metadata: {
    agent: 'claude-3.5-sonnet',
    environment: 'development',
    task: 'implementar-auth',
  },
});
```

## Protocolo de Fin de Sesión

Siempre termina las sesiones antes de cerrar una conversación. Esto:
- Establece el timestamp `endedAt`
- Marca la sesión como completa en la UI
- Habilita el filtrado por sesión en las búsquedas

## Ver También

- [Observaciones](/es/docs/core-concepts/observations) — los datos almacenados en sesiones
- [Recuperación de Contexto](/es/docs/capabilities/context-recovery) — recuperar contexto de sesión después de compactación
