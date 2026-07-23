import type { Config } from '@netlify/functions'
import { db } from '../../db/index.js'
import { engineActivity, engineDailyMetrics } from '../../db/schema.js'

type TelemetryPayload = {
  recordedOn: string
  processedSignals: number
  conversions: number
  revenueCents: number
  valueCreatedCents: number
  accuracyBasisPoints: number
  latencyMs: number
  uptimeBasisPoints: number
  event?: {
    category: string
    title: string
    detail: string
    impactCents: number
    status: string
    accent: string
  }
}

function isValidNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function isValidPayload(value: unknown): value is TelemetryPayload {
  if (!value || typeof value !== 'object') return false

  const payload = value as Partial<TelemetryPayload>
  return (
    typeof payload.recordedOn === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(payload.recordedOn) &&
    isValidNumber(payload.processedSignals) &&
    isValidNumber(payload.conversions) &&
    isValidNumber(payload.revenueCents) &&
    isValidNumber(payload.valueCreatedCents) &&
    isValidNumber(payload.accuracyBasisPoints) &&
    isValidNumber(payload.latencyMs) &&
    isValidNumber(payload.uptimeBasisPoints)
  )
}

export default async (request: Request) => {
  const ingestToken = Netlify.env.get('NOSIE_INGEST_TOKEN')
  const authorization = request.headers.get('authorization')

  if (!ingestToken) {
    return Response.json(
      { error: 'Telemetry ingestion is not configured.' },
      { status: 503 },
    )
  }

  if (authorization !== `Bearer ${ingestToken}`) {
    return Response.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON payload.' }, { status: 400 })
  }

  if (!isValidPayload(body)) {
    return Response.json(
      { error: 'Telemetry payload is incomplete or invalid.' },
      { status: 422 },
    )
  }

  await db
    .insert(engineDailyMetrics)
    .values(body)
    .onConflictDoUpdate({
      target: engineDailyMetrics.recordedOn,
      set: {
        processedSignals: body.processedSignals,
        conversions: body.conversions,
        revenueCents: body.revenueCents,
        valueCreatedCents: body.valueCreatedCents,
        accuracyBasisPoints: body.accuracyBasisPoints,
        latencyMs: body.latencyMs,
        uptimeBasisPoints: body.uptimeBasisPoints,
      },
    })

  if (body.event) {
    const { event } = body
    await db.insert(engineActivity).values({
      occurredAt: new Date(),
      category: event.category,
      title: event.title,
      detail: event.detail,
      impactCents: event.impactCents,
      status: event.status,
      accent: event.accent,
    })
  }

  return Response.json({ accepted: true, recordedOn: body.recordedOn })
}

export const config: Config = {
  path: '/api/engine/telemetry',
  method: 'POST',
}
