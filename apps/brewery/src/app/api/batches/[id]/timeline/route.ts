import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@saas-platform/database'
import { withTenant, RouteContext } from '@/lib/api-middleware'

// GET /api/batches/[id]/timeline - Get timeline events for a batch
export const GET = withTenant(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    const batchIdIndex = pathParts.indexOf('batches') + 2
    const batchId = pathParts[batchIdIndex]

    if (!batchId) {
      return NextResponse.json({ error: 'Batch ID is required' }, { status: 400 })
    }

    // Get batch first to verify tenant
    const batch = await prisma.batch.findFirst({
      where: {
        id: batchId,
        tenantId: ctx.tenantId,
      },
    })

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
    }

    const timeline = await prisma.batchTimeline.findMany({
      where: {
        batchId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ timeline })
  } catch (error: any) {
    console.error('[GET /api/batches/[id]/timeline] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch timeline', details: error.message },
      { status: 500 }
    )
  }
})

// POST /api/batches/[id]/timeline - Create timeline event
export const POST = withTenant(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    const batchIdIndex = pathParts.indexOf('batches') + 2
    const batchId = pathParts[batchIdIndex]

    if (!batchId) {
      return NextResponse.json({ error: 'Batch ID is required' }, { status: 400 })
    }
    const body = await req.json()

    // Verify batch exists
    const batch = await prisma.batch.findFirst({
      where: {
        id: batchId,
        tenantId: ctx.tenantId,
      },
    })

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
    }

    // Map custom types to valid Prisma enum values
    const validTypes = [
      'CREATED', 'STARTED', 'MASH', 'BOIL', 'TRANSFER',
      'GRAVITY_READING', 'DRY_HOP', 'TEMPERATURE_CHANGE',
      'NOTE', 'COMPLETED', 'INGREDIENTS_RESERVED',
      'BREWING_STARTED', 'MASH_COMPLETE', 'BOIL_COMPLETE',
      'TRANSFER_TO_FERMENTER', 'FERMENTATION_STARTED',
      'DRY_HOP_ADDED', 'CONDITIONING_STARTED',
      'READY_FOR_PACKAGING', 'PACKAGING_STARTED',
      'PACKAGING_COMPLETE', 'CANCELLED'
    ]

    const typeMap: Record<string, string> = {
      'PACKAGING': 'PACKAGING_STARTED',
    }

    const mappedType = typeMap[body.type] || body.type
    const type = validTypes.includes(mappedType) ? mappedType : 'NOTE'

    const timelineEvent = await prisma.batchTimeline.create({
      data: {
        batchId: batchId,
        type: type as any,
        title: body.title || 'Timeline Event',
        description: body.description || null,
        createdBy: ctx.userId || 'system',
        data: body.data || null,
      },
    })

    return NextResponse.json({ event: timelineEvent }, { status: 201 })
  } catch (error: any) {
    console.error('[POST /api/batches/[id]/timeline] Error:', error)
    return NextResponse.json(
      { error: 'Failed to create timeline event', details: error.message },
      { status: 500 }
    )
  }
})
