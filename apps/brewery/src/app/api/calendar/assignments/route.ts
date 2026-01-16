import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@saas-platform/database'
import { withTenant, RouteContext } from '@/lib/api-middleware'

// ═══════════════════════════════════════════════════════════
// GET /api/calendar/assignments?start=xxx&end=xxx&tankId=xxx
// Returns TankAssignment blocks for calendar rendering
// ═══════════════════════════════════════════════════════════

export const GET = withTenant(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const url = new URL(req.url)
    const start = url.searchParams.get('start')
    const end = url.searchParams.get('end')
    const tankId = url.searchParams.get('tankId')

    if (!start || !end) {
      return NextResponse.json(
        { error: 'start და end პარამეტრები სავალდებულოა' },
        { status: 400 }
      )
    }

    const startDate = new Date(start)
    const endDate = new Date(end)

    const whereClause: any = {
      tenantId: ctx.tenantId,
      OR: [
        // Assignment starts within range
        { plannedStart: { gte: startDate, lte: endDate } },
        // Assignment ends within range
        { plannedEnd: { gte: startDate, lte: endDate } },
        // Assignment spans entire range
        {
          AND: [
            { plannedStart: { lte: startDate } },
            { plannedEnd: { gte: endDate } },
          ],
        },
      ],
    }

    if (tankId) {
      whereClause.tankId = tankId
    }

    const assignments = await prisma.tankAssignment.findMany({
      where: whereClause,
      include: {
        Tank: {
          select: { id: true, name: true, type: true, capacity: true },
        },
        Lot: {
          include: {
            LotBatch: {
              include: {
                Batch: {
                  select: {
                    id: true,
                    batchNumber: true,
                    recipe: {
                      select: { id: true, name: true, style: true },
                    },
                  },
                },
              },
            },
            Lot: {
              select: { id: true },
            },
            other_Lot: {
              select: { id: true },
            },
          },
        },
      } as any,
      orderBy: { createdAt: 'asc' },
    })

    // Transform to calendar blocks
    const blocks = assignments.map((assignment: any) => {
      const lot = assignment.Lot
      const batches = lot.LotBatch.map((lb: any) => lb.Batch)
      const batchCount = batches.length
      
      // Generate badges
      const badges: string[] = []
      
      // Phase badge
      badges.push(assignment.phase)
      
      // Batch count
      if (batchCount > 1) {
        badges.push(`×${batchCount}`)
      }
      
      // Split indicator
      if (lot.Lot) {
        badges.push('Split')
      }
      
      // Blend indicator
      if (batchCount > 1) {
        badges.push('Blend')
      }
      
      // Status
      if (assignment.status === 'PLANNED') {
        badges.push('დაგეგმილი')
      }
      
      // Overdue check - endTime might not exist on TankAssignment
      // if (assignment.status === 'ACTIVE' && assignment.endTime && new Date() > assignment.endTime) {
      //   badges.push('⚠️ დაგვიანებული')
      // }

      // Color by phase
      const phaseColors: Record<string, string> = {
        FERMENTATION: '#f59e0b',
        CONDITIONING: '#3b82f6',
        BRIGHT: '#10b981',
        PACKAGING: '#8b5cf6',
      }

      return {
        id: assignment.id,
        
        // Tank info
        tankId: assignment.tankId,
        tankName: (assignment as any).Tank.name,
        tankType: (assignment as any).Tank.type,
        tankCapacity: (assignment as any).Tank.capacity,
        
        // Time - plannedStart and plannedEnd
        startTime: (assignment as any).plannedStart,
        endTime: (assignment as any).plannedEnd,
        
        // Lot info
        lotId: lot.id,
        lotNumber: lot.id, // Using id since lotNumber is not available in select
        phase: assignment.phase,
        status: assignment.status,
        
        // Volume
        plannedVolume: assignment.plannedVolume,
        actualVolume: assignment.actualVolume,
        
        // Batch info
        batches: batches.map((b: any) => ({
          id: b.id,
          batchNumber: b.batchNumber,
          recipeName: b.recipe?.name,
          recipeStyle: b.recipe?.style,
        })),
        batchCount,
        primaryBatchNumber: batches[0]?.batchNumber || lot.id,
        primaryRecipeName: batches[0]?.recipe?.name || 'N/A',
        
        // Hierarchy
        isSplit: lot.other_Lot.length > 0,
        isChild: !!lot.Lot,
        parentLotNumber: lot.Lot?.id,
        
        // Display
        badges,
        color: phaseColors[assignment.phase] || '#6b7280',
        
        // Computed
        durationHours: (assignment as any).plannedEnd && (assignment as any).plannedStart
          ? Math.round(
              ((assignment as any).plannedEnd.getTime() - (assignment as any).plannedStart.getTime()) / (1000 * 60 * 60)
            )
          : 0,
        utilizationPercent: (assignment as any).Tank.capacity 
          ? Math.round((parseFloat(assignment.plannedVolume.toString()) / parseFloat((assignment as any).Tank.capacity.toString())) * 100)
          : 0,
      }
    })

    console.log('[CALENDAR/ASSIGNMENTS] Found', blocks.length, 'blocks')

    return NextResponse.json({
      blocks,
      count: blocks.length,
    })

  } catch (error: any) {
    console.error('[CALENDAR/ASSIGNMENTS] Error:', error.message)
    return NextResponse.json(
      { error: 'შეცდომა', details: error.message },
      { status: 500 }
    )
  }
})


