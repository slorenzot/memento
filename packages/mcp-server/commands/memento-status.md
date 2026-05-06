---
description: Quick health check and executive summary of Memento memory
---

Show a quick dashboard of the Memento memory system status.

Call these MCP tools in parallel:
1. `memento_mem_health` — for database health, version, path, project ID
2. `memento_mem_stats` — for observation counts by type and project

Then present a combined box-formatted dashboard like this:

```
╭──────────────────────────────────────────╮
│ MEMENTO STATUS                            │
├──────────────────────────────────────────┤
│ Database:   ✓ healthy                    │
│ Path:       {databasePath}               │
│ Project:    {projectId}                  │
│ Session:    #{activeSessionId} (active)  │
│                                            │
│ Observations: {active} active            │
│   decision: {n}  │  bug: {n}             │
│   discovery: {n} │  note: {n}            │
╰──────────────────────────────────────────╯
```

Rules:
- If database is unhealthy, show the error message instead of stats
- Show session as "none" if no active session
- Only show types that have count > 0
- Use the exact field names from the tool responses
- Always respond in Spanish
