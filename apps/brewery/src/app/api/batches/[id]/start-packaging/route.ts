import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@saas-platform/database'
import { withTenant, RouteContext } from '@/lib/api-middleware'

// POST /api/batches/[id]/start-packaging
export const POST = withTenant(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    const batchIdIndex = pathParts.indexOf('batches') + 1
    let batchId = pathParts[batchIdIndex]

    if (!batchId && (ctx as any).params?.id) {
      batchId = (ctx as any).params.id
    }

    console.log('[START_PACKAGING] URL:', url.pathname)
    console.log('[START_PACKAGING] Extracted batchId:', batchId)
    console.log('[START_PACKAGING] Tenant ID:', ctx.tenantId)

    if (!batchId) {
      return NextResponse.json({ error: 'Batch ID is required' }, { status: 400 })
    }

    const body = await req.json().catch(() => ({}))
    const { packagingType, packagingSize, quantity, notes, lotId } = body

    console.log('[START_PACKAGING] Request body:', { packagingType, packagingSize, quantity, notes, lotId })

    // Find batch to check status
    const batch = await prisma.batch.findFirst({
      where: { id: batchId, tenantId: ctx.tenantId },
      include: { recipe: true, tank: true },
    })

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
    }

    // ✅ FIX: For split batches, check lot phase FIRST (before batch status)
    if (lotId) {
      const lot = await prisma.lot.findFirst({
        where: { id: lotId, tenantId: ctx.tenantId }
      })
      
      if (!lot) {
        return NextResponse.json({ error: 'Lot not found' }, { status: 404 })
      }
      
      // ✅ If this specific lot is already PACKAGING or COMPLETED, return early
      if (['PACKAGING', 'COMPLETED'].includes(lot.phase)) {
        console.log('[START_PACKAGING] Lot already PACKAGING/COMPLETED, returning current batch')
        return NextResponse.json({
          success: true,
          batchId,
          Batch: {
            ...batch,
            recipe: batch.recipe || { id: '', name: '', style: '' },
            tank: batch.tank || { id: '', name: '', type: '' },
          },
          batchNumber: batch.batchNumber,
        })
      }
      
      // Lot must be in CONDITIONING or BRIGHT phase to start packaging
      if (!['CONDITIONING', 'BRIGHT'].includes(lot.phase || '')) {
        return NextResponse.json(
          { error: `Lot must be CONDITIONING or BRIGHT to start packaging. Current: ${lot.phase}` },
          { status: 400 }
        )
      }
      
      console.log('[START_PACKAGING] ✅ Split batch - lot phase check passed:', lot.phase)
    } else {
      // ✅ Non-split Batch: check batch status
      if (batch.status === 'PACKAGING') {
        console.log('[START_PACKAGING] Already PACKAGING, returning current batch')
        return NextResponse.json({
          success: true,
          batchId,
          Batch: {
            ...batch,
            recipe: batch.recipe || { id: '', name: '', style: '' },
            tank: batch.tank || { id: '', name: '', type: '' },
          },
          batchNumber: batch.batchNumber,
        })
      }
      
      // Regular batch - check batch status
      if (!['CONDITIONING', 'READY'].includes(batch.status)) {
        return NextResponse.json(
          { error: `Batch must be CONDITIONING or READY to start packaging. Current: ${batch.status}` },
          { status: 400 }
        )
      }
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
      console.log('[START_PACKAGING] ✅ Detected BLENDED lot with', allBatchIds.length, 'batches:', allBatchIds)
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
    
    console.log('[START_PACKAGING] ✅ Updated', allBatchIds.length, 'batches to PACKAGING')

    // Get updated batch for response
    const updatedBatch = await prisma.batch.findFirst({
      where: { id: batchId, tenantId: ctx.tenantId },
      include: {
        recipe: { select: { id: true, name: true, style: true } },
        tank: { select: { id: true, name: true, type: true } },
      },
    })

    // Create packaging run record if packaging details provided
    if (packagingType && quantity) {
      try {
        const volumeTotal = packagingSize && quantity 
          ? parseFloat(String(packagingSize)) * parseInt(String(quantity))
          : 0

        // Map packagingType to PackageType enum
        const packageTypeMap: Record<string, string> = {
          'keg': packagingSize === 50 ? 'KEG_50' : packagingSize === 30 ? 'KEG_30' : 'KEG_20',
          'bottle': packagingSize === 0.5 ? 'BOTTLE_500' : packagingSize === 0.33 ? 'BOTTLE_330' : 'BOTTLE_750',
          'can': packagingSize === 0.5 ? 'CAN_500' : 'CAN_330',
        }
        const packageType = packageTypeMap[packagingType.toLowerCase()] || 'BOTTLE_500'

        await prisma.packagingRun.create({
          data: {
            batchId: batchId,
            tenantId: ctx.tenantId,
            packageType: packageType as any,
            quantity: parseInt(String(quantity)),
            volumeTotal: volumeTotal,
            performedBy: ctx.userId,
            notes: notes || null,
            performedAt: new Date(),
          },
        })
        console.log('[START_PACKAGING] Created packaging run record:', { packageType, quantity, volumeTotal })
      } catch (error) {
        console.warn('[START_PACKAGING] PackagingRun creation failed:', error)
      }
    }

    // ✅ FIX: For split batches with lotId, only update THAT lot's assignments
    try {
      let assignmentFilter: any = {
        status: { in: ['PLANNED', 'ACTIVE'] },
      }
      
      if (lotId) {
        // Split batch - only update the specific lot's assignment
        assignmentFilter.lotId = lotId
        console.log('[START_PACKAGING] Filtering assignments by lotId:', lotId)
      } else {
        // Regular/blended batch - update all assignments for these batches
        assignmentFilter.Lot = {
          LotBatch: {
            some: { batchId: { in: allBatchIds } }
          }
        }
      }
      
      const activeAssignments = await prisma.tankAssignment.findMany({
        where: assignmentFilter,
      })

      console.log('[START_PACKAGING] Found active assignments:', activeAssignments.length)

      for (const assignment of activeAssignments) {
        await prisma.tankAssignment.update({
          where: { id: assignment.id },
          data: { 
            phase: 'PACKAGING',
            status: 'ACTIVE',
          },
        })
        console.log('[START_PACKAGING] Updated assignment to PACKAGING phase:', assignment.id)
      }

      console.log('[START_PACKAGING] TankAssignment updated successfully')
      
      // ✅ FIX: Update Tank.currentPhase to PACKAGING
      const tankIds = activeAssignments.map(a => a.tankId).filter(Boolean)
      if (tankIds.length > 0) {
        await prisma.tank.updateMany({
          where: { id: { in: tankIds } },
          data: { currentPhase: 'PACKAGING' }
        })
        console.log('[START_PACKAGING] ✅ Updated Tank.currentPhase to PACKAGING for', tankIds.length, 'tanks')
      }
    } catch (error: any) {
      console.log('[START_PACKAGING] TankAssignment update skipped:', error?.message || 'Table may not exist')
    }

    // ✅ FIX: For split batches with lotId, only update THAT lot's phase
    if (lotId) {
      // Split batch - only update the specific lot
      await prisma.lot.update({
        where: { id: lotId },
        data: { 
          phase: 'PACKAGING',
          status: 'ACTIVE'
        }
      })
      console.log('[START_PACKAGING] Updated specific lot phase to PACKAGING:', lotId)
    } else if (currentLotBatch?.Lot) {
      // Regular batch - update the found lot
      await prisma.lot.update({
        where: { id: currentLotBatch.Lot.id },
        data: { 
          phase: 'PACKAGING',
          status: 'ACTIVE'
        }
      })
      console.log('[START_PACKAGING] Updated lot phase to PACKAGING:', currentLotBatch.Lot.id)
    }

    // Create timeline events for ALL blended batches
    try {
      for (const bid of allBatchIds) {
        await prisma.batchTimeline.create({
          data: {
            batchId: bid,
            type: 'PACKAGING_STARTED',
            title: 'შეფუთვა დაიწყო',
            description: notes || `Packaging type: ${packagingType || 'N/A'}`,
            createdBy: ctx.userId,
          },
        })
      }
    } catch (error) {
      console.warn('[START_PACKAGING] Timeline event creation failed:', error)
    }

    console.log('[START_PACKAGING] ✅ Successfully started packaging:', {
      batchId,
      batchNumber: updatedBatch?.batchNumber,
      status: updatedBatch?.status,
      totalBatchesUpdated: allBatchIds.length,
    })

    return NextResponse.json({
      success: true,
      batchId,
      Batch: updatedBatch,
      batchNumber: updatedBatch?.batchNumber,
      blendedBatchesUpdated: allBatchIds.length,
    })
  } catch (error: any) {
    console.error('[POST /api/batches/[id]/start-packaging] Error:', error)

    return NextResponse.json(
      { error: 'Failed to start packaging', details: error.message || String(error) },
      { status: 500 }
    )
  }
})