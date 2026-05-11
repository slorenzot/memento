# Web UI Package

`@slorenzot/memento-web-ui` — Next.js 15 App Router dashboard for browsing and managing memory.

## Tech Stack

- **Framework:** Next.js 15 (App Router, Server Components)
- **React:** 19
- **Styling:** Tailwind CSS 4 with CSS variables
- **State:** Zustand 5
- **Icons:** Lucide React
- **Database:** `bun:sqlite` with `better-sqlite3` polyfill for webpack

## Running

```bash
# Development
cd packages/web-ui
bun dev

# Build
bun build

# Production
bun start
```

Default port: `8086`

## Route Structure

| Route | Description |
|-------|-------------|
| `/` | Dashboard with stats and recent activity |
| `/observations` | List and filter observations |
| `/observations/[id]` | Observation detail view |
| `/observations/[id]/edit` | Edit observation |
| `/observations/new` | Create new observation |
| `/search` | Search observations |
| `/timeline` | Chronological timeline |
| `/sessions` | Session list |
| `/sessions/[id]` | Session detail |
| `/settings` | Application settings |
| `/docs` | Documentation |

## API Routes

All API routes are under `/api/` and use Next.js Route Handlers. See [API Introduction](/docs/api/introduction) for details.

## Design System

The Web UI uses a neutral, minimal design system defined in CSS variables (`globals.css`):

- **Colors:** Neutral palette (black/white/grays), no brand colors
- **Dark mode:** First-class support via `.dark` class
- **Typography:** System font stack, monospace for code
- **Container:** Max width 896px
- **Radius:** 6px (sm), 8px (md), 12px (lg)

## See Also

- [API Introduction](/docs/api/introduction) — REST endpoints
- [Architecture](/docs/architecture/database) — database design
