# MODEL REFERENCE — memento

**Autoridad definitiva de asignación de modelos para todos los agentes.**

## Regla CRÍTICA

**LOS SUBAGENTES SIEMPRE USAN SU PROPIO MODELO, NO EL MODELO DEL INVOCADOR.**

El Build Agent y Plan Agent NO deben pasar su modelo a los subagentes. Cada subagente tiene un modelo asignado específico para su tarea.

## Tabla de Modelos Asignados

| Agente | Modelo | Temperatura | Razón |
|--------|--------|-------------|-------|
| **Principal** | | |
| `plan` | glm-5.1 | 0.3 | Máxima capacidad de razonamiento para arquitectura y planificación |
| `build` | glm-5.1 | 0.3 | Máxima capacidad de coordinación y ejecución de múltiples subagentes |
| **Especialistas Core** | | |
| `backend-specialist` | glm-5 | 0.3 | Lógica de negocio, API routes, MemoryEngine |
| `auth-expert` | glm-5 | 0.3 | Autenticación, API tokens, Device Auth |
| `database-expert` | glm-5 | 0.1 | Schema SQLite, migraciones, FTS5 |
| **Especialistas Frontend** | | |
| `ui-developer` | glm-5 | 0.4 | React + Vite components (web-ui), Ink components (tui) |
| `ux-specialist` | glm-5 | 0.4 | Accesibilidad, UX para web-ui y tui |
| **Especialistas de Calidad** | | |
| `testing-agent` | glm-5 | 0.2 | Tests bun:test con precisión y consistencia |
| `code-reviewer` | glm-4.7 | 0.1 | Máxima precisión para análisis crítico (READ-ONLY) |
| `security-auditor` | glm-4.7 | 0.1 | Máxima precisión para auditoría de seguridad (READ-ONLY) |
| **Especialistas de Soporte** | | |
| `i18n-expert` | glm-5 | 0.2 | Traducciones y localización |
| `docs-expert` | glm-5 | 0.3 | Documentación técnica MDX |
| `sync-expert` | glm-5 | 0.2 | Motor de sincronización push/pull |
| `git-expert` | glm-5 | 0.2 | Operaciones git mecánicas pero cuidadosas |
| `explore` | glm-5 | 0.3 | Exploración rápida con análisis del codebase |
| `general` | glm-5 | 0.3 | Tareas generales balanceadas |

## Resumen de Tiers

```
┌─────────────────────────────────────────────────────────────────────┐
│  TIER 1: Flagship & Coordinación                                   │
│  Contexto: 200K tokens | 45.3 coding score (Claude Code)           │
│  ┌─────────────────┬──────────────────────────────────────────┐    │
│  │ plan            → GLM-5.1                                  │    │
│  │ build           → GLM-5.1                                  │    │
│  └─────────────────┴──────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────────────┤
│  TIER 2: Base - Generación Actual                                  │
│  Contexto: 200K tokens | SWE-Bench: 77.8%                         │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │ 12 subagentes: backend, auth, DB, UI, UX, tests,       │      │
│  │ i18n, docs, sync, git, explore, general                │      │
│  └──────────────────────────────────────────────────────────┘      │
├─────────────────────────────────────────────────────────────────────┤
│  TIER 3: Respaldo & Compatibilidad                                 │
│  Contexto: 200K tokens | Estatus: Versión previa                   │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │ code-reviewer, security-auditor (lectura crítica)       │      │
│  └──────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────┘
```

## Uso

Al invocar un subagente, el Plan/Build Agent usa el tool `delegate` con el nombre del agente. El subagente usará automáticamente su modelo asignado según este documento.

**INCORRECTO**:
```typescript
delegate({
  agent: 'ui-developer',
  model: 'glm-4.7'  // ❌ NO hacer esto
})
```

**CORRECTO**:
```typescript
delegate({
  agent: 'ui-developer'
  // ✅ El agente usará glm-5 según MODEL-REFERENCE.md
})
```

## Fallback Rule

Si un subagente no tiene modelo definido en su frontmatter, usar GLM-5 como default.

## Actualizaciones

Este documento es la **AUTORIDAD DEFINITIVA**. Si hay discrepancia entre la configuración del agente y este documento, este documento tiene prioridad.

Para cambiar el modelo de un agente:
1. Actualizar este archivo
2. Actualizar el frontmatter del agente correspondiente en `.opencode/agents/`
3. Actualizar referencias textuales en el agente (línea "Modelo" al final)
4. Guardar en memoria MCP (opcional)
