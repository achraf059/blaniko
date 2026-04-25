# Blaniko Agent Instructions

Blaniko is a Casablanca activities and venue discovery platform.

The active application is inside:

frontend/

This project was originally started with Next.js, but it has been migrated to React + Vite. Do not recreate or work in an old Next.js app/ structure.

## Current Stack

- React
- Vite
- TypeScript
- React Router
- CSS files
- npm

## Commands

Run commands from the repository root:

npm run dev
npm run build
npm run lint
npm run preview

Root scripts proxy into the frontend/ folder.

There are currently no automated tests. Use build and lint as the required safety checks.

## Branch Workflow

Main branches:

- dev = active development branch
- staging = later testing/demo branch
- main = stable/public branch

Rules:

- Do not push directly to dev, staging, or main.
- Create a feature/chore branch from dev.
- Keep changes small and focused.
- Run npm run build and npm run lint before opening a Pull Request.
- Open Pull Requests into dev unless explicitly told otherwise.

## Architecture

Primary app:

- Entry: frontend/src/main.tsx
- Main router: frontend/src/App.tsx
- Pages: frontend/src/pages/
- Components: frontend/src/components/
- Data: frontend/src/data/
- Hooks: frontend/src/hooks/
- i18n: frontend/src/i18n/
- Utilities: frontend/src/utils/

The homepage currently imports Claude Design integration code from:

frontend/src/claude-home/

The archived raw Claude Design export is stored in:

docs/design-archive/claude-export/

Do not treat archived design files as production code.

## Data

The app currently uses static/mock data.

Important files:

- frontend/src/data/mockData.ts
- frontend/src/data/areas.ts
- frontend/src/data/editorialCollections.ts

There is no backend, database, authentication, payment system, booking system, or live Google Sheets sync yet.

## State

State is handled with custom hooks and localStorage.

Use the existing hooks instead of creating a new global state system unless explicitly asked.

Important hooks include:

- useVenues
- useFavorites
- useCollections
- useCompare
- useRecentActivity

When reading venue data in UI components, prefer useVenues.

## i18n

The app supports English and French.

Use the existing i18n system in:

frontend/src/i18n/

When adding visible UI text, add both EN and FR values. Do not introduce visible hardcoded strings unless the user explicitly accepts it.

## What to Avoid

- Do not recreate the old Next.js app/ folder.
- Do not add zip files, cache files, generated junk, or node_modules.
- Do not redesign the whole homepage unless explicitly instructed.
- Do not expand MVP scope into restaurants, hotels, bookings, payments, or accounts unless asked.
- Do not delete important files without explaining why.
- Do not make large unrelated changes in one commit.

## Required Before Proposing a Merge

Always run:

npm run build
npm run lint

Then summarize:

- what changed
- why it changed
- files affected
- risks or follow-up work
