# Sessions

Sessions group observations by conversation. Think of them as a "coding session" — everything that happened between opening and closing your editor.

## Lifecycle

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   STARTED     │────▶│   ACTIVE     │────▶│   ENDED      │
│  mem_session  │     │  observations│     │  mem_session  │
│  _start       │     │  being saved │     │  _end         │
└──────────────┘     └──────────────┘     └──────────────┘
```

1. **Start** — `mem_session_start` creates a new session with a project ID
2. **Active** — all `mem_save` calls are grouped under the active session
3. **End** — `mem_session_end` closes the session (required for clean lifecycle)

## Auto-Session Creation

If you call `mem_save` without starting a session first, Memento auto-creates one. This is convenient but less organized — explicit session management is recommended.

## Session Summary

At the end of a conversation, use `mem_session_summary` to capture what was accomplished:

```
## Goal
Add dark mode support to the web UI

## Discoveries
- Tailwind CSS 4 uses @theme directive for design tokens
- Zustand 5 has a simplified API with no provider needed

## Accomplished
- Implemented dark mode toggle with system preference detection
- Updated all components to use CSS variables
- Added persistence via localStorage

## Next Steps
- Add per-page theme override
- Test with SSR rendering

## Relevant Files
- packages/web-ui/src/app/globals.css — design tokens
- packages/web-ui/src/stores/ui-store.ts — theme state
```

## Multiple Sessions

Only one session can be active at a time. Starting a new session replaces the previous one. This matches the typical coding workflow where you work on one thing at a time.

## Session Metadata

Sessions carry metadata for filtering and display:

```typescript
await engine.createSession({
  projectId: 'my-project',
  metadata: {
    agent: 'claude-3.5-sonnet',
    environment: 'development',
    task: 'implement-auth',
  },
});
```

## Session End Protocol

Always end sessions before closing a conversation. This:
- Sets the `endedAt` timestamp
- Marks the session as complete in the UI
- Enables session-based filtering in searches

## See Also

- [Observations](/docs/core-concepts/observations) — the data stored in sessions
- [Context Recovery](/docs/capabilities/context-recovery) — recover session context after compaction
