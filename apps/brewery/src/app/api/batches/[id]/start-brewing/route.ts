import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@saas-platform/database'
import { withTenant, RouteContext } from '@/lib/api-middleware'
import { Prisma } from '@prisma/client'

interface StartBrewingInput {
  originalGravity?: number
  kettleId?: string
  volume?: number
  notes?: string
}

// POST /api/batches/[id]/start-brewing
export const POST = withTenant(async (
  req: NextRequest, 
  ctx: RouteContext
) => {
  try {
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    const batchId = pathParts[pathParts.length - 2] // Get batch ID from path (e.g., /api/batches/[id]/start-brewing)
    
    if (!batchId || batchId === 'start-brewing') {
      return NextResponse.json({ error: 'Batch ID is required' }, { status: 400 })
    }
    
    console.log('[start-brewing] BatchId:', batchId)
    
    const body: StartBrewingInput = await req.json().catch(() => ({}))
    console.log('[start-brewing] Body:', body)

    // 1. Get batch
    const batch = await prisma.batch.findFirst({
      where: { 
        id: batchId, 
        tenantId: ctx.tenantId 
      },
    })

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
    }

    // 2. Check status
    if (batch.status !== 'PLANNED') {
      return NextResponse.json({ 
        error: `Cannot start brewing. Batch status is ${batch.status}, expected PLANNED` 
      }, { status: 400 })
    }

    // 3. Update batch
    const updatedBatch = await prisma.batch.update({
      where: { id: batchId },
      data: {
        status: 'BREWING',
        brewedAt: new Date(),
        originalGravity: body.originalGravity ? new Prisma.Decimal(body.originalGravity) : null,
        updatedAt: new Date(),
      }
    })

    // 4. Create timeline entry
    await prisma.batchTimeline.create({
      data: {
        batchId: batchId,
        type: 'BREWING_STARTED',
        title: 'ხარშვა დაიწყო',
        description: body.notes || 'ხარშვა დაიწყო',
        data: {
          originalGravity: body.originalGravity,
          kettleId: body.kettleId,
        },
        createdAt: new Date(),
        createdBy: ctx.userId || 'system',
      }
    })

    return NextResponse.json({ 
      success: true, 
      Batch: updatedBatch 
    })

  } catch (error) {
    console.error('[POST /api/batches/[id]/start-brewing] Error:', error)
    return NextResponse.json({ 
      error: 'Failed to start brewing',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
})
