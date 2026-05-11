# Projects

Projects scope observations to a specific codebase. When you save an observation with `project_id: "my-app"`, it belongs to that project.

## Why Projects?

Without project scoping, all observations mix together. Projects let you:

- **Filter** — show only observations for the current codebase
- **Isolate** — keep work decisions separate from personal ones
- **Recover context** — get recent observations for a specific project

## Project Conventions

Use consistent project identifiers across all your tools:

```
my-saas-app
tarificador-autos
internal-tools
```

Avoid changing project IDs — they're the primary grouping mechanism.

## Personal Scope

Some observations apply across all projects — your coding preferences, tool choices, or general knowledge. Use `scope: "personal"` for these:

```typescript
await engine.createObservation({
  title: 'Prefer conventional commits',
  content: 'Use feat/fix/docs/refactor/test/chore type prefixes',
  type: 'preference',
  scope: 'personal',
  // No project_id needed for personal scope
});
```

Personal observations appear in `mem_context` regardless of which project you filter by.

## Project List

Memento tracks which projects have been used based on saved observations. You can list them:

```bash
# Via CLI
memento projects list

# Via API
GET /api/projects
```

## Cross-Project Search

Search supports project filtering but also allows searching across everything:

```bash
# Search in a specific project
memento search "auth model" --project my-app

# Search across all projects
memento search "auth model"
```

## See Also

- [Observations](/docs/core-concepts/observations) — how project scoping works on observations
- [Context Recovery](/docs/capabilities/context-recovery) — get recent project context
