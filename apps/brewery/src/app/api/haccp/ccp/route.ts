import { NextRequest, NextResponse } from 'next/server'
import { withTenantAuth, type RouteContext } from '../withTenantAuth'
import { prisma } from '@saas-platform/database'
import type { CcpType, CcpResult } from '@prisma/client'

const VALID_CCP_TYPES: CcpType[] = ['BOILING', 'VESSEL_SANITATION']
const VALID_RESULTS: CcpResult[] = ['PASS', 'FAIL', 'CORRECTIVE_ACTION']

function isCcpType(v: unknown): v is CcpType {
  return typeof v === 'string' && VALID_CCP_TYPES.includes(v as CcpType)
}

function isCcpResult(v: unknown): v is CcpResult {
  return typeof v === 'string' && VALID_RESULTS.includes(v as CcpResult)
}

// GET /api/haccp/ccp — list CCP logs (optional ?batchId=)
export const GET = withTenantAuth(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const { searchParams } = new URL(req.url)
    const batchId = searchParams.get('batchId') || undefined
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10) || 100, 500)

    const logs = await prisma.ccpLog.findMany({
      where: {
        tenantId: ctx.tenantId,
        ...(batchId ? { batchId } : {}),
      },
      orderBy: { recordedAt: 'desc' },
      take: limit,
      include: {
        batch: { select: { id: true, batchNumber: true } },
        user: { select: { id: true, name: true, email: true, signatureUrl: true } },
      },
    })

    return NextResponse.json({ ccpLogs: logs })
  } catch (error) {
    console.error('[GET /api/haccp/ccp]', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to list CCP logs' } },
      { status: 500 }
    )
  }
})

// POST /api/haccp/ccp — create CCP log
export const POST = withTenantAuth(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const body = await req.json()

    if (!isCcpType(body.ccpType)) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid or missing ccpType' } },
        { status: 400 }
      )
    }
    if (!isCcpResult(body.result)) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid or missing result' } },
        { status: 400 }
      )
    }

    const batchId = body.batchId === null || body.batchId === undefined ? undefined : String(body.batchId)
    if (batchId) {
      const batch = await prisma.batch.findFirst({
        where: { id: batchId, tenantId: ctx.tenantId },
        select: { id: true },
      })
      if (!batch) {
        return NextResponse.json(
          { error: { code: 'NOT_FOUND', message: 'Batch not found for this tenant' } },
          { status: 404 }
        )
      }
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

    const recordedAt =
      body.recordedAt != null ? new Date(body.recordedAt) : undefined
    if (recordedAt && Number.isNaN(recordedAt.getTime())) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid recordedAt' } },
        { status: 400 }
      )
    }

    const log = await prisma.ccpLog.create({
      data: {
        tenantId: ctx.tenantId,
        ccpType: body.ccpType,
        batchId: batchId || null,
        temperature: body.temperature != null ? Number(body.temperature) : null,
        duration: body.duration != null ? parseInt(String(body.duration), 10) : null,
        phLevel: body.phLevel != null ? Number(body.phLevel) : null,
        visualCheck: typeof body.visualCheck === 'boolean' ? body.visualCheck : null,
        result: body.result,
        correctiveAction:
          body.correctiveAction != null ? String(body.correctiveAction) : null,
        recordedBy: ctx.userId,
        ...(recordedAt ? { recordedAt } : {}),
      },
      include: {
        batch: { select: { id: true, batchNumber: true } },
        user: { select: { id: true, name: true, email: true, signatureUrl: true } },
      },
    })

    return NextResponse.json({ ccpLog: log }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/haccp/ccp]', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to create CCP log' } },
      { status: 500 }
    )
  }
})
