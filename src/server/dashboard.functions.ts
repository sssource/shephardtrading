import { createServerFn } from '@tanstack/react-start'
import { asc, desc, sql } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { engineActivity, engineDailyMetrics } from '../../db/schema.js'

const seedMetrics = [
  ['2026-07-10', 58400000, 12840, 1842000000, 12940000000, 9860, 41, 9991],
  ['2026-07-11', 62100000, 13720, 2018000000, 14180000000, 9870, 39, 9993],
  ['2026-07-12', 66800000, 14980, 2284000000, 15890000000, 9880, 38, 9994],
  ['2026-07-13', 71400000, 16240, 2511000000, 17710000000, 9890, 35, 9995],
  ['2026-07-14', 78200000, 17890, 2864000000, 20180000000, 9910, 33, 9996],
  ['2026-07-15', 83600000, 19140, 3192000000, 22470000000, 9920, 31, 9997],
  ['2026-07-16', 91800000, 21360, 3688000000, 26010000000, 9930, 29, 9997],
  ['2026-07-17', 104200000, 23810, 4276000000, 30160000000, 9940, 27, 9998],
  ['2026-07-18', 119600000, 27240, 5018000000, 35480000000, 9950, 24, 9998],
  ['2026-07-19', 137400000, 31860, 5984000000, 42190000000, 9950, 22, 9999],
  ['2026-07-20', 156800000, 36920, 7148000000, 50560000000, 9960, 20, 9999],
  ['2026-07-21', 184300000, 44180, 8842000000, 62480000000, 9970, 18, 9999],
  ['2026-07-22', 216700000, 52940, 10976000000, 77630000000, 9970, 16, 9999],
  ['2026-07-23', 248900000, 61840, 13284000000, 94260000000, 9980, 14, 10000],
] as const

const seedActivity = [
  {
    occurredAt: new Date('2026-07-23T14:42:00Z'),
    category: 'VALUE EVENT',
    title: 'Enterprise signal cluster converted',
    detail: 'Autonomous route N-17 converted a high-intent signal bundle in 84ms.',
    impactCents: 1840000000,
    status: 'captured',
    accent: 'acid',
  },
  {
    occurredAt: new Date('2026-07-23T13:18:00Z'),
    category: 'MODEL SHIFT',
    title: 'Precision threshold self-optimized',
    detail: 'False-positive exposure dropped 31% without reducing conversion volume.',
    impactCents: 760000000,
    status: 'optimized',
    accent: 'violet',
  },
  {
    occurredAt: new Date('2026-07-23T11:56:00Z'),
    category: 'REVENUE LOCK',
    title: 'North America lane exceeded target',
    detail: 'The lane cleared its full-day revenue objective before midday UTC.',
    impactCents: 2410000000,
    status: 'secured',
    accent: 'orange',
  },
  {
    occurredAt: new Date('2026-07-23T10:24:00Z'),
    category: 'ENGINE HEALTH',
    title: 'Zero-downtime compute handoff',
    detail: 'Traffic shifted across inference cells with no measurable revenue interruption.',
    impactCents: 420000000,
    status: 'stable',
    accent: 'cyan',
  },
  {
    occurredAt: new Date('2026-07-23T08:03:00Z'),
    category: 'ANOMALY WIN',
    title: 'Hidden demand pocket identified',
    detail: 'A previously invisible cohort produced 8,420 incremental conversions.',
    impactCents: 1280000000,
    status: 'monetized',
    accent: 'pink',
  },
]

async function seedDatabase() {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(engineDailyMetrics)

  if (count > 0) return

  await db
    .insert(engineDailyMetrics)
    .values(
      seedMetrics.map(
        ([recordedOn, processedSignals, conversions, revenueCents, valueCreatedCents, accuracyBasisPoints, latencyMs, uptimeBasisPoints]) => ({
          recordedOn,
          processedSignals,
          conversions,
          revenueCents,
          valueCreatedCents,
          accuracyBasisPoints,
          latencyMs,
          uptimeBasisPoints,
        }),
      ),
    )
    .onConflictDoNothing()

  await db.insert(engineActivity).values(seedActivity)
}

export const getDashboardData = createServerFn({ method: 'GET' }).handler(
  async () => {
    await seedDatabase()

    const metrics = await db
      .select()
      .from(engineDailyMetrics)
      .orderBy(asc(engineDailyMetrics.recordedOn))

    const activity = await db
      .select()
      .from(engineActivity)
      .orderBy(desc(engineActivity.occurredAt))
      .limit(5)

    return { metrics, activity }
  },
)
