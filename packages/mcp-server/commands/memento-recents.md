---
description: Show recent observations in compact format (last 24h)
---

Show the most recent observations stored in Memento memory.

Call `memento_mem_search` with these parameters:
- `limit`: 10
- Do NOT pass a query string (empty/no query = get latest)

Then present the results in compact box format:

```
╭──────────────────────────────────────────────────────────╮
│ RECENT OBSERVATIONS                                       │
├──────────────────────────────────────────────────────────┤
│ #{id} [decision] {title}              {relative_time}    │
│ #{id} [bug]      {title}              {relative_time}    │
│ #{id} [note]     {title}              {relative_time}    │
╰──────────────────────────────────────────────────────────╯
  Showing {count} of {total} total observations.
```

Rules:
- Calculate relative time from createdAt: "just now", "5m ago", "2h ago", "yesterday", "3d ago", or date
- Truncate titles that are too long with "..."
- Pad the type badge to 12 characters for alignment
- If no observations exist, show "No observations found."
- Show the total count from the search result below the box
- Always respond in Spanish
