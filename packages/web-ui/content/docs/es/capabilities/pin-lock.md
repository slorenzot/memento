# Pin y Lock

Dos mecanismos de protección para observaciones importantes.

## Pin (Fijar)

Las observaciones fijadas se **inyectan siempre en el system prompt del agente de IA** por el plugin de OpenCode. Aparecen antes que las no fijadas, dentro del budget de tokens.

### Cuándo fijar

- Decisiones de arquitectura críticas que afectan todo el trabajo
- Convenciones específicas del proyecto que el agente debe seguir
- Bugs activos o blockers de los que el agente debería estar al tanto
- Configuración que impacta la generación de código

### Cuándo NO fijar

- Conocimiento general (la búsqueda lo encuentra)
- Información temporal (se volverá obsoleta)
- Contenido largo (desperdicia tokens en cada conversación)

### Uso

```bash
# Vía CLI
memento pin 42
memento unpin 42

# Vía MCP
# mem_pin → { id: 42 }
# mem_unpin → { id: 42 }
```

## Lock (Solo lectura)

Las observaciones locked **no pueden ser modificadas ni eliminadas por agentes de IA**. Solo el usuario puede desbloquear vía CLI.

### Cuándo bloquear

- Decisiones a nivel contrato que no deberían cambiar sin aprobación humana
- Observaciones relacionadas con compliance o seguridad
- Observaciones que fueron revisadas y validadas

### Uso

```bash
# Vía CLI
memento lock 42
memento unlock 42

# Vía MCP
# mem_lock → { id: 42 }
# mem_unlock → { id: 42 }
```

### Protección de solo lectura

Cuando un agente intenta modificar una observación locked:

```
Agent: mem_update({ id: 42, content: "..." })
Respuesta: "Observation #42 is read-only. Cannot modify."
```

Cuando un agente intenta usar `mem_replace` en contenido locked:

```
Agent: mem_replace({ id: 42, old_text: "...", new_text: "..." })
Respuesta: "Observation #42 is read-only. Cannot modify."
```

## Combinado: Pin + Lock

Para máxima protección — siempre inyectada E inmutable:

```
1. mem_pin(42)   → Siempre en el contexto
2. mem_lock(42)  → No puede ser modificada por agentes
```

## Ver también

- [Observaciones](/es/docs/core-concepts/observations) — anatomía de observaciones
- [Recuperación de contexto](/es/docs/capabilities/context-recovery) — cómo se usan las observaciones fijadas
