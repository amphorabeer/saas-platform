import { NextRequest, NextResponse } from 'next/server'
import { withTenantAuth, type RouteContext } from '../withTenantAuth'
import { prisma } from '@saas-platform/database'
import type { SopType } from '@prisma/client'
import { Prisma } from '@prisma/client'

const VALID_SOP: SopType[] = [
  'CLEANING',
  'CALIBRATION',
  'PERSONNEL_HYGIENE',
  'HAND_WASHING',
  'WASTE',
  'PEST',
  'CHEMICALS',
]

function isSopType(v: unknown): v is SopType {
  return typeof v === 'string' && VALID_SOP.includes(v as SopType)
}

// GET /api/haccp/sop — ?sopType=&dateFrom=&dateTo= (filters completedAt)
export const GET = withTenantAuth(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const { searchParams } = new URL(req.url)
    const sopTypeParam = searchParams.get('sopType')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10) || 100, 500)

    if (sopTypeParam && !isSopType(sopTypeParam.toUpperCase())) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid sopType filter' } },
        { status: 400 }
      )
    }

    const completedAt: Prisma.DateTimeFilter | undefined =
      dateFrom || dateTo
        ? {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(dateTo) } : {}),
          }
        : undefined

    if (dateFrom && completedAt?.gte && Number.isNaN((completedAt.gte as Date).getTime())) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid dateFrom' } },
        { status: 400 }
      )
    }
    if (dateTo && completedAt?.lte && Number.isNaN((completedAt.lte as Date).getTime())) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid dateTo' } },
        { status: 400 }
      )
    }

    const completions = await prisma.sopCompletion.findMany({
      where: {
        tenantId: ctx.tenantId,
        ...(sopTypeParam ? { sopType: sopTypeParam.toUpperCase() as SopType } : {}),
        ...(completedAt && Object.keys(completedAt).length ? { completedAt } : {}),
      },
      orderBy: { completedAt: 'desc' },
      take: limit,
      include: {
        user: { select: { id: true, name: true, email: true, signatureUrl: true } },
      },
    })

    return NextResponse.json({ sopCompletions: completions })
  } catch (error) {
    console.error('[GET /api/haccp/sop]', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to list SOP completions' } },
      { status: 500 }
    )
  }
})

// POST /api/haccp/sop — mark SOP completed
export const POST = withTenantAuth(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const body = await req.json()
    const raw = body.sopType
    const sopType = typeof raw === 'string' ? raw.toUpperCase() : raw
    if (!isSopType(sopType)) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid or missing sopType' } },
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

    const completedAt =
      body.completedAt != null ? new Date(body.completedAt) : undefined
    if (completedAt && Number.isNaN(completedAt.getTime())) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid completedAt' } },
        { status: 400 }
      )
    }

    const completion = await prisma.sopCompletion.create({
      data: {
        tenantId: ctx.tenantId,
        sopType,
        completedBy: ctx.userId,
        notes: body.notes != null ? String(body.notes) : null,
        ...(completedAt ? { completedAt } : {}),
      },
      include: {
        user: { select: { id: true, name: true, email: true, signatureUrl: true } },
      },
    })

    return NextResponse.json({ sopCompletion: completion }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/haccp/sop]', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to create SOP completion' } },
      { status: 500 }
    )
  }
})
