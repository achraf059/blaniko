<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Blaniko — Casablanca Activity Discovery

**Active app is `frontend/`** (React 19 + Vite SPA). The `app/` Next.js folder is secondary/migration-related. Do not default to `app/` unless explicitly instructed.

## Commands

```bash
npm run dev      # Vite dev server → http://localhost:5173
npm run build    # tsc -b && vite build
npm run lint     # ESLint
npm run preview  # Preview production build
```

Root scripts proxy into `frontend/`. There are no tests.

## Architecture

- **Entry**: `frontend/src/main.tsx` → `<I18nProvider>` + `<BrowserRouter>` → `App.tsx`
- **Routing**: Routes in `App.tsx` map to pages in `src/pages/`
- **Styling**: Frontend uses colocated CSS (`PageName.css` beside `PageName.tsx`). App uses Tailwind.
- **Data**: All static/mock. Source of truth: `frontend/src/data/mockData.ts` (Venue, Category types).
- **Homepage**: Routes via `HomePage.tsx`/`.css` in `src/pages/`; implementation lives in `src/claude-home/`. Do not redesign wholesale unless instructed.

## State

Custom hooks use `localStorage` + `CustomEvent` for cross-tab sync:

- `useVenues` — always use this for venue reads (not `useAdminVenues` directly)
- `useFavorites` — keyed `blaniko:favorites:v1`
- `useCollections` — keyed `blaniko:collections:v1`
- `useCompare` — keyed `blaniko:compare:v1` (max 3 venues)

## i18n

EN/FR only. `I18nProvider` stores language in `localStorage` (`blaniko:lang`). Use `useI18n()` hook. Add new strings to both EN and FR dictionaries together in `frontend/src/i18n/dictionaries.ts`. Never introduce visible hardcoded strings.

## Workflow

Audit → small focused edit → run lint → run build.

## What to Avoid

- Do not default to `app/` directory
- Do not redesign homepage wholesale unless instructed
- Do not add visible hardcoded i18n strings