import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@saas-platform/database'
import { withTenant, RouteContext } from '@/lib/api-middleware'

export const POST = withTenant<any>(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const url = new URL(req.url)
    const batchId = url.pathname.split('/').slice(-2, -1)[0]
    
    // ✅ Parse lotId from request body for split batch operations
    const body = await req.json().catch(() => ({}))
    const { lotId } = body
    
    console.log('[COMPLETE_BATCH] Starting for Batch:', batchId, 'lotId:', lotId)
    
    const completedAt = new Date()

    // ═══════════════════════════════════════════════════════════
    // ✅ FIX: For split batches with lotId, only complete THAT lot
    // ═══════════════════════════════════════════════════════════
    
    if (lotId) {
      // Split batch - only complete the specific lot
      console.log('[COMPLETE_BATCH] ✅ Processing specific lotId:', lotId)
      
      // Get the specific lot
      const lot = await prisma.lot.findFirst({
        where: { id: lotId, tenantId: ctx.tenantId },
        include: {
          TankAssignment: {
            where: { status: { in: ['PLANNED', 'ACTIVE'] } }
          }
        }
      })
      
      if (!lot) {
        return NextResponse.json({ error: 'Lot not found' }, { status: 404 })
      }
      
      const lastTankId = lot.TankAssignment[0]?.tankId || null
      console.log('[COMPLETE_BATCH] Last tank ID:', lastTankId)
      
      // Complete lot
      await prisma.lot.update({
        where: { id: lotId },
        data: { 
          status: 'COMPLETED',
          updatedAt: completedAt,
        },
      })
      console.log('[COMPLETE_BATCH] Completing lot:', lotId, lot.lotCode)
      
      // Complete assignments and free tanks for this lot only
      for (const assignment of lot.TankAssignment) {
        await prisma.tankAssignment.update({
          where: { id: assignment.id },
          data: { 
            status: 'COMPLETED',
            actualEnd: completedAt,
          },
        })
        
        // Free the tank (needs CIP)
        await prisma.equipment.update({
          where: { id: assignment.tankId },
          data: {
            status: 'NEEDS_CIP',
            nextCIP: new Date(),
          },
        })
        console.log('[COMPLETE_BATCH] Released tank:', assignment.tankId)
      }
      
      // ✅ Check if ALL child lots for this batch are completed
      const remainingActiveLots = await prisma.lot.count({
        where: {
          LotBatch: { some: { batchId } },
          status: { not: 'COMPLETED' },
          lotCode: { contains: '-' },  // Only count child lots (with -A, -B suffix)
        },
      })
      
      console.log('[COMPLETE_BATCH] Still have', remainingActiveLots, 'active lots')
      
      // Only mark batch as COMPLETED when ALL child lots are done
      if (remainingActiveLots === 0) {
        await prisma.batch.update({
          where: { id: batchId, tenantId: ctx.tenantId },
          data: {
            status: 'COMPLETED',
            completedAt: completedAt,
            tankId: lastTankId,
          },
        })
        console.log('[COMPLETE_BATCH] ✅ All lots completed - batch marked COMPLETED')
        
        // Timeline event
        await prisma.batchTimeline.create({
          data: {
            batchId: batchId,
            type: 'COMPLETED',
            title: 'წარმოება დასრულდა',
            description: body.notes || 'ბაჩი დასრულებულია',
            createdBy: ctx.userId || 'system',
          },
        })
      }
      
      const batch = await prisma.batch.findFirst({
        where: { id: batchId, tenantId: ctx.tenantId }
      })
      
      console.log('[COMPLETE_BATCH] ✅ Success:', batchId)
      
      return NextResponse.json({
        success: true,
        batch,
        lotCompleted: lotId,
        remainingLots: remainingActiveLots,
      })
    }
    
    // ═══════════════════════════════════════════════════════════
    // Regular batch completion (no lotId) - complete everything
    // ═══════════════════════════════════════════════════════════
    
    // Get current tank info BEFORE completing
    const currentAssignment = await prisma.tankAssignment.findFirst({
      where: {
        Lot: {
          LotBatch: {
            some: { batchId: batchId }
          }
        },
        status: { in: ['PLANNED', 'ACTIVE'] },
      },
    })
    
    const lastTankId = currentAssignment?.tankId || null
    const lastTankName = null  // Removed - Tank name not critical for completion
    
    console.log('[COMPLETE_BATCH] Last tank:', lastTankName, '(', lastTankId, ')')

    // 1. Update Batch status with lastTankName for history
    const batch = await prisma.batch.update({
      where: { id: batchId, tenantId: ctx.tenantId },
      data: {
        status: 'COMPLETED',
        completedAt: completedAt,
        tankId: lastTankId,
      },
    })

    // 2. Find and complete all active TankAssignments for this batch
    const activeAssignments = await prisma.tankAssignment.findMany({
      where: {
        Lot: {
          LotBatch: {
            some: { batchId: batchId }
          }
        },
        status: { in: ['PLANNED', 'ACTIVE'] },
      },
    })

    console.log('[COMPLETE_BATCH] Found active assignments:', activeAssignments.length)

    // 3. Complete assignments and free tanks
    for (const assignment of activeAssignments) {
      await prisma.tankAssignment.update({
        where: { id: assignment.id },
        data: { 
          status: 'COMPLETED',
          actualEnd: completedAt,
        },
      })

      await prisma.equipment.update({
        where: { id: assignment.tankId },
        data: {
          status: 'NEEDS_CIP',
          nextCIP: new Date(),
        },
      })

      console.log('[COMPLETE_BATCH] Released tank:', assignment.tankId)
    }

    // 4. Complete all lots for this batch
    await prisma.lot.updateMany({
      where: {
        LotBatch: {
          some: { batchId: batchId }
        },
        status: { not: 'COMPLETED' },
      },
      data: { status: 'COMPLETED' },
    })

    // 5. Timeline event
    await prisma.batchTimeline.create({
      data: {
        batchId: batchId,
        type: 'COMPLETED',
        title: 'წარმოება დასრულდა',
        description: body.notes || 'ბაჩი დასრულებულია',
        data: {
          volume: body.volume,
          abv: body.abv,
          tanksReleased: activeAssignments.length,
        },
        createdBy: ctx.userId || 'system',
      },
    })

    console.log('[COMPLETE_BATCH] ✅ Successfully completed Batch:', {
      batchId,
      batchNumber: batch.batchNumber,
      status: batch.status,
      tanksReleased: activeAssignments.length,
    })

    return NextResponse.json({
      success: true,
      batch,
      tanksReleased: activeAssignments.length,
    })

  } catch (error: any) {
    console.error('[COMPLETE_BATCH] Error:', error.message)
    return NextResponse.json(
      { error: 'Failed to complete batch', details: error.message },
      { status: 500 }
    )
  }
})
