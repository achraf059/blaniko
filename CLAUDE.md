# CLAUDE.md

This file provides project memory and guidance for Claude Code when working in this repository.

@AGENTS.md

## Project Summary

Blaniko is a startup project focused on helping people discover activities, venues, and things to do in Casablanca, Morocco.

The long-term vision is to grow into a broader lifestyle platform, but the current MVP is intentionally focused on discovery.

Current MVP focus:

- Activities and venues in Casablanca
- Homepage discovery experience
- Categories
- Venue listings
- Venue detail pages
- Search and filtering
- Favorites
- Recommendations
- Map discovery
- Admin venue management MVP
- English / French localization

Not included yet:

- User accounts
- Authentication
- Payments
- Booking or reservation system
- Backend API
- Database
- Live Google Sheets sync

## Current Technical State

The active app is:

frontend/

The stack is:

- React
- Vite
- TypeScript
- React Router
- CSS files
- npm

This project was originally started with Next.js, but it has been migrated to React + Vite. The old Next.js app/ folder has been removed. Do not recreate it.

Root npm scripts proxy into frontend/.

## Branch Strategy

Current permanent branches:

- dev = active development branch
- staging = later testing/demo branch
- main = stable/public branch

Do not push directly to protected branches.

Normal workflow:

1. Start from dev.
2. Create a feature or chore branch.
3. Make focused changes.
4. Run npm run build.
5. Run npm run lint.
6. Open a Pull Request into dev.
7. Merge only after checks pass.

Do not promote dev to staging until the project is ready for a serious demo or testing phase.

## Commands

From the repository root:

npm run dev
npm run build
npm run lint
npm run preview

Direct frontend commands if needed:

cd frontend && npx tsc --noEmit
cd frontend && npx eslint src/path/to/file.tsx

There are currently no automated tests.

## Architecture

Primary app:

- frontend/src/main.tsx initializes the app
- frontend/src/App.tsx defines routes
- frontend/src/pages/ contains page components
- frontend/src/components/ contains reusable UI components
- frontend/src/data/ contains static/mock data
- frontend/src/hooks/ contains localStorage-based hooks
- frontend/src/i18n/ contains localization logic
- frontend/src/utils/ contains helper logic

Homepage design:

- frontend/src/pages/HomePage.tsx imports the current Claude homepage integration
- frontend/src/claude-home/ contains integrated Claude Design homepage code
- docs/design-archive/claude-export/ contains archived raw Claude Design files only

Do not work in docs/design-archive as if it is production code.

## Data and State

All app data is currently static/mock.

Main data files:

- frontend/src/data/mockData.ts
- frontend/src/data/areas.ts
- frontend/src/data/editorialCollections.ts

State uses custom hooks and localStorage. Important hooks:

- useVenues
- useFavorites
- useCollections
- useCompare
- useRecentActivity

When reading venue data in UI components, prefer useVenues.

## i18n

The app supports English and French.

Use the existing i18n system in frontend/src/i18n/.

When adding visible UI strings:

- update the Dictionary type if needed
- add English text
- add French text
- avoid hardcoded visible strings

## Product Direction

Blaniko is currently focused on discovery, not transactions.

Keep the MVP focused. Do not add accounts, payments, bookings, restaurants, hotels, or large backend systems unless explicitly requested.

Important upcoming product decisions:

- how venue data should move from Google Sheets into the app
- which pages should remain in the MVP
- what should be polished before a demo
- how to organize team work across frontend, data, QA, and business

## Team Context

- Achraf: founder, product lead, main technical lead
- Akram: UI / frontend
- Mohamed: category pages, listings, data integration, responsive testing
- Benmoussa: tourism and market research
- Ouassim: operations, QA, research support, data cleaning
- Bekkali: business, partnerships, venue outreach, revenue ideas

## Claude Code Behavior

Before editing:

1. inspect relevant files
2. explain the plan briefly
3. make targeted changes
4. avoid broad unrelated rewrites
5. run build and lint when code changes

Never assume generated design exports should be committed directly. Keep production code inside frontend/.
