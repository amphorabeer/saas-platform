import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@saas-platform/database'
import { withTenant, RouteContext } from '@/lib/api-middleware'

// POST /api/packaging/start
export const POST = withTenant(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const body = await req.json()
    const { batchId, packageType, quantity, notes } = body

    console.log('[PACKAGING/START] Request:', JSON.stringify(body, null, 2))
    console.log('[PACKAGING/START] Tenant ID:', ctx.tenantId)

    if (!batchId) {
      return NextResponse.json({ error: 'Batch ID is required' }, { status: 400 })
    }

    // Find batch
    const batch = await prisma.batch.findFirst({
      where: { id: batchId, tenantId: ctx.tenantId },
      include: {
        recipe: { select: { id: true, name: true, style: true } },
        tank: { select: { id: true, name: true, type: true } },
      },
    })

    if (!batch) {
      return NextResponse.json({ error: 'ბაჩი ვერ მოიძებნა' }, { status: 404 })
    }

    // Check status - should be READY
    if (batch.status !== 'READY') {
      return NextResponse.json(
        { error: `ბაჩი უნდა იყოს READY სტატუსში. ახლანდელი: ${batch.status}` },
        { status: 400 }
      )
    }

    // ═══════════════════════════════════════════════════════════
    // ✅ FIX: Find ALL blended batches in the same lot
    // ═══════════════════════════════════════════════════════════
    const currentLotBatch = await prisma.lotBatch.findFirst({
      where: { 
        batchId: batchId,
        Lot: { 
          status: { not: 'COMPLETED' }
        }
      },
      include: { 
        Lot: { 
          include: { 
            LotBatch: { select: { batchId: true } } 
          } 
        } 
      }
    })

    // Get all batch IDs from the same lot (for blended batches)
    let allBatchIds = [batchId]
    if (currentLotBatch?.Lot?.LotBatch && currentLotBatch.Lot.LotBatch.length > 1) {
      allBatchIds = currentLotBatch.Lot.LotBatch.map(lb => lb.batchId)
      console.log('[PACKAGING/START] ✅ Detected BLENDED lot with', allBatchIds.length, 'batches:', allBatchIds)
    }

    // ✅ Update TankAssignment phase to PACKAGING
    try {
      const activeAssignments = await prisma.tankAssignment.findMany({
        where: {
          tenantId: ctx.tenantId,
          status: { in: ['PLANNED', 'ACTIVE'] },
          Lot: {
            LotBatch: {
              some: { batchId: { in: allBatchIds } }
            }
          }
        }
      })

      console.log('[PACKAGING/START] Found active assignments:', activeAssignments.length)

      for (const assignment of activeAssignments) {
        await prisma.tankAssignment.update({
          where: { id: assignment.id },
          data: {
            phase: 'PACKAGING',
            status: 'ACTIVE'
          }
        })
        console.log('[PACKAGING/START] Updated assignment phase to PACKAGING:', assignment.id)
      }
    } catch (error: any) {
      console.warn('[PACKAGING/START] TankAssignment update failed:', error?.message)
    }

    // ✅ FIX: Update ALL blended batches to PACKAGING status
    await prisma.batch.updateMany({
      where: { 
        id: { in: allBatchIds },
        tenantId: ctx.tenantId,
      },
      data: {
        status: 'PACKAGING',
        updatedAt: new Date(),
      },
    })
    
    console.log('[PACKAGING/START] ✅ Updated', allBatchIds.length, 'batches to PACKAGING')

    // Update lot phase if exists
    if (currentLotBatch?.Lot) {
      await prisma.lot.update({
        where: { id: currentLotBatch.Lot.id },
        data: { 
          phase: 'PACKAGING',
          status: 'ACTIVE'
        }
      })
    }

    // Get updated batch for response
    const updatedBatch = await prisma.batch.findFirst({
      where: { id: batchId, tenantId: ctx.tenantId },
      include: {
        recipe: { select: { id: true, name: true, style: true } },
        tank: { select: { id: true, name: true, type: true } },
      },
    })

    // Create timeline events for all batches
    try {
      for (const bid of allBatchIds) {
        await prisma.batchTimeline.create({
          data: {
            batchId: bid,
            type: 'PACKAGING_STARTED',
            title: 'შეფუთვა დაიწყო',
            description: notes || `შეფუთვის ტიპი: ${packageType || 'N/A'}`,
            data: {
              packageType,
              quantity,
            },
            createdBy: ctx.userId || 'system',
          },
        })
      }
    } catch (error) {
      console.warn('[PACKAGING/START] Timeline event creation failed:', error)
    }

    console.log('[PACKAGING/START] ✅ Successfully started packaging:', {
      batchId,
      batchNumber: updatedBatch?.batchNumber,
      status: updatedBatch?.status,
      totalBatchesUpdated: allBatchIds.length,
    })

    return NextResponse.json({
      success: true,
      batchId,
      batch: updatedBatch,
      batchNumber: updatedBatch?.batchNumber,
      blendedBatchesUpdated: allBatchIds.length,
    })
  } catch (error: any) {
    console.error('[PACKAGING/START] Error:', error.message)
    return NextResponse.json(
      { error: 'შეფუთვის დაწყება ვერ მოხერხდა', details: error.message },
      { status: 500 }
    )
  }
})