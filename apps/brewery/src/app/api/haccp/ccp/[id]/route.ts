import { NextRequest, NextResponse } from 'next/server'
import { withTenantAuth, type RouteContext } from '../../withTenantAuth'
import { prisma } from '@saas-platform/database'
import type { CcpType, CcpResult } from '@prisma/client'

const VALID_CCP_TYPES: CcpType[] = ['BOILING', 'VESSEL_SANITATION']
const VALID_RESULTS: CcpResult[] = ['PASS', 'FAIL', 'CORRECTIVE_ACTION']

function extractId(url: string): string {
  const pathParts = new URL(url).pathname.split('/').filter(Boolean)
  return pathParts[pathParts.length - 1] || ''
}

// GET /api/haccp/ccp/[id]
export const GET = withTenantAuth(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const id = extractId(req.url)
    if (!id) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'CCP log ID required' } },
        { status: 400 }
      )
    }

    const log = await prisma.ccpLog.findFirst({
      where: { id, tenantId: ctx.tenantId },
      include: {
        batch: { select: { id: true, batchNumber: true } },
        user: { select: { id: true, name: true, email: true, signatureUrl: true } },
      },
    })

    if (!log) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'CCP log not found' } },
        { status: 404 }
      )
    }

    return NextResponse.json({ ccpLog: log })
  } catch (error) {
    console.error('[GET /api/haccp/ccp/[id]]', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch CCP log' } },
      { status: 500 }
    )
  }
})

// PUT /api/haccp/ccp/[id]
export const PUT = withTenantAuth(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const id = extractId(req.url)
    if (!id) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'CCP log ID required' } },
        { status: 400 }
      )
    }

    const existing = await prisma.ccpLog.findFirst({
      where: { id, tenantId: ctx.tenantId },
    })
    if (!existing) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'CCP log not found' } },
        { status: 404 }
      )
    }

    const body = await req.json()
    const data: Record<string, unknown> = {}

    if (body.ccpType !== undefined) {
      if (!VALID_CCP_TYPES.includes(body.ccpType)) {
        return NextResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: 'Invalid ccpType' } },
          { status: 400 }
        )
      }
      data.ccpType = body.ccpType
    }
    if (body.result !== undefined) {
      if (!VALID_RESULTS.includes(body.result)) {
        return NextResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: 'Invalid result' } },
          { status: 400 }
        )
      }
      data.result = body.result
    }
    if (body.batchId !== undefined) {
      if (body.batchId === null) {
        data.batchId = null
      } else {
        const batchId = String(body.batchId)
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
        data.batchId = batchId
      }
    }
    if (body.temperature !== undefined) {
      data.temperature = body.temperature == null ? null : Number(body.temperature)
    }
    if (body.duration !== undefined) {
      data.duration = body.duration == null ? null : parseInt(String(body.duration), 10)
    }
    if (body.phLevel !== undefined) {
      data.phLevel = body.phLevel == null ? null : Number(body.phLevel)
    }
    if (body.visualCheck !== undefined) {
      data.visualCheck =
        body.visualCheck === null ? null : Boolean(body.visualCheck)
    }
    if (body.correctiveAction !== undefined) {
      data.correctiveAction =
        body.correctiveAction == null ? null : String(body.correctiveAction)
    }
    if (body.recordedAt !== undefined) {
      if (body.recordedAt === null) {
        data.recordedAt = undefined
      } else {
        const d = new Date(body.recordedAt)
        if (Number.isNaN(d.getTime())) {
          return NextResponse.json(
            { error: { code: 'VALIDATION_ERROR', message: 'Invalid recordedAt' } },
            { status: 400 }
          )
        }
        data.recordedAt = d
      }
    }

    const log = await prisma.ccpLog.update({
      where: { id },
      data: data as any,
      include: {
        batch: { select: { id: true, batchNumber: true } },
        user: { select: { id: true, name: true, email: true, signatureUrl: true } },
      },
    })

    return NextResponse.json({ ccpLog: log })
  } catch (error) {
    console.error('[PUT /api/haccp/ccp/[id]]', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to update CCP log' } },
      { status: 500 }
    )
  }
})

// DELETE /api/haccp/ccp/[id]
export const DELETE = withTenantAuth(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const id = extractId(req.url)
    if (!id) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'CCP log ID required' } },
        { status: 400 }
      )
    }

    const existing = await prisma.ccpLog.findFirst({
      where: { id, tenantId: ctx.tenantId },
    })
    if (!existing) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'CCP log not found' } },
        { status: 404 }
      )
    }

    await prisma.ccpLog.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/haccp/ccp/[id]]', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to delete CCP log' } },
      { status: 500 }
    )
  }
})
