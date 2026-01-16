import { NextRequest, NextResponse } from 'next/server'
import { withPermission, RouteContext } from '@/lib/api-middleware'
import { prisma } from '@saas-platform/database'

// GET /api/batches/[id] - Get batch details (requires batch:read)
export const GET = withPermission('batch:read', async (
  req: NextRequest, 
  ctx: RouteContext
) => {
  const id = req.url.split('/').pop()!
  
  const batch = await prisma.batch.findUnique({
    where: { id, tenantId: ctx.tenantId },
    include: {
      recipe: {
        include: {
          ingredients: {
            include: {
              // Note: RecipeIngredient doesn't have direct relation to InventoryItem
              // inventoryItemId is just a string field
            },
          },
        },
      },
      tank: true,
      ingredients: true,
      gravityReadings: { orderBy: { recordedAt: 'desc' } },
      QCTest: { orderBy: { scheduledDate: 'desc' } },
      timeline: { orderBy: { createdAt: 'desc' }, take: 50 },
      packagingRuns: { orderBy: { performedAt: 'desc' } },
      LotBatch: {
        // ✅ FIX: Include ALL lots (including COMPLETED) so they show on detail page
        include: {
          Lot: {
            include: {
              TankAssignment: {
                // ✅ FIX: Include COMPLETED assignments too, so we can show tank info for completed lots
                orderBy: [
                  { status: 'asc' },  // ACTIVE/PLANNED first
                  { createdAt: 'desc' },  // Then newest first
                ],
                take: 1,
                include: {
                  Tank: {
                    select: { id: true, name: true, type: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  })
  
  if (!batch) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Batch not found' } },
      { status: 404 }
    )
  }
  
  // ✅ Build splitTanks from LotBatch data for split batch display
  const lotBatches = batch.LotBatch || []
  const childLotBatches = lotBatches.filter((lb: any) => 
    lb.Lot && lb.Lot.lotCode?.match(/-[A-Z]$/)  // Child lots only (have -A, -B suffix)
  )
  
  const splitTanks = childLotBatches.map((lb: any) => {
    const lot = lb.Lot
    const assignment = lot.TankAssignment?.[0] as any
    // ✅ FIX: Use volumeContribution from LotBatch (actual allocated volume) or fallback to lot.volume
    const lotVolume = lb.volumeContribution || lot.volume || 0
    return {
      lotId: lot.id,
      lotCode: lot.lotCode,
      tankId: assignment?.Equipment?.id || null,
      tankName: assignment?.Equipment?.name || '-',
      phase: lot.phase,
      status: lot.status,
      volume: lotVolume,
      percentage: batch.volume && Number(batch.volume) > 0 ? Math.round((Number(lotVolume) / Number(batch.volume)) * 100) : 0,
    }
  })
  
  // ✅ Resolve current tank name for split batches and non-split batches
  let resolvedTankName = batch.tank?.name || null
  let resolvedTankId = batch.tankId
  
  // ✅ FIX: If batch.tank is not set, try to get tank from LotBatch's TankAssignment
  // Prioritize: 1) ACTIVE assignments 2) Non-COMPLETED lots 3) Matching phase
  if (!resolvedTankName && lotBatches.length > 0) {
    // Sort lots by priority: ACTIVE status first, then matching phase, then non-COMPLETED
    const sortedLotBatches = [...lotBatches].sort((a: any, b: any) => {
      const lotA = a.Lot
      const lotB = b.Lot
      const assignmentA = lotA?.TankAssignment?.[0]
      const assignmentB = lotB?.TankAssignment?.[0]
      
      // Priority 1: ACTIVE tank assignments first
      const aActive = assignmentA?.status === 'ACTIVE' ? 0 : 1
      const bActive = assignmentB?.status === 'ACTIVE' ? 0 : 1
      if (aActive !== bActive) return aActive - bActive
      
      // Priority 2: Non-COMPLETED lots first
      const aCompleted = lotA?.status === 'COMPLETED' ? 1 : 0
      const bCompleted = lotB?.status === 'COMPLETED' ? 1 : 0
      if (aCompleted !== bCompleted) return aCompleted - bCompleted
      
      // Priority 3: Lots matching batch status phase
      const batchPhase = batch.status === 'CONDITIONING' ? 'CONDITIONING' : 
                         batch.status === 'FERMENTING' ? 'FERMENTATION' : null
      if (batchPhase) {
        const aMatchesPhase = lotA?.phase === batchPhase ? 0 : 1
        const bMatchesPhase = lotB?.phase === batchPhase ? 0 : 1
        if (aMatchesPhase !== bMatchesPhase) return aMatchesPhase - bMatchesPhase
      }
      
      return 0
    })
    
    // Find first lot with a tank assignment (after sorting by priority)
    for (const lb of sortedLotBatches) {
      const assignment = lb.Lot?.TankAssignment?.[0] as any
      if (assignment?.Equipment?.name) {
        resolvedTankName = assignment.Equipment.name
        resolvedTankId = assignment.Equipment.id
        console.log(`[BATCH DETAIL API] Resolved tank from lot ${lb.Lot?.lotCode}: ${resolvedTankName} (assignment status: ${assignment.status}, lot status: ${lb.Lot?.status})`)
        break
      }
    }
  }
  
  if (splitTanks.length > 0) {
    // For split batches, show first active tank
    const activeTank = splitTanks.find((t: any) => t.tankName !== '-')
    if (activeTank) {
      resolvedTankName = activeTank.tankName
      resolvedTankId = activeTank.tankId
    }
  }
  
  console.log(`[BATCH DETAIL API] ${batch.batchNumber}: status=${batch.status}, phase=${childLotBatches[0]?.Lot?.phase || 'N/A'}, tank=${resolvedTankName}`)
  console.log(`[BATCH DETAIL API] Split tanks: ${splitTanks.length}`, splitTanks.map((t: any) => t.tankName))
  
  // ✅ Determine currentLot for frontend blend detection
  // Priority: non-COMPLETED lot matching current batch phase
  const batchPhase = batch.status === 'CONDITIONING' ? 'CONDITIONING' : 
                     batch.status === 'FERMENTING' ? 'FERMENTATION' : null
  
  let currentLot = null
  if (lotBatches.length > 0) {
    // First try to find a lot matching the batch's current phase that's not completed
    const matchingLot = lotBatches.find((lb: any) => 
      lb.Lot?.status !== 'COMPLETED' && 
      (batchPhase ? lb.Lot?.phase === batchPhase : true)
    )
    
    // Fallback to any non-completed lot
    const fallbackLot = lotBatches.find((lb: any) => lb.Lot?.status !== 'COMPLETED')
    
    const targetLot = matchingLot?.Lot || fallbackLot?.Lot
    
    if (targetLot) {
      // Count how many batches are in this lot
      const lotBatchCount = await prisma.lotBatch.count({
        where: { lotId: targetLot.id }
      })
      
      currentLot = {
        id: targetLot.id,
        lotCode: targetLot.lotCode,
        phase: targetLot.phase,
        status: targetLot.status,
        batchCount: lotBatchCount,
        isBlendResult: lotBatchCount > 1,
      }
      console.log(`[BATCH DETAIL API] currentLot: ${currentLot.lotCode} (batchCount: ${lotBatchCount}, isBlend: ${currentLot.isBlendResult})`)
    }
  }
  
  return NextResponse.json({ 
    batch: {
      ...batch,
      volume: Number(batch.volume) || 0, // ✅ Convert Decimal to Number for JSON serialization
      packagedVolume: Number((batch as any).packagedVolume) || 0, // ✅ Convert Decimal to Number for JSON serialization
      splitTanks,
      resolvedTankName,
      resolvedTankId,
      currentLot, // ✅ Add currentLot for blend detection
    }
  })
})

// PUT /api/batches/[id] - Update batch (requires batch:write)
export const PUT = withPermission('batch:write', async (
  req: NextRequest,
  ctx: RouteContext
) => {
  try {
    const id = req.url.split('/').pop()!
    const body = await req.json()
    
    const { volume, targetOg, targetFg, notes, brewer } = body
    
    const batch = await prisma.batch.findFirst({
      where: { id, tenantId: ctx.tenantId },
    })
    
    if (!batch) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Batch not found' } },
        { status: 404 }
      )
    }
    
    const updatedBatch = await prisma.batch.update({
      where: { id, tenantId: ctx.tenantId },
      data: {
        ...(volume !== undefined && { volume }),
        ...(targetOg !== undefined && { targetOg }),
        ...(targetFg !== undefined && { targetFg }),
        ...(notes !== undefined && { notes }),
        ...(brewer !== undefined && { brewerName: brewer }),
        updatedAt: new Date(),
      },
    })
    
    return NextResponse.json({ 
      success: true,
      batch: updatedBatch,
    })
  } catch (error: any) {
    console.error('[PUT /api/batches/[id]] Error:', error)
    return NextResponse.json(
      { 
        error: { 
          code: 'UPDATE_FAILED', 
          message: 'Failed to update batch', 
          details: error.message || String(error) 
        } 
      },
      { status: 500 }
    )
  }
})

// DELETE /api/batches/[id] - Delete batch (requires batch:delete)
export const DELETE = withPermission('batch:delete', async (
  req: NextRequest,
  ctx: RouteContext
) => {
  try {
    const id = req.url.split('/').pop()!
    
    console.log('[DELETE_BATCH] Batch ID:', id)
    console.log('[DELETE_BATCH] Tenant ID:', ctx.tenantId)

    const batch = await prisma.batch.findFirst({
      where: { id, tenantId: ctx.tenantId },
    })

    if (!batch) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Batch not found' } },
        { status: 404 }
      )
    }

    try {
      // ✅ FIX: Free all tanks associated with this batch's lots (including COMPLETED assignments)
      const lotBatches = await prisma.lotBatch.findMany({
        where: { batchId: id },
        include: {
          Lot: {
            include: {
              TankAssignment: {
                // ✅ Include ALL assignments (PLANNED, ACTIVE, COMPLETED) to free all tanks
                include: { Equipment: true },
              },
            },
          },
        },
      })
      
      const tankIds = new Set<string>()
      
      // Collect all tank IDs from lot assignments (all statuses)
      for (const lb of lotBatches) {
        for (const assignment of lb.Lot.TankAssignment || []) {
          if (assignment.tankId) {
            tankIds.add(assignment.tankId)
            console.log('[DELETE_BATCH] Found tank from assignment:', assignment.tankId, 'status:', assignment.status)
          }
        }
      }
      
      // Also check batch.tankId
      if (batch.tankId) {
        tankIds.add(batch.tankId)
        console.log('[DELETE_BATCH] Found tank from batch.tankId:', batch.tankId)
      }
      
      // Also check batch.equipmentId (if exists)
      if ((batch as any).equipmentId) {
        tankIds.add((batch as any).equipmentId)
        console.log('[DELETE_BATCH] Found tank from batch.equipmentId:', (batch as any).equipmentId)
      }
      
      // ✅ Free all tanks
      for (const tankId of Array.from(tankIds)) {
        try {
          // Update Equipment table
          await prisma.equipment.update({
            where: { id: tankId },
            data: { 
              currentBatchId: null,
              currentBatchNumber: null,
              status: 'NEEDS_CIP',
              nextCIP: new Date(),
              updatedAt: new Date(),
            },
          })
          console.log('[DELETE_BATCH] ✅ Freed Tank:', tankId)
        } catch (error: any) {
          console.log('[DELETE_BATCH] Equipment update skipped for:', tankId, error?.message)
        }
        
        try {
          // Update Tank table
          await prisma.tank.update({
            where: { id: tankId },
            data: {
              status: 'AVAILABLE',
              currentLotId: null,
              currentBatchId: null,
              currentPhase: null,
              updatedAt: new Date(),
            },
          })
          console.log('[DELETE_BATCH] ✅ Freed Tank:', tankId)
        } catch (error: any) {
          console.log('[DELETE_BATCH] Tank update skipped for:', tankId, error?.message)
        }
      }
      
      console.log('[DELETE_BATCH] ✅ Freed', tankIds.size, 'tanks:', Array.from(tankIds))

      // 2. Delete related records first (foreign key constraints)
      await prisma.batchIngredient.deleteMany({
        where: { batchId: id },
      }).catch(() => console.log('[DELETE_BATCH] BatchIngredient delete skipped'))

      await prisma.batchTimeline.deleteMany({
        where: { batchId: id },
      }).catch(() => console.log('[DELETE_BATCH] BatchTimeline delete skipped'))

      await prisma.gravityReading.deleteMany({
        where: { batchId: id },
      }).catch(() => console.log('[DELETE_BATCH] GravityReading delete skipped'))

      await (prisma as any).inventoryLedger?.deleteMany({
        where: { batchId: id },
      }).catch(() => console.log('[DELETE_BATCH] InventoryLedger delete skipped'))

      // Delete LotBatches and related Lots/TankAssignments
      // ✅ FIX: Use lotBatches from above (already fetched with lot details)
      const lotIds = lotBatches.map(lb => lb.lotId)

      if (lotIds.length > 0) {
        // Delete TankAssignments by lotId
        await prisma.tankAssignment.deleteMany({
          where: { lotId: { in: lotIds } },
        }).catch(() => console.log('[DELETE_BATCH] TankAssignment delete skipped'))
        
        // Delete Lots
        await prisma.lot.deleteMany({
          where: { id: { in: lotIds } },
        }).catch(() => console.log('[DELETE_BATCH] Lot delete skipped'))
      }

      // Delete LotBatches
      await prisma.lotBatch.deleteMany({
        where: { batchId: id },
      }).catch(() => console.log('[DELETE_BATCH] LotBatch delete skipped'))

      await prisma.packagingRun.deleteMany({
        where: { batchId: id },
      }).catch(() => console.log('[DELETE_BATCH] PackagingRun delete skipped'))

      // ✅ FIX: Clear batchId from Kegs (don't delete, just unassign)
      await (prisma as any).keg.updateMany({
        where: { batchId: id },
        data: { 
          batchId: null,
          status: 'FILLED',  // Keep as filled (beer is still in keg)
        },
      }).catch(() => console.log('[DELETE_BATCH] Keg unassign skipped'))
      console.log('[DELETE_BATCH] ✅ Unassigned kegs from batch')

      // 3. Finally delete the batch
      await prisma.batch.delete({
        where: { id, tenantId: ctx.tenantId },
      })

      console.log('[DELETE_BATCH] ✅ Batch deleted:', batch.batchNumber)
      return NextResponse.json({ 
        success: true, 
        message: 'Batch deleted',
        batchNumber: batch.batchNumber,
      })

    } catch (error: any) {
      console.error('[DELETE_BATCH] ❌ Error:', error)
      return NextResponse.json(
        { 
          error: { 
            code: 'DELETE_FAILED', 
            message: 'Failed to delete batch', 
            details: error.message 
          } 
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('[DELETE /api/batches/[id]] Error:', error)
    return NextResponse.json(
      { 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to delete batch', 
          details: error.message || String(error) 
        } 
      },
      { status: 500 }
    )
  }
})