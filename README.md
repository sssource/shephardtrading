# NOSIE Value Command

NOSIE Value Command is an internal analytics dashboard for monitoring a conversion engine's performance, revenue, activity, and created value. It combines a high-density command-center interface with persistent Netlify Database telemetry and a secure ingestion endpoint for live engine updates.

## Technology

- TanStack Start, React 19, and TypeScript
- Chart.js and react-chartjs-2
- Tailwind CSS 4 with a custom visual system
- Netlify Functions for telemetry ingestion
- Netlify Database with Drizzle ORM and deploy-time migrations

## Run locally

Install dependencies and start the Netlify development environment:

```bash
pnpm install
netlify dev --port 8889
```

The dashboard initializes the database with persisted starter telemetry when no engine data exists. Set `NOSIE_INGEST_TOKEN` in the Netlify environment to enable authenticated ingestion.

## Send engine telemetry

Submit daily engine totals to `POST /api/engine/telemetry` with an `Authorization: Bearer <token>` header. Records are upserted by `recordedOn`, so the engine can safely refresh the current day's totals.

```json
{
  "recordedOn": "2026-07-23",
  "processedSignals": 248900000,
  "conversions": 61840,
  "revenueCents": 13284000000,
  "valueCreatedCents": 94260000000,
  "accuracyBasisPoints": 9980,
  "latencyMs": 14,
  "uptimeBasisPoints": 10000,
  "event": {
    "category": "VALUE EVENT",
    "title": "Enterprise signal cluster converted",
    "detail": "A high-intent signal bundle converted successfully.",
    "impactCents": 1840000000,
    "status": "captured",
    "accent": "acid"
  }
}
```

The optional `event` object adds an entry to the live activity feed. Monetary values use cents and percentage values use basis points.

## Data model

- `engine_daily_metrics` stores one aggregated performance snapshot per day.
- `engine_activity` stores notable conversion, revenue, optimization, and system-health events.
- `db/schema.ts` is the schema source of truth.
- `netlify/database/migrations/` contains deploy-time database migrations.
