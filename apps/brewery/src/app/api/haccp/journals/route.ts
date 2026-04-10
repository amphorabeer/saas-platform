import { NextRequest, NextResponse } from 'next/server'
import { withTenantAuth, type RouteContext } from '../withTenantAuth'
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
]

function isJournalType(v: unknown): v is HaccpJournalType {
  return typeof v === 'string' && VALID_TYPES.includes(v as HaccpJournalType)
}

// GET /api/haccp/journals — ?type=&dateFrom=&dateTo=
export const GET = withTenantAuth(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const { searchParams } = new URL(req.url)
    const typeParam = searchParams.get('type')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10) || 100, 500)

    const recordedAt: Prisma.DateTimeFilter | undefined =
      dateFrom || dateTo
        ? {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(dateTo) } : {}),
          }
        : undefined

    if (dateFrom && recordedAt?.gte && Number.isNaN((recordedAt.gte as Date).getTime())) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid dateFrom' } },
        { status: 400 }
      )
    }
    if (dateTo && recordedAt?.lte && Number.isNaN((recordedAt.lte as Date).getTime())) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid dateTo' } },
        { status: 400 }
      )
    }

    if (typeParam && !isJournalType(typeParam.toUpperCase())) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid type filter' } },
        { status: 400 }
      )
    }

    const journals = await prisma.haccpJournal.findMany({
      where: {
        tenantId: ctx.tenantId,
        ...(typeParam ? { type: typeParam.toUpperCase() as HaccpJournalType } : {}),
        ...(recordedAt && Object.keys(recordedAt).length ? { recordedAt } : {}),
      },
      orderBy: { recordedAt: 'desc' },
      take: limit,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    })

    return NextResponse.json({ journals })
  } catch (error) {
    console.error('[GET /api/haccp/journals]', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to list journals' } },
      { status: 500 }
    )
  }
})

// POST /api/haccp/journals
export const POST = withTenantAuth(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const body = await req.json()

    const typeRaw = body.type
    const type =
      typeof typeRaw === 'string' ? typeRaw.toUpperCase() : typeRaw
    if (!isJournalType(type)) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid or missing type' } },
        { status: 400 }
      )
    }

    if (body.data === undefined || body.data === null) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'data is required' } },
        { status: 400 }
      )
    }

    const user = await prisma.user.findFirst({
      where: { id: ctx.userId, tenantId: ctx.tenantId },
      select: { id: true },
    })
    if (!user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'User not found in tenant' } },
        { status: 401 }
      )
    }

    let dataJson: Prisma.InputJsonValue
    try {
      dataJson =
        typeof body.data === 'string'
          ? (JSON.parse(body.data) as Prisma.InputJsonValue)
          : (body.data as Prisma.InputJsonValue)
    } catch {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'data must be valid JSON' } },
        { status: 400 }
      )
    }

    const recordedAt =
      body.recordedAt != null ? new Date(body.recordedAt) : undefined
    if (recordedAt && Number.isNaN(recordedAt.getTime())) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid recordedAt' } },
        { status: 400 }
      )
    }

    const journal = await prisma.haccpJournal.create({
      data: {
        tenantId: ctx.tenantId,
        type,
        data: dataJson,
        recordedBy: ctx.userId,
        ...(recordedAt ? { recordedAt } : {}),
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    })

    return NextResponse.json({ journal }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/haccp/journals]', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to create journal' } },
      { status: 500 }
    )
  }
})
