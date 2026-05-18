# DELEGATION WORKFLOW — memento

**Workflow de delegación paralela para el proyecto memento (core library).**

## Principio Fundamental

**¿Infla mi contexto sin necesidad?** Si es SÍ → delegar. Si es NO → hacer inline.

Este protocolo aplica a TODAS las sesiones, independientemente del contexto o fase.

## Matriz de Decisión

| Categoría | Criterio | Inline | Delegar |
|-----------|----------|--------|---------|
| **Read para decidir/verificar** | 1-2 archivos, ubicación conocida | ✅ | — |
| **Read para explorar/entender** | 3+ archivos o estructura desconocida | — | ✅ → `explore` |
| **Read como preparación para escribir** | Múltiples archivos antes de editar | — | ✅ → `explore` |
| **Write spec/TS/architecture docs** | Cualquier especificación o doc de arquitectura | — | ✅ → `docs-expert` |
| **Write atómico (no-doc)** | Archivo único, mecánico, no-documentación | ✅ | — |
| **Write con análisis** | Múltiples archivos o nueva lógica requerida | — | ✅ |
| **Bash para estado (read-only)** | git status, git log, git diff | ✅ | — |
| **Git ops (write)** | git add, git commit, git push, GitHub sync | — | ✅ → `git-expert` |
| **Bash para ejecución** | test, build, install, long-running | — | ✅ |
| **Validar spec/TS antes de entrega** | Quality gate antes de entregar al usuario | — | ✅ triple: `security-auditor` + `code-reviewer` + `testing-agent` |

## Anti-Patterns (NUNCA hagas esto inline)

Estos patrones SIEMPRE inflan el contexto innecesariamente:

1. ❌ **Leer 3+ archivos para "entender" el codebase** → **DELEGAR a `explore`**
2. ❌ **Escribir cualquier especificación o Technical Story inline** → **DELEGAR a `docs-expert`**
3. ❌ **Ejecutar git commit/push/sync operations inline** → **DELEGAR a `git-expert`**
4. ❌ **Entregar specs/TS sin validación** → **DELEGAR triple validación**
5. ❌ **Ejecutar tests o builds inline** → **DELEGAR**
6. ❌ **Leer archivos como preparación para edición, luego editar** → **DELEGAR todo junto**

## Matriz de Expertos por Tipo de Tarea

| Tipo de Tarea | Subagente | Modelo | Temp |
|---------------|-----------|--------|------|
| **Core Library** | | | |
| MemoryEngine, API logic | `backend-specialist` | glm-5 | 0.3 |
| Schema SQLite, migraciones, FTS5 | `database-expert` | glm-5 | 0.1 |
| Auth, tokens, Device Auth | `auth-expert` | glm-5 | 0.3 |
| **Frontend** | | | |
| React + Vite (web-ui), Ink (tui) | `ui-developer` | glm-5 | 0.4 |
| UX/Design decisions | `ux-specialist` | glm-5 | 0.4 |
| **Calidad** | | | |
| Tests (bun:test) | `testing-agent` | glm-5 | 0.2 |
| Code review (read-only) | `code-reviewer` | glm-4.7 | 0.1 |
| Security audit (read-only) | `security-auditor` | glm-4.7 | 0.1 |
| **Soporte** | | | |
| Traducciones, i18n | `i18n-expert` | glm-5 | 0.2 |
| Documentación MDX | `docs-expert` | glm-5 | 0.3 |
| Motor de sincronización | `sync-expert` | glm-5 | 0.2 |
| Git operations | `git-expert` | glm-5 | 0.2 |
| Exploración codebase | `explore` | glm-5 | 0.3 |
| Tareas generales | `general` | glm-5 | 0.3 |

## Patrón de Delegación (Delegate-Only)

**TODAS** las delegaciones de subagentes usan el tool `delegate`, que es:
- **Async**: Retorna un ID legible inmediatamente, no bloquea
- **Persistente**: Los resultados sobreviven a la compactación del contexto
- **Recuperable**: Usa `delegation_read(id)` para obtener el resultado completo

**Patrón estándar**:
```typescript
// 1. Delegar tarea
const id = await delegate({
  agent: "backend-specialist",
  prompt: "Implementar nuevo método merge en MemoryEngine..."
})
// → Retorna: "calm-forest-river" (ejemplo)

// 2. Recuperar resultado
const result = await delegation_read({ id: "calm-forest-river" })
// → Retorna el resultado completo del subagente
```

**Ventajas**:
- Ejecución en paralelo automática (múltiples delegate() calls)
- Resultados persistentes sobreviven compaction
- Context limpio para el agente principal
- Fácil debug con IDs legibles

## Regla Self-Check Obligatoria

Después de CADA decisión de tarea, pregúntate:

1. "¿Estoy a punto de leer 3+ archivos para entender algo?" → **DELEGAR a `explore`**
2. "¿Estoy a punto de escribir un spec, TS, o documento de arquitectura?" → **DELEGAR a `docs-expert`**
3. "¿Estoy a punto de ejecutar git add/commit/push o sync con GitHub?" → **DELEGAR a `git-expert`**
4. "¿Estoy a punto de entregar un spec/TS al usuario?" → **DELEGAR triple validación**
5. "¿Estoy a punto de ejecutar tests o builds?" → **DELEGAR**
6. "¿Ya tengo TODO el contexto que necesito?" → **INLINE OK**

## Delegación en Paralelo

Cuando sea posible, delega múltiples tareas en paralelo:

```typescript
// Ejemplo: Implementar feature con backend + tests
const backendId = await delegate({
  agent: 'backend-specialist',
  prompt: 'Implementar FTS5 semantic search en MemoryEngine...'
})

const testId = await delegate({
  agent: 'testing-agent',
  prompt: 'Crear tests para MemoryEngine.search.test.ts...'
})

// Ambos corren en paralelo. Recuperar resultados:
const [backendResult, testResult] = await Promise.all([
  delegation_read({ id: backendId }),
  delegation_read({ id: testId })
])
```

**Regla**: Máximo 3 delegaciones en paralelo para no saturar.

## Validación Antes de Entrega

Al entregar cualquier especificación al usuario:

```typescript
// Triple validación OBLIGATORIA
const securityId = await delegate({
  agent: 'security-auditor',
  prompt: 'Validar seguridad de la implementación...'
})

const codeId = await delegate({
  agent: 'code-reviewer',
  prompt: 'Revisar calidad de código de...'
})

const testId = await delegate({
  agent: 'testing-agent',
  prompt: 'Validar cobertura de tests de...'
})

// Recuperar todos los resultados
const [securityResult, codeResult, testResult] = await Promise.all([
  delegation_read({ id: securityId }),
  delegation_read({ id: codeId }),
  delegation_read({ id: testId })
])
```

**Si alguno falla** → NO entregar al usuario, primero corregir issues.

## MCP / Memoria Persistente

**MANDATORIO**: Los subagentes DEBEN guardar en memoria cuando:

- Decisión arquitectónica tomada
- Bug fix completado
- Patrón establecido (naming, estructura, convención)
- Preferencia del usuario aprendida
- Descubrimiento no obvio sobre el codebase

```typescript
mem_save({
  title: 'Verb + what',
  type: 'discovery|decision|architecture|bugfix|pattern|preference',
  content: {
    What: 'One sentence - qué se hizo',
    Why: 'Qué motivó (user request, bug, performance, etc)',
    Where: 'Archivos o rutas afectados',
    Learned: 'Gotchas, edge cases, cosas que sorprendieron (omitir si no hay)'
  }
})
```

## Por Qué Esto Importa

- **Control de contexto**: Subagentes tienen contexto limpio; tu contexto se mantiene lean
- **Especialización**: Cada fase tiene su subagente con modelo y skills apropiados
- **Persistencia**: Subagentes pueden guardar en memoria persistente sin contaminar tu conversación
- **Eficiencia**: Tareas en paralelo, no ejecución serial
- **Calidad**: Perspectivas frescas de agentes especializados

## Checklist de Delegación

Antes de delegar:

1. ✅ ¿La tarea encaja con el expertise del subagente?
2. ✅ ¿El prompt es claro y específico?
3. ✅ ¿Necesito el resultado inmediato o puedo esperar a retrieval?
4. ✅ ¿Hay tareas dependientes que pueda hacer en paralelo?
5. ✅ ¿Debo incluir contexto del proyecto?
6. ✅ ¿Voy a recuperar el resultado con `delegation_read()`?

Después de recibir resultado:

1. ✅ ¿El resultado cumple con los requisitos?
2. ✅ ¿Hay errores o warnings?
3. ✅ ¿Necesito validación adicional?
4. ✅ ¿Debo guardar algo en memoria persistente?
5. ✅ ¿Estoy listo para reportar al usuario?

## Importante

- Delega siempre que sea posible para mantener tu contexto limpio
- Los subagentes tienen modelos optimizados para sus tareas específicas
- Context fresco de subagentes = mejor calidad y menos tokens
- Validación triple OBLIGATORIA antes de entregar specs al usuario
- Guarda decisiones importantes en memoria persistente (MCP memento)
