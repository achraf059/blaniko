# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Blaniko is a Casablanca activities and venue discovery platform. The current MVP is focused on activities and amusement; restaurants and hotels are out of scope for now.

**Active development is in `frontend/`** (plain React + Vite). The `app/` Next.js folder is secondary/migration-related — do not treat it as the primary app unless explicitly instructed.

The current design is not considered final. The goal is to progressively build a stronger, more polished, more premium product — not just patch small UI issues. Redesign suggestions are welcome as long as they respect MVP scope.

The active branch is `feat/discovery-experience-lab`. New work should align with its discovery-first purpose.

## Commands

All scripts proxy into the `frontend/` subdirectory:

```bash
npm run dev      # Vite dev server (http://localhost:5173)
npm run build    # tsc -b && vite build
npm run lint     # ESLint
npm run preview  # Preview production build
```

To run commands directly inside the frontend package:
```bash
cd frontend && npx tsc --noEmit   # type-check only
cd frontend && npx eslint src/path/to/file.tsx  # lint a single file
```

There are no tests.

## Architecture

The repo contains **two separate apps** at different stages of development:

### `frontend/` — Active Vite + React SPA (primary)
- **Stack**: React 19, React Router v7, TypeScript 6, Vite 8. No backend, no external state library.
- **Entry**: `frontend/src/main.tsx` → wraps app in `<I18nProvider>` + `<BrowserRouter>`, renders `App.tsx`
- **Routing**: `App.tsx` declares all routes. Each route maps to a page in `src/pages/`. Pages colocate their CSS (`PageName.css` next to `PageName.tsx`).
- **Components**: `src/components/` organized by feature (`home/`, `collections/`, `compare/`, `discovery/`, `recommendations/`).

### `app/` — Next.js App Router (secondary, migration-related)
- Uses Next.js App Router with server components and Tailwind CSS.
- Has its own `data/mockData.ts`, `i18n/`, and `components/` trees — separate from `frontend/`.
- Server-side language detection via `app/i18n/server.ts` → `getCurrentLanguage()`.
- Root scripts (`npm run dev` etc.) point to `frontend/`, not `app/`. The Next.js app has no dedicated script in root `package.json` yet.
- **Do not default to working here** unless the user explicitly asks.

**Styling**: `frontend/` uses plain colocated CSS files (`PageName.css` beside each component). `app/` uses Tailwind utility classes. Match the styling system of whichever app you're working in.

## Data & State

**All data is static/mock** — no backend API exists.

- `frontend/src/data/mockData.ts` — defines the `Venue` and `Category` types, and exports all base venue/category data. This is the source of truth for venue shape.
- `frontend/src/data/areas.ts`, `editorialCollections.ts` — supplementary static data.

**State hooks** all follow the same pattern: read from `localStorage` on mount, write back with `window.dispatchEvent(new CustomEvent(...))` so all open tabs/components stay in sync without a global store.

| Hook | Storage key | Purpose |
|------|-------------|---------|
| `useAdminVenues` | `blaniko:admin-venues:v1` | Merges base venues with admin edits; source for all venue reads |
| `useVenues` | — | Thin wrapper over `useAdminVenues`; exposes `venues`, `venuesBySlug`, `getVenueBySlug` |
| `useFavorites` | `blaniko:favorites:v1` | Per-user favorited venue slugs |
| `useCollections` | `blaniko:collections:v1` | User-created named collections of venue slugs |
| `useCompare` | `blaniko:compare:v1` | Up to 3 venues queued for side-by-side comparison |
| `useRecentActivity` | — | Tracks recently viewed venues |

Always call `useVenues` (not `useAdminVenues` directly) when reading venue data in UI components.

## i18n

`frontend/src/i18n/` implements a custom two-language system (EN/FR):
- `dictionaries.ts` — exports `getDictionary(language)` returning a typed `Dictionary` object.
- `I18nProvider.tsx` — stores selected language in `localStorage` (`blaniko:lang`) and sets `document.documentElement.lang`.
- `useI18n.ts` — hook to access `{ language, setLanguage, dictionary }` anywhere in the tree.

When adding new UI strings, add them to the `Dictionary` type in `dictionaries.ts` and provide both EN and FR values.

The `app/` Next.js app has its own parallel i18n in `app/i18n/dictionaries.ts` (server-side, no context provider).

## Working with Claude

- Before editing, read the relevant files, briefly explain the plan, then make targeted changes.
- Do not assume the current design should be preserved — redesign suggestions are welcome when the user signals they want a better result.
- Keep changes scoped to the MVP (activities/amusement discovery in Casablanca). Do not expand scope toward restaurants, hotels, or broader features unless asked.
- Help improve the product step by step toward a more polished, premium experience.
