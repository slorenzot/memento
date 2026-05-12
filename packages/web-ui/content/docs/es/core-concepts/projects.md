# Proyectos

Los proyectos definen el ámbito de las observaciones a un codebase específico. Cuando guardás una observación con `project_id: "mi-app"`, pertenece a ese proyecto.

## ¿Por qué proyectos?

Sin ámbito por proyecto, todas las observaciones se mezclan. Los proyectos te permiten:

- **Filtrar** — mostrar solo observaciones del codebase actual
- **Aislar** — mantener decisiones de trabajo separadas de las personales
- **Recuperar contexto** — obtener observaciones recientes de un proyecto específico

## Convenciones de proyectos

Usá identificadores de proyecto consistentes en todas tus herramientas:

```
mi-saas-app
tarificador-autos
internal-tools
```

Evitá cambiar los IDs de proyecto — son el mecanismo principal de agrupación.

## Ámbito personal

Algunas observaciones aplican a todos los proyectos — tus preferencias de código, elecciones de herramientas, o conocimiento general. Usá `scope: "personal"` para estas:

```typescript
await engine.createObservation({
  title: 'Preferir conventional commits',
  content: 'Usar prefijos de tipo feat/fix/docs/refactor/test/chore',
  type: 'preference',
  scope: 'personal',
  // No se necesita project_id para ámbito personal
});
```

Las observaciones personales aparecen en `mem_context` independientemente del proyecto por el que filtres.

## Lista de proyectos

Memento trackea qué proyectos se usaron basándose en las observaciones guardadas. Podés listarlos:

```bash
# Vía CLI
memento projects list

# Vía API
GET /api/projects
```

## Búsqueda cross-project

La búsqueda soporta filtrado por proyecto pero también permite buscar en todo:

```bash
# Buscar en un proyecto específico
memento search "auth model" --project mi-app

# Buscar en todos los proyectos
memento search "auth model"
```

## Ver también

- [Observaciones](/es/docs/core-concepts/observations) — cómo funciona el ámbito en observaciones
- [Recuperación de contexto](/es/docs/capabilities/context-recovery) — obtener contexto reciente del proyecto
