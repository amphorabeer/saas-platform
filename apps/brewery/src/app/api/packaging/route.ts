import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@saas-platform/database'
import { withTenant, RouteContext } from '@/lib/api-middleware'

// Package sizes in liters
const PACKAGE_SIZES: Record<string, number> = {
  KEG_50: 50,
  KEG_30: 30,
  KEG_20: 20,
  BOTTLE_750: 0.75,
  BOTTLE_500: 0.5,
  BOTTLE_330: 0.33,
  CAN_500: 0.5,
  CAN_330: 0.33,
}

function getPackageTypeName(type: string): string {
  const names: Record<string, string> = {
    KEG_50: 'კეგი 50L',
    KEG_30: 'კეგი 30L',
    KEG_20: 'კეგი 20L',
    BOTTLE_750: 'ბოთლი 750ml',
    BOTTLE_500: 'ბოთლი 500ml',
    BOTTLE_330: 'ბოთლი 330ml',
    CAN_500: 'ქილა 500ml',
    CAN_330: 'ქილა 330ml',
  }
  return names[type] || type
}

// GET /api/packaging - List all packaging runs
export const GET = withTenant(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const { searchParams } = new URL(req.url)
    const batchId = searchParams.get('batchId')
    const limit = parseInt(searchParams.get('limit') || '100')

    const where: any = { tenantId: ctx.tenantId }
    if (batchId) {
      where.batchId = batchId
    }

    const packagingRuns = await prisma.packagingRun.findMany({
      where,
      include: {
        batch: {
          select: {
            id: true,
            batchNumber: true,
            recipe: { select: { name: true } },
          },
        },
      },
      orderBy: { performedAt: 'desc' },
      take: limit,
    })

    const runs = packagingRuns.map((run) => ({
      id: run.id,
      batchId: run.batchId,
      batchNumber: run.batch.batchNumber,
      recipeName: run.batch.recipe?.name,
      packageType: run.packageType,
      packageTypeName: getPackageTypeName(run.packageType),
      quantity: run.quantity,
      volumeTotal: Number(run.volumeTotal),
      lotNumber: run.lotNumber,
      performedBy: run.performedBy,
      performedAt: run.performedAt,
      notes: run.notes,
    }))

    return NextResponse.json({ runs })
  } catch (error) {
    console.error('[PACKAGING API] GET Error:', error)
    return NextResponse.json({ error: 'Failed to fetch packaging runs' }, { status: 500 })
  }
})

// POST /api/packaging - Create new packaging run
export const POST = withTenant(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const body = await req.json()
    const { batchId, batchIds, packageType, quantity, performedBy, notes, lotNumber, lotId } = body

    // ✅ Support both single batchId and array of batchIds (for blend lots)
    const allBatchIds = batchIds && batchIds.length > 0 ? batchIds : [batchId]
    const primaryBatchId = allBatchIds[0]

    if (!primaryBatchId || !packageType || !quantity) {
      return NextResponse.json(
        { error: 'batchId, packageType და quantity სავალდებულოა' },
        { status: 400 }
      )
    }

    const packageSize = PACKAGE_SIZES[packageType]
    if (!packageSize) {
      return NextResponse.json({ error: `არასწორი packageType: ${packageType}` }, { status: 400 })
    }

    // ✅ Fetch lot if lotId is provided (for split lot packaging)
    let lot: any = null
    let lotCode: string | null = null
    if (lotId) {
      lot = await prisma.lot.findUnique({
        where: { id: lotId, tenantId: ctx.tenantId },
        select: { id: true, lotCode: true, plannedVolume: true, actualVolume: true }
      })
      if (lot) {
        lotCode = lot.lotCode || lot.id
      }
    }

    // ✅ Fetch ALL batches (for blend lots)
    const batches = await prisma.batch.findMany({
      where: { 
        id: { in: allBatchIds }, 
        tenantId: ctx.tenantId 
      },
      include: { recipe: { select: { name: true } } },
    })

    if (batches.length === 0) {
      return NextResponse.json({ error: 'ბაჩი ვერ მოიძებნა' }, { status: 404 })
    }

    // ✅ Check all batches have valid status
    const invalidBatch = batches.find(b => !['READY', 'PACKAGING'].includes(b.status))
    if (invalidBatch) {
      return NextResponse.json(
        { error: `ბაჩი ${invalidBatch.batchNumber} უნდა იყოს READY ან PACKAGING. ახლანდელი: ${invalidBatch.status}` },
        { status: 400 }
      )
    }

    // ✅ Calculate TOTAL volume - use lot volume for split lots, batch volume otherwise
    let totalBatchVolume: number
    if (lotId && lot) {
      // For split lot packaging, use the lot's volume (e.g., 50L for split lot)
      totalBatchVolume = Number(lot.actualVolume || lot.plannedVolume || 0)
      console.log('[PACKAGING] Using lot volume for split lot:', lotCode, totalBatchVolume, 'L')
    } else {
      // For regular batches or blends, use batch volumes
      totalBatchVolume = batches.reduce((sum, b) => sum + Number(b.volume || 0), 0)
    }

    // ✅ Get existing packaging runs - filter by lotNumber for split lots
    let existingRuns: any[]
    if (lotId && lotCode) {
      // For split lots, only count packaging runs for THIS lot
      existingRuns = await prisma.packagingRun.findMany({
        where: { 
          lotNumber: lotCode,
          tenantId: ctx.tenantId 
        },
      })
      console.log('[PACKAGING] Found', existingRuns.length, 'packaging runs for lot:', lotCode)
    } else {
      // For regular batches/blends, count runs from all batches
      existingRuns = await prisma.packagingRun.findMany({
        where: { 
          batchId: { in: allBatchIds }, 
          tenantId: ctx.tenantId 
        },
      })
    }
    const usedVolume = existingRuns.reduce((sum, r) => sum + Number(r.volumeTotal), 0)
    const availableVolume = totalBatchVolume - usedVolume

    // Calculate requested volume
    const volumeTotal = quantity * packageSize

    console.log('[PACKAGING] Blend lot check:', {
      batchIds: allBatchIds,
      totalBatchVolume,
      usedVolume,
      availableVolume,
      requestedVolume: volumeTotal
    })

    if (volumeTotal > availableVolume) {
      return NextResponse.json({
        error: `არასაკმარისი მოცულობა. ხელმისაწვდომი: ${availableVolume.toFixed(1)}L`,
        availableVolume,
        requestedVolume: volumeTotal,
      }, { status: 400 })
    }

    const primaryBatch = batches.find(b => b.id === primaryBatchId) || batches[0]

    // ✅ Determine lotNumber - use provided lotCode for split lots, or generate one
    const finalLotNumber = lotNumber || (lotCode || `${primaryBatch.batchNumber}-${packageType}-${Date.now()}`)

    // Create packaging run (on primary batch)
    const packagingRun = await prisma.packagingRun.create({
      data: {
        tenantId: ctx.tenantId,
        batchId: primaryBatchId,
        packageType: packageType as any,
        quantity,
        volumeTotal,
        lotNumber: finalLotNumber,
        performedBy: performedBy || ctx.userId,
        notes: allBatchIds.length > 1 ? `${notes || ''} [Blend: ${allBatchIds.length} batches]`.trim() : notes,
      },
    })

    // Update batch statuses to PACKAGING
    await prisma.batch.updateMany({
      where: { 
        id: { in: allBatchIds },
        status: 'READY'
      },
      data: { status: 'PACKAGING' },
    })

    // ✅ Update packagedVolume on PRIMARY batch
    // For blend lots, we track packaging on the primary batch
    const allRunsForPrimary = await prisma.packagingRun.findMany({
      where: { batchId: primaryBatchId, tenantId: ctx.tenantId },
      select: { volumeTotal: true },
    })
    const totalPackagedVolume = allRunsForPrimary.reduce((sum, r) => sum + Number(r.volumeTotal), 0)
    
    await prisma.batch.update({
      where: { id: primaryBatchId },
      data: {
        packagedVolume: totalPackagedVolume,
        updatedAt: new Date()
      } as any
    })

    console.log('[PACKAGING] ✅ Updated batch packagedVolume to', totalPackagedVolume, 'L (from', allRunsForPrimary.length, 'runs)')

    // Add timeline to primary batch
    await prisma.batchTimeline.create({
      data: {
        batchId: primaryBatchId,
        type: 'PACKAGING_COMPLETE',
        title: 'შეფუთვა დასრულდა',
        description: `${getPackageTypeName(packageType)}: ${quantity} ცალი (${volumeTotal}L)${allBatchIds.length > 1 ? ` [Blend: ${allBatchIds.length} batches]` : ''}`,
        createdBy: ctx.userId || 'system',
      },
    })

    // ✅ Auto-complete lot if fully packaged
    if (lotId && lot) {
      const lotVolume = Number(lot.actualVolume || lot.plannedVolume || 0)
      
      // Get all packaging for this specific lot (use finalLotNumber which was used to create the run)
      const allLotPackaging = await prisma.packagingRun.findMany({
        where: { 
          lotNumber: finalLotNumber,
          tenantId: ctx.tenantId 
        },
        select: { volumeTotal: true }
      })
      
      const totalPackaged = allLotPackaging.reduce((sum, r) => sum + Number(r.volumeTotal), 0)
      
      console.log('[PACKAGING] Lot completion check:', { lotCode: finalLotNumber, lotVolume, totalPackaged })
      
      // If lot is fully packaged (within 1L tolerance), mark as COMPLETED
      if (totalPackaged >= lotVolume - 1) {
        console.log('[PACKAGING] ✅ Lot fully packaged, marking as COMPLETED:', finalLotNumber)
        
        // Update Lot status (only status, keep phase as PACKAGING - COMPLETED is not a valid phase enum)
        await prisma.lot.update({
          where: { id: lotId },
          data: { 
            status: 'COMPLETED'
            // Don't change phase - it stays as PACKAGING which is valid
          }
        })
        
        // Update TankAssignment (keep phase as PACKAGING - COMPLETED is not a valid phase enum)
        await prisma.tankAssignment.updateMany({
          where: { lotId, status: 'ACTIVE' },
          data: { 
            status: 'COMPLETED',
            phase: 'PACKAGING',  // ✅ Keep valid phase
            actualEnd: new Date()
          }
        })
        
        // Free up the tank
        const assignment = await prisma.tankAssignment.findFirst({
          where: { lotId },
          select: { tankId: true }
        })
        
        if (assignment?.tankId) {
          await prisma.tank.update({
            where: { id: assignment.tankId },
            data: { 
              status: 'AVAILABLE',
              currentLotId: null,
              currentPhase: null,
              // ✅ FIX: Tank model doesn't have currentVolume field
            }
          }).catch(() => {
            console.log('[PACKAGING] Tank table update skipped (table might not exist)')
          })
          
          // Also update Equipment table
          await prisma.equipment.update({
            where: { id: assignment.tankId },
            data: { 
              status: 'NEEDS_CIP',
              currentBatchId: null,
              currentBatchNumber: null,
              nextCIP: new Date()
            }
          }).catch(() => {
            console.log('[PACKAGING] Equipment table update skipped')
          })
        }
        
        // Add timeline entry
        await prisma.batchTimeline.create({
          data: {
            batchId: primaryBatchId,
            type: 'PACKAGING_COMPLETE',  // ✅ FIX: Use valid TimelineEventType (not LOT_COMPLETED)
            title: 'ლოტი დასრულდა',
            description: `${finalLotNumber} - სრულად დაფასოებულია (${totalPackaged}L)`,
            createdBy: ctx.userId || 'system',
          },
        })
        
        // ✅ FIX: Check if ALL lots for this batch are completed, then complete the batch
        // Get all lots linked to this batch
        const batchLots = await prisma.lotBatch.findMany({
          where: { batchId: primaryBatchId },
          include: { Lot: { select: { id: true, status: true, parentLotId: true } } }
        })
        
        // Filter to only child lots (those with parentLotId or those that are not parents)
        const childLots = batchLots.filter(lb => {
          if (!lb.Lot) return false
          // If lot has parentLotId, it's a child
          if (lb.Lot.parentLotId) return true
          // If lot doesn't have any children, it's also relevant (single lot case)
          const hasChildren = batchLots.some(other => other.Lot?.parentLotId === lb.Lot?.id)
          return !hasChildren
        })
        
        const allLotsCompleted = childLots.length > 0 && 
          childLots.every(lb => lb.Lot?.status === 'COMPLETED')
        
        console.log('[PACKAGING] Batch completion check:', {
          batchId: primaryBatchId,
          totalLots: batchLots.length,
          childLots: childLots.length,
          allCompleted: allLotsCompleted,
          lotStatuses: childLots.map(lb => ({ id: lb.Lot?.id, status: lb.Lot?.status }))
        })
        
        if (allLotsCompleted) {
          console.log('[PACKAGING] ✅ All lots completed, marking batch as COMPLETED:', primaryBatchId)
          
          await prisma.batch.update({
            where: { id: primaryBatchId },
            data: { 
              status: 'COMPLETED',
              completedAt: new Date()
            }
          })
          
          // Add batch completion timeline
          await prisma.batchTimeline.create({
            data: {
              batchId: primaryBatchId,
              type: 'PACKAGING_COMPLETE',  // ✅ Fixed: Use valid TimelineEventType
              title: 'პარტია დასრულდა',
              description: `ყველა ლოტი დაფასოებულია`,
              createdBy: ctx.userId || 'system',
            },
          })
        }
      }
    }

    // Calculate remaining volume
    const newUsedVolume = usedVolume + volumeTotal
    const remainingVolume = totalBatchVolume - newUsedVolume

    return NextResponse.json({
      success: true,
      packagingRun: {
        id: packagingRun.id,
        packageType,
        quantity,
        volumeTotal,
        lotNumber: packagingRun.lotNumber,
      },
      volumeInfo: { 
        totalVolume: totalBatchVolume, 
        usedVolume: newUsedVolume, 
        remainingVolume,
        batchCount: allBatchIds.length 
      },
    })
  } catch (error) {
    console.error('[PACKAGING API] POST Error:', error)
    return NextResponse.json({ error: 'Failed to create packaging run' }, { status: 500 })
  }
})