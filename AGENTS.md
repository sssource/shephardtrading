# AGENTS.md

## Project Overview

NOSIE Value Command is an internal conversion-engine analytics dashboard built with TanStack Start and deployed on Netlify. It renders persistent revenue, created-value, conversion, signal-volume, activity, and system-health telemetry.

## Architecture

- `src/routes/index.tsx` contains the dashboard route, loader integration, chart configuration, range controls, and responsive interface.
- `src/server/dashboard.functions.ts` reads dashboard data from Netlify Database and inserts starter telemetry only when the metrics table is empty.
- `netlify/functions/ingest-telemetry.mts` accepts authenticated engine telemetry and upserts daily snapshots.
- `db/schema.ts` defines the Drizzle schema. Treat it as the database source of truth.
- `db/index.ts` creates the Netlify Database Drizzle client.
- `netlify/database/migrations/` contains generated migrations applied by Netlify at deploy time.
- `src/styles.css` contains the complete visual system, responsive layouts, loading states, and motion preferences.

## Conventions

- Use TypeScript and ES module imports with `.js` extensions for database files imported by server code.
- Use camelCase in application code and explicit snake_case column names in the database schema.
- Keep database access inside server functions or Netlify Functions; never import the database client into browser-only code.
- Define schema changes in `db/schema.ts`, then generate a named migration with `npx drizzle-kit generate --name <imperative_name>`.
- Keep chart data derived from the route loader rather than duplicating telemetry in client constants.
- Reuse the CSS variables in `src/styles.css` for color and spacing changes.

## Non-Obvious Decisions

- Starter telemetry is persisted on first load so a fresh deployment has a complete dashboard without relying on local JSON or in-memory state.
- Live engine submissions replace the matching day's snapshot through a date-based upsert.
- Ingestion remains unavailable until `NOSIE_INGEST_TOKEN` is configured; never weaken or bypass this guard.
- Money is stored in cents and percentages are stored in basis points to avoid floating-point drift.

## Commands

- `pnpm install` installs dependencies.
- `netlify dev --port 8889` runs the application with Netlify platform emulation.
- `npx drizzle-kit generate --name <name>` generates a migration after schema changes.
- `pnpm build` creates a production build; automated validation runs this in the delivery pipeline.
