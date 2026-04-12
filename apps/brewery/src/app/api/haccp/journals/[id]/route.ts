import { NextRequest, NextResponse } from 'next/server'
import { withTenantAuth, type RouteContext } from '../../withTenantAuth'
import { prisma } from '@saas-platform/database'
import type { HaccpJournalType } from '@prisma/client'
import { Prisma } from '@prisma/client'

const VALID_TYPES: HaccpJournalType[] = [
  'SANITATION',
  'INCOMING_CONTROL',
  'PEST_CONTROL',
  'WASTE_MANAGEMENT',
  'TEMPERATURE',
  'SUPPLIER',
  'KEG_WASHING',
  'FILLING',
  'INCIDENT',
  'HEALTH_CHECK',
  'THERMOMETER_CALIBRATION',
  'TRAINING',
  'HYGIENE_VIOLATION',
  'CHEMICAL_LOG',
  'STORAGE_CONTROL',
  'JOURNAL_VERIFICATION',
  'MANAGEMENT_REVIEW',
  'AUDIT',
  'CORRECTIVE_ACTION',
  'RODENT_TRAP',
]

function isJournalType(v: unknown): v is HaccpJournalType {
  return typeof v === 'string' && VALID_TYPES.includes(v as HaccpJournalType)
}

function extractId(url: string): string {
  const pathParts = new URL(url).pathname.split('/').filter(Boolean)
  return pathParts[pathParts.length - 1] || ''
}

export const GET = withTenantAuth(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const id = extractId(req.url)
    if (!id) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Journal ID required' } },
        { status: 400 }
      )
    }

    const journal = await prisma.haccpJournal.findFirst({
      where: { id, tenantId: ctx.tenantId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    })

    if (!journal) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Journal not found' } },
        { status: 404 }
      )
    }

    return NextResponse.json({ journal })
  } catch (error) {
    console.error('[GET /api/haccp/journals/[id]]', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch journal' } },
      { status: 500 }
    )
  }
})

export const PUT = withTenantAuth(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const id = extractId(req.url)
    if (!id) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Journal ID required' } },
        { status: 400 }
      )
    }

    const existing = await prisma.haccpJournal.findFirst({
      where: { id, tenantId: ctx.tenantId },
    })
    if (!existing) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Journal not found' } },
        { status: 404 }
      )
    }

    const body = await req.json()
    const data: Prisma.HaccpJournalUpdateInput = {}

    if (body.type !== undefined) {
      const t = typeof body.type === 'string' ? body.type.toUpperCase() : body.type
      if (!isJournalType(t)) {
        return NextResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: 'Invalid type' } },
          { status: 400 }
        )
      }
      data.type = t
    }

    if (body.data !== undefined) {
      try {
        data.data =
          typeof body.data === 'string'
            ? (JSON.parse(body.data) as Prisma.InputJsonValue)
            : (body.data as Prisma.InputJsonValue)
      } catch {
        return NextResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: 'data must be valid JSON' } },
          { status: 400 }
        )
      }
    }

    if (body.recordedAt !== undefined) {
      if (body.recordedAt === null) {
        return NextResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: 'recordedAt cannot be null' } },
          { status: 400 }
        )
      }
      const d = new Date(body.recordedAt)
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: 'Invalid recordedAt' } },
          { status: 400 }
        )
      }
      data.recordedAt = d
    }

    const journal = await prisma.haccpJournal.update({
      where: { id },
      data,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    })

    return NextResponse.json({ journal })
  } catch (error) {
    console.error('[PUT /api/haccp/journals/[id]]', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to update journal' } },
      { status: 500 }
    )
  }
})

export const DELETE = withTenantAuth(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const id = extractId(req.url)
    if (!id) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Journal ID required' } },
        { status: 400 }
      )
    }

    const existing = await prisma.haccpJournal.findFirst({
      where: { id, tenantId: ctx.tenantId },
    })
    if (!existing) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Journal not found' } },
        { status: 404 }
      )
    }

    await prisma.haccpJournal.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/haccp/journals/[id]]', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to delete journal' } },
      { status: 500 }
    )
  }
})
