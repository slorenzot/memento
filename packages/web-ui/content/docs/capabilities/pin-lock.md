# Pin & Lock

Two protection mechanisms for important observations.

## Pinning

Pinned observations are **always injected into the AI agent's system prompt** by the OpenCode plugin. They appear before non-pinned observations, within the token budget.

### When to Pin

- Critical architecture decisions that affect all work
- Project-specific conventions the agent must follow
- Active bugs or blockers the agent should be aware of
- Configuration that impacts code generation

### When NOT to Pin

- General knowledge (search can find it)
- Temporary information (will become stale)
- Large content (wastes tokens in every conversation)

### Usage

```bash
# Via CLI
memento pin 42
memento unpin 42

# Via MCP
# mem_pin → { id: 42 }
# mem_unpin → { id: 42 }
```

## Locking (Read-Only)

Locked observations **cannot be modified or deleted by AI agents**. Only the user can unlock via CLI.

### When to Lock

- Contract-level decisions that shouldn't change without human approval
- Compliance or security-related observations
- Observations that have been reviewed and validated

### Usage

```bash
# Via CLI
memento lock 42
memento unlock 42

# Via MCP
# mem_lock → { id: 42 }
# mem_unlock → { id: 42 }
```

### Read-Only Protection

When an agent tries to modify a locked observation:

```
Agent: mem_update({ id: 42, content: "..." })
Response: "Observation #42 is read-only. Cannot modify."
```

When an agent tries to use `mem_replace` on locked content:

```
Agent: mem_replace({ id: 42, old_text: "...", new_text: "..." })
Response: "Observation #42 is read-only. Cannot modify."
```

## Combined: Pin + Lock

For maximum protection — always injected AND immutable:

```
1. mem_pin(42)   → Always in context
2. mem_lock(42)  → Cannot be modified by agents
```

## See Also

- [Observations](/docs/core-concepts/observations) — observation anatomy
- [Context Recovery](/docs/capabilities/context-recovery) — how pinned observations are used
