# Blaniko

Blaniko is a startup project focused on helping people discover activities, venues, and things to do in Casablanca, Morocco.

The long-term vision is to grow into a broader lifestyle platform, but the current MVP is intentionally simple: a web-based discovery experience for activities and places in Casablanca.

## Current MVP Scope

The MVP currently focuses on:

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
- Booking / reservation system
- Backend API
- Database
- Live Google Sheets sync

## Tech Stack

The current frontend uses:

- React
- Vite
- TypeScript
- React Router
- CSS files
- npm

Important: this project was originally started with Next.js, but it has been migrated to React + Vite. The old Next.js app structure is no longer the main application.

## Project Structure

Main structure:

- frontend/ = main React + Vite application
- frontend/src/components/ = reusable UI components
- frontend/src/pages/ = app pages
- frontend/src/data/ = mock/shared venue data
- frontend/src/hooks/ = custom React hooks
- frontend/src/i18n/ = localization files
- frontend/src/utils/ = utility logic
- frontend/src/App.tsx = main app routing
- docs/design-archive/ = archived design/reference material
- AGENTS.md = AI agent instructions
- CLAUDE.md = Claude project memory/context
- package.json = root scripts that proxy into frontend/
- README.md = project documentation

## How to Run the Project

From the repository root, run:

npm run dev

This runs the Vite development server from the frontend/ folder.

The local URL is usually:

http://localhost:5173

If port 5173 is busy, Vite may choose another port such as 5174.

## Useful Commands

Run the development server:

npm run dev

Create a production build:

npm run build

Run lint checks:

npm run lint

Preview the production build:

npm run preview

## Branch Workflow

Current main branches:

- dev = active development branch
- staging = later testing/demo branch
- main = stable/public branch

Normal workflow:

1. Create a feature branch from dev
2. Make changes
3. Run build and lint
4. Push the feature branch
5. Open a Pull Request into dev
6. Merge only after checks pass

Do not push directly to protected branches.

## AI Agent Rules

This project may be worked on with AI tools such as ChatGPT, Codex, Claude Code, Claude Design, MiniMax, and other agents.

Agents must follow these rules:

- Work from the correct branch.
- Do not push directly to dev, staging, or main.
- Do not recreate the old Next.js app structure.
- The real app is inside frontend/.
- Do not delete important files without asking.
- Do not commit generated junk files, cache files, or zip files.
- Run npm run build and npm run lint before proposing a merge.
- Keep changes small and understandable.

## Current Product Direction

Blaniko is currently focused on discovery, not transactions.

The next important product questions are:

- How venue data should move from Google Sheets into the app
- Which pages should stay in the MVP
- What should be polished before a public demo
- How the team should divide frontend, data, QA, and business tasks

## Team Roles

Current team structure:

- Achraf: founder / product lead / main technical lead
- Akram: UI / frontend
- Mohamed: category pages, listings, data integration, responsive testing
- Benmoussa: tourism and market research
- Ouassim: operations, QA, research support, data cleaning
- Bekkali: business, partnerships, venue outreach, revenue ideas
