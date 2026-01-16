import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@saas-platform/database'
import { withTenant, RouteContext } from '@/lib/api-middleware'

// POST /api/batches/[id]/mark-ready
export const POST = withTenant(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    const batchIdIndex = pathParts.indexOf('batches') + 1
    let batchId = pathParts[batchIdIndex]

    if (!batchId && (ctx as any).params?.id) {
      batchId = (ctx as any).params.id
    }

    console.log('[MARK_READY] URL:', url.pathname)
    console.log('[MARK_READY] Extracted batchId:', batchId)
    console.log('[MARK_READY] Tenant ID:', ctx.tenantId)

    if (!batchId) {
      return NextResponse.json({ error: 'Batch ID is required' }, { status: 400 })
    }

    const body = await req.json().catch(() => ({}))
    const { notes, lotId } = body

    console.log('[MARK_READY] Request body:', { notes, lotId })

    // Find batch to check status
    const batch = await prisma.batch.findFirst({
      where: { id: batchId, tenantId: ctx.tenantId },
      include: {
        recipe: { select: { id: true, name: true, style: true } },
        tank: { select: { id: true, name: true, type: true } },
      },
    })

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
    }

    // Already ready - return current state
    if (batch.status === 'READY') {
      console.log('[MARK_READY] Already READY, returning current batch')
      return NextResponse.json({
        success: true,
        batchId,
        batch: batch,
        batchNumber: batch.batchNumber,
      })
    }

    // Allow marking ready only from CONDITIONING status
    // ✅ FIX: For split batches, check lot.phase instead of batch.status
    if (lotId) {
      // Split batch - check specific lot's phase
      const lot = await prisma.lot.findFirst({
        where: { id: lotId, tenantId: ctx.tenantId }
      })
      
      if (!lot) {
        return NextResponse.json({ error: 'Lot not found' }, { status: 404 })
      }
      
      if (lot.phase !== 'CONDITIONING') {
        return NextResponse.json(
          { error: `Lot must be CONDITIONING to mark as ready. Current: ${lot.phase}` },
          { status: 400 }
        )
      }
      
      console.log('[MARK_READY] ✅ Split batch - lot phase check passed:', lot.phase)
    } else {
      // Regular batch - check batch status
      if (batch.status !== 'CONDITIONING') {
        return NextResponse.json(
          { error: `Batch must be CONDITIONING to mark as ready. Current: ${batch.status}` },
          { status: 400 }
        )
      }
    }

    // ═══════════════════════════════════════════════════════════
    // ✅ FIX: Find lot - use lotId if provided (split batch), otherwise find by batchId
    // ═══════════════════════════════════════════════════════════
    let targetLot: any = null
    
    if (lotId) {
      // Split batch - use provided lotId directly
      targetLot = await prisma.lot.findFirst({
        where: { id: lotId, tenantId: ctx.tenantId },
        include: { 
          LotBatch: { select: { batchId: true } } 
        }
      })
      console.log('[MARK_READY] ✅ Using provided lotId:', lotId)
    } else {
      // Regular batch - find lot by batchId
      const currentLotBatch = await prisma.lotBatch.findFirst({
        where: { 
          batchId: batchId,
          Lot: { phase: 'CONDITIONING' }
        },
        include: { 
          Lot: { 
            include: { 
              LotBatch: { select: { batchId: true } } 
            } 
          } 
        }
      })
      targetLot = currentLotBatch?.Lot
    }

    // Get all batch IDs from the same lot (for blended batches)
    let allBatchIds = [batchId]
    if (targetLot?.LotBatch && targetLot.LotBatch.length > 1) {
      allBatchIds = targetLot.LotBatch.map((lb: any) => lb.batchId)
      console.log('[MARK_READY] ✅ Detected BLENDED lot with', allBatchIds.length, 'batches:', allBatchIds)
    }

    // ✅ FIX: Update TankAssignment phase to BRIGHT for target lot
    try {
      const targetLotId = targetLot?.id
      
      const activeAssignments = await prisma.tankAssignment.findMany({
        where: {
          tenantId: ctx.tenantId,
          lotId: targetLotId,
          status: { in: ['ACTIVE', 'PLANNED'] },
        }
      })

      console.log('[MARK_READY] Filtering assignments by lotId:', targetLotId)
      console.log('[MARK_READY] Found active assignments:', activeAssignments.length)

      for (const assignment of activeAssignments) {
        await prisma.tankAssignment.update({
          where: { id: assignment.id },
          data: {
            phase: 'BRIGHT',
            status: 'ACTIVE'
          }
        })
        console.log('[MARK_READY] Updated assignment phase to BRIGHT:', assignment.id)
      }
      
      // ✅ FIX: Also update Tank.currentPhase to BRIGHT
      const tankIds = activeAssignments.map(a => a.tankId).filter(Boolean)
      if (tankIds.length > 0) {
        await prisma.tank.updateMany({
          where: { id: { in: tankIds } },
          data: { currentPhase: 'BRIGHT' }
        })
        console.log('[MARK_READY] ✅ Updated Tank.currentPhase to BRIGHT for', tankIds.length, 'tanks')
      }
    } catch (error: any) {
      console.warn('[MARK_READY] TankAssignment update failed:', error?.message)
    }

    // ✅ Update lot phase to BRIGHT
    if (targetLot) {
      await prisma.lot.update({
        where: { id: targetLot.id },
        data: { 
          phase: 'BRIGHT',
          status: 'ACTIVE'
        }
      })
      console.log('[MARK_READY] Updated lot phase to BRIGHT:', targetLot.id)
      
      // ✅ FIX: For split batches, check if all lots are now BRIGHT and update batch status
      if (lotId) {
        const remainingConditioningLots = await prisma.lot.count({
          where: {
            tenantId: ctx.tenantId,
            phase: { in: ['FERMENTATION', 'CONDITIONING'] },
            status: { not: 'COMPLETED' },  // ✅ ADD THIS LINE
            LotBatch: {
              some: { batchId: batchId }
            }
          }
        })
        
        if (remainingConditioningLots === 0) {
          // All lots are BRIGHT - update batch to READY
          await prisma.batch.update({
            where: { id: batchId },
            data: { 
              status: 'READY',
              readyAt: new Date(),
              updatedAt: new Date()
            }
          })
          console.log('[MARK_READY] ✅ All lots BRIGHT - batch updated to READY')
        } else {
          console.log('[MARK_READY] Still have', remainingConditioningLots, 'lots in FERMENTATION/CONDITIONING')
        }
      }
    }

    // ✅ FIX: Update ALL blended batches to READY status
    // ✅ CRITICAL FIX: For split batches, this is already handled above - skip here
    if (!lotId) {
      // Regular/blended batch - update batch status directly
      await prisma.batch.updateMany({
        where: { 
          id: { in: allBatchIds },
          tenantId: ctx.tenantId,
        },
        data: {
          status: 'READY',
          readyAt: new Date(),
          updatedAt: new Date(),
        },
      })
      console.log('[MARK_READY] ✅ Updated', allBatchIds.length, 'batches to READY')
    } else {
      console.log('[MARK_READY] Split batch - batch status handled in lot check logic above')
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
    // ✅ FIX: For split batches, only create if all lots are BRIGHT
    const shouldCreateTimeline = !lotId || (lotId && await prisma.lot.count({
      where: {
        tenantId: ctx.tenantId,
        LotBatch: { some: { batchId: batchId } },
        phase: { in: ['FERMENTATION', 'CONDITIONING'] },
        lotCode: { contains: '-' }
      }
    }) === 0)
    
    if (shouldCreateTimeline) {
      try {
        for (const bid of allBatchIds) {
          await prisma.batchTimeline.create({
            data: {
              batchId: bid,
              type: 'READY_FOR_PACKAGING',
              title: 'პარტია მზადაა',
              description: notes || 'პარტია მზადაა შეფუთვისთვის',
              createdBy: ctx.userId,
            },
          })
        }
      } catch (error) {
        console.warn('[MARK_READY] Timeline event creation failed:', error)
      }
    } else {
      console.log('[MARK_READY] Skipping timeline - not all split lots are ready yet')
    }

    console.log('[MARK_READY] ✅ Successfully marked as ready:', {
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
    console.error('[POST /api/batches/[id]/mark-ready] Error:', error)

    return NextResponse.json(
      { error: 'Failed to mark batch as ready', details: error.message || String(error) },
      { status: 500 }
    )
  }
})