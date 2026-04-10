import { NextRequest, NextResponse } from 'next/server'
import { withTenantAuth, type RouteContext } from '../withTenantAuth'
import { prisma } from '@saas-platform/database'
import type { Prisma } from '@prisma/client'

export type HaccpConfigJson = {
  fermentationVessel: 'QVEVRI' | 'TANK' | 'BOTH'
  activeCcps: string[]
  activeSops: string[]
  journalFrequency: 'DAILY' | 'PER_SHIFT' | 'PER_BATCH'
}

const DEFAULT_CONFIG: HaccpConfigJson = {
  fermentationVessel: 'BOTH',
  activeCcps: [],
  activeSops: [],
  journalFrequency: 'DAILY',
}

function configKey(tenantId: string): string {
  return `haccp.config.${tenantId}`
}

function parseConfig(value: unknown): HaccpConfigJson {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ...DEFAULT_CONFIG }
  }
  const v = value as Record<string, unknown>
  const vessel = v.fermentationVessel
  const freq = v.journalFrequency
  return {
    fermentationVessel:
      vessel === 'QVEVRI' || vessel === 'TANK' || vessel === 'BOTH'
        ? vessel
        : DEFAULT_CONFIG.fermentationVessel,
    activeCcps: Array.isArray(v.activeCcps) ? v.activeCcps.map(String) : [],
    activeSops: Array.isArray(v.activeSops) ? v.activeSops.map(String) : [],
    journalFrequency:
      freq === 'DAILY' || freq === 'PER_SHIFT' || freq === 'PER_BATCH'
        ? freq
        : DEFAULT_CONFIG.journalFrequency,
  }
}

// GET /api/haccp/config — tenant HACCP JSON config (Configuration table, key per tenant)
export const GET = withTenantAuth(async (_req: NextRequest, ctx: RouteContext) => {
  try {
    const row = await prisma.configuration.findUnique({
      where: { key: configKey(ctx.tenantId) },
    })

    const config = row?.value != null ? parseConfig(row.value) : { ...DEFAULT_CONFIG }
    return NextResponse.json({ config })
  } catch (error) {
    console.error('[GET /api/haccp/config]', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to load HACCP config' } },
      { status: 500 }
    )
  }
})

// PUT /api/haccp/config — replace / upsert tenant HACCP config
export const PUT = withTenantAuth(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const body = await req.json()
    const incoming = body.config !== undefined ? body.config : body
    if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'config object required' } },
        { status: 400 }
      )
    }

    const merged: HaccpConfigJson = {
      ...DEFAULT_CONFIG,
      ...parseConfig(incoming),
    }

    const value = merged as unknown as Prisma.InputJsonValue
    const key = configKey(ctx.tenantId)

    const row = await prisma.configuration.upsert({
      where: { key },
      create: {
        key,
        value,
      },
      update: { value },
    })

    const config = parseConfig(row.value)
    return NextResponse.json({ config })
  } catch (error) {
    console.error('[PUT /api/haccp/config]', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to save HACCP config' } },
      { status: 500 }
    )
  }
})
