import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@brewery/database'
import { withTenant, RouteContext } from '@/lib/api-middleware'

// GET /api/batches/[id]/lots - Get lots for a batch
export const GET = withTenant<any>(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    const batchIdIndex = pathParts.indexOf('batches') + 1
    let batchId = pathParts[batchIdIndex]

    if (!batchId && (ctx as any).params?.id) {
      batchId = (ctx as any).params.id
    }

    console.log('[GET_LOTS] Batch ID:', batchId)
    console.log('[GET_LOTS] Tenant ID:', ctx.tenantId)

    if (!batchId) {
      return NextResponse.json({ error: 'Batch ID is required' }, { status: 400 })
    }

    // Find lots associated with this batch
    const lots = await (prisma as any).lot?.findMany({
      where: {
        tenantId: ctx.tenantId,
        LotBatch: {
          some: { batchId: batchId }
        }
      },
      include: {
        LotBatch: {
          where: { batchId: batchId }
        }
      },
      orderBy: { createdAt: 'desc' },
    }).catch(() => [])

    console.log('[GET_LOTS] ✅ Found lots:', lots?.length || 0)

    return NextResponse.json({ lots: lots || [] })
  } catch (error: any) {
    console.error('[GET /api/batches/[id]/lots] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch lots', details: error.message || String(error) },
      { status: 500 }
    )
  }
})

// POST /api/batches/[id]/lots - Create a new lot for a batch
export const POST = withTenant<any>(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    const batchIdIndex = pathParts.indexOf('batches') + 1
    let batchId = pathParts[batchIdIndex]

    if (!batchId && (ctx as any).params?.id) {
      batchId = (ctx as any).params.id
    }

    console.log('[POST_LOT] Batch ID:', batchId)
    console.log('[POST_LOT] Tenant ID:', ctx.tenantId)

    if (!batchId) {
      return NextResponse.json({ error: 'Batch ID is required' }, { status: 400 })
    }

    const body = await req.json().catch(() => ({}))
    const { lotNumber, phase, notes } = body

    if (!lotNumber) {
      return NextResponse.json({ error: 'Lot number is required' }, { status: 400 })
    }

    // Check if lot already exists
    const existingLot = await (prisma as any).lot?.findFirst({
      where: { lotNumber, tenantId: ctx.tenantId },
    })

    if (existingLot) {
      return NextResponse.json(
        { error: 'ლოტი ამ ნომრით უკვე არსებობს' },
        { status: 400 }
      )
    }

    // Create lot
    const lot = await (prisma as any).lot?.create({
      data: {
        lotNumber,
        tenantId: ctx.tenantId,
        status: 'ACTIVE',
        currentPhase: phase || 'FERMENTATION',
        notes,
        LotBatch: {
          create: {
            batchId: batchId,
            tenantId: ctx.tenantId,
          }
        }
      },
      include: {
        LotBatch: true,
      }
    })

    console.log('[POST_LOT] ✅ Created lot:', lot.lotNumber)

    return NextResponse.json(lot)
  } catch (error: any) {
    console.error('[POST /api/batches/[id]/lots] Error:', error)
    return NextResponse.json(
      { error: 'Failed to create lot', details: error.message || String(error) },
      { status: 500 }
    )
  }
})












