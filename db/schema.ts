import {
  bigint,
  date,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'

export const engineDailyMetrics = pgTable('engine_daily_metrics', {
  id: serial().primaryKey(),
  recordedOn: date('recorded_on').notNull().unique(),
  processedSignals: bigint('processed_signals', { mode: 'number' }).notNull(),
  conversions: integer().notNull(),
  revenueCents: bigint('revenue_cents', { mode: 'number' }).notNull(),
  valueCreatedCents: bigint('value_created_cents', { mode: 'number' }).notNull(),
  accuracyBasisPoints: integer('accuracy_basis_points').notNull(),
  latencyMs: integer('latency_ms').notNull(),
  uptimeBasisPoints: integer('uptime_basis_points').notNull(),
})

export const engineActivity = pgTable('engine_activity', {
  id: serial().primaryKey(),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
  category: text().notNull(),
  title: text().notNull(),
  detail: text().notNull(),
  impactCents: bigint('impact_cents', { mode: 'number' }).notNull(),
  status: text().notNull(),
  accent: text().notNull(),
})
