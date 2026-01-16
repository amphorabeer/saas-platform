import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@saas-platform/database'
import { withTenant, RouteContext } from '@/lib/api-middleware'

// ═══════════════════════════════════════════════════════════
// GET /api/lots/[id]
// ═══════════════════════════════════════════════════════════

export const GET = withTenant(async (
  req: NextRequest,
  ctx: RouteContext
) => {
  try {
    // Extract lotId from URL path
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    const lotIdIndex = pathParts.indexOf('lots') + 1
    const lotId = pathParts[lotIdIndex]

    if (!lotId) {
      return NextResponse.json(
        { error: 'ლოტის ID სავალდებულოა', code: 'MISSING_ID' },
        { status: 400 }
      )
    }

    const lot = await prisma.lot.findFirst({
      where: {
        OR: [
          { id: lotId },
        ],
        tenantId: ctx.tenantId,
      },
      include: {
        LotBatch: {
          include: {
            Batch: {
              select: {
                id: true,
                batchNumber: true,
                status: true,
                volume: true,
                originalGravity: true,
                currentGravity: true,
                brewedAt: true,
                recipe: {
                  select: {
                    id: true,
                    name: true,
                    style: true,
                  },
                },
              },
            },
          },
        },
        TankAssignment: {
          include: {
            Tank: {
              select: {
                id: true,
                name: true,
                type: true,
                capacity: true,
              },
            },
          } as any,
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!lot) {
      return NextResponse.json(
        { error: 'ლოტი ვერ მოიძებნა', code: 'LOT_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Get active tank assignment
    const activeAssignment = (lot.TankAssignment?.find(ta => ta.status !== 'COMPLETED') || lot.TankAssignment?.[0]) as any

    // Calculate total volume
    const totalVolume = lot.LotBatch.reduce(
      (sum, lb) => sum + parseFloat((lb.volumeContribution || 0).toString()),
      0
    )

    // ✅ Get packaging runs for this lot (filtered by lotCode/lotNumber)
    const lotCode = (lot as any).lotCode || lot.id
    const lotPackagingRuns = await prisma.packagingRun.findMany({
      where: {
        lotNumber: lotCode,
        tenantId: ctx.tenantId
      },
      orderBy: { performedAt: 'desc' },
      select: {
        id: true,
        packageType: true,
        quantity: true,
        volumeTotal: true,
        lotNumber: true,
        performedBy: true,
        performedAt: true,
        notes: true,
      }
    })

    // Transform for frontend
    const transformed = {
      id: lot.id,
      lotNumber: (lot as any).lotCode || lot.id,
      phase: lot.phase || activeAssignment?.phase || 'UNKNOWN',
      status: lot.status,
      notes: lot.notes,
      plannedVolume: lot.plannedVolume ? Number(lot.plannedVolume) : null,
      actualVolume: lot.actualVolume ? Number(lot.actualVolume) : null,
      totalVolume,
      createdAt: lot.createdAt,
      updatedAt: lot.updatedAt,

      // Batches info
      batches: lot.LotBatch.map(lb => ({
        id: lb.Batch?.id || lb.batchId,
        batchNumber: lb.Batch?.batchNumber || '',
        recipeName: lb.Batch?.recipe?.name || null,
        recipeStyle: lb.Batch?.recipe?.style || null,
        volume: lb.Batch?.volume ? Number(lb.Batch.volume) : null,
        volumeContribution: lb.volumeContribution ? Number(lb.volumeContribution) : null,
        batchPercentage: lb.batchPercentage ? Number(lb.batchPercentage) : null,
        status: lb.Batch?.status || 'ACTIVE',
        originalGravity: lb.Batch?.originalGravity ? Number(lb.Batch.originalGravity) : null,
        currentGravity: lb.Batch?.currentGravity ? Number(lb.Batch.currentGravity) : null,
        brewedAt: lb.Batch?.brewedAt?.toISOString() || null,
      })),
      batchCount: lot.LotBatch.length,
      isBlend: lot.LotBatch.length > 1,

      // Tank info
      tank: activeAssignment?.Tank ? {
        id: activeAssignment.Tank.id,
        name: activeAssignment.Tank.name,
        type: activeAssignment.Tank.type,
        capacity: activeAssignment.Tank.capacity ? Number(activeAssignment.Tank.capacity) : null,
      } : null,

      tankAssignment: activeAssignment ? {
        id: activeAssignment.id,
        phase: activeAssignment.phase,
        status: activeAssignment.status,
        startTime: (activeAssignment as any).startTime?.toISOString() || null,
        actualEnd: (activeAssignment as any).endTime?.toISOString() || null,
        plannedVolume: activeAssignment.plannedVolume ? Number(activeAssignment.plannedVolume) : null,
        actualVolume: activeAssignment.actualVolume ? Number(activeAssignment.actualVolume) : null,
      } : null,

      // ✅ Packaging runs for this lot
      packagingRuns: lotPackagingRuns.map(run => ({
        id: run.id,
        batchNumber: lot.LotBatch[0]?.Batch?.batchNumber || '',
        packageType: run.packageType,
        quantity: run.quantity,
        volumeTotal: Number(run.volumeTotal),
        lotNumber: run.lotNumber,
        performedBy: run.performedBy,
        performedAt: run.performedAt?.toISOString() || null,
        notes: run.notes,
      })),
    }

    return NextResponse.json(transformed)

  } catch (error: any) {
    console.error('[LOTS API] Error:', error.message)
    return NextResponse.json(
      { error: 'შეცდომა', details: error.message },
      { status: 500 }
    )
  }
})

// ═══════════════════════════════════════════════════════════
// PATCH /api/lots/[id] - Update lot phase
// ═══════════════════════════════════════════════════════════

export const PATCH = withTenant(async (
  req: NextRequest,
  ctx: RouteContext
) => {
  try {
    // Extract lotId from URL path
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    const lotIdIndex = pathParts.indexOf('lots') + 1
    const lotId = pathParts[lotIdIndex]
    
    const body = await req.json()

    if (!lotId) {
      return NextResponse.json(
        { error: 'ლოტის ID სავალდებულოა', code: 'MISSING_ID' },
        { status: 400 }
      )
    }

    // Find lot
    const lot = await prisma.lot.findFirst({
      where: {
        OR: [
          { id: lotId },
        ],
        tenantId: ctx.tenantId,
      },
      include: {
        TankAssignment: {
          where: { status: { in: ['PLANNED', 'ACTIVE'] } },
        },
      },
    })

    if (!lot) {
      return NextResponse.json(
        { error: 'ლოტი ვერ მოიძებნა', code: 'LOT_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Update lot phase
    if (body.phase) {
      const validPhases = ['FERMENTATION', 'CONDITIONING', 'BRIGHT', 'PACKAGING']
      if (!validPhases.includes(body.phase)) {
        return NextResponse.json(
          { error: 'არასწორი ფაზა', code: 'INVALID_PHASE' },
          { status: 400 }
        )
      }

      // Update lot
      await prisma.lot.update({
        where: { id: lot.id },
        data: {
          phase: body.phase,
          updatedAt: new Date(),
        },
      })

      // Update active tank assignments
      if (lot.TankAssignment && lot.TankAssignment.length > 0) {
        await prisma.tankAssignment.updateMany({
          where: {
            lotId: lot.id,
            status: { in: ['PLANNED', 'ACTIVE'] },
          },
          data: {
            phase: body.phase,
            updatedAt: new Date(),
          },
        })
      }
    }

    // Fetch updated lot
    const updatedLot = await prisma.lot.findUnique({
      where: { id: lot.id },
      include: {
        LotBatch: {
          include: {
            Batch: {
              select: {
                id: true,
                batchNumber: true,
                status: true,
                volume: true,
                originalGravity: true,
                currentGravity: true,
                brewedAt: true,
                recipe: {
                  select: {
                    id: true,
                    name: true,
                    style: true,
                  },
                },
              },
            },
          },
        },
        TankAssignment: {
          include: {
            Tank: {
              select: {
                id: true,
                name: true,
                type: true,
                capacity: true,
              },
            },
          } as any,
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!updatedLot) {
      return NextResponse.json(
        { error: 'ლოტი ვერ მოიძებნა', code: 'LOT_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Transform response (same as GET)
    const activeAssignment = (updatedLot.TankAssignment?.find(ta => ta.status !== 'COMPLETED') || updatedLot.TankAssignment?.[0]) as any
    const totalVolume = updatedLot.LotBatch.reduce(
      (sum, lb) => sum + parseFloat((lb.volumeContribution || 0).toString()),
      0
    )

    const transformed = {
      id: updatedLot.id,
      lotNumber: (updatedLot as any).lotCode || updatedLot.id,
      phase: updatedLot.phase || activeAssignment?.phase || 'UNKNOWN',
      status: updatedLot.status,
      notes: updatedLot.notes,
      plannedVolume: updatedLot.plannedVolume ? Number(updatedLot.plannedVolume) : null,
      actualVolume: updatedLot.actualVolume ? Number(updatedLot.actualVolume) : null,
      totalVolume,
      createdAt: updatedLot.createdAt,
      updatedAt: updatedLot.updatedAt,
      batches: updatedLot.LotBatch.map(lb => ({
        id: lb.Batch?.id || lb.batchId,
        batchNumber: lb.Batch?.batchNumber || '',
        recipeName: lb.Batch?.recipe?.name || null,
        recipeStyle: lb.Batch?.recipe?.style || null,
        volume: lb.Batch?.volume ? Number(lb.Batch.volume) : null,
        volumeContribution: lb.volumeContribution ? Number(lb.volumeContribution) : null,
        batchPercentage: lb.batchPercentage ? Number(lb.batchPercentage) : null,
        status: lb.Batch?.status || 'ACTIVE',
        originalGravity: lb.Batch?.originalGravity ? Number(lb.Batch.originalGravity) : null,
        currentGravity: lb.Batch?.currentGravity ? Number(lb.Batch.currentGravity) : null,
        brewedAt: lb.Batch?.brewedAt?.toISOString() || null,
      })),
      batchCount: updatedLot.LotBatch.length,
      isBlend: updatedLot.LotBatch.length > 1,
      tank: activeAssignment?.Tank ? {
        id: activeAssignment.Tank.id,
        name: activeAssignment.Tank.name,
        type: activeAssignment.Tank.type,
        capacity: activeAssignment.Tank.capacity ? Number(activeAssignment.Tank.capacity) : null,
      } : null,
      tankAssignment: activeAssignment ? {
        id: activeAssignment.id,
        phase: activeAssignment.phase,
        status: activeAssignment.status,
        startTime: (activeAssignment as any).startTime?.toISOString() || null,
        actualEnd: (activeAssignment as any).endTime?.toISOString() || null,
        plannedVolume: activeAssignment.plannedVolume ? Number(activeAssignment.plannedVolume) : null,
        actualVolume: activeAssignment.actualVolume ? Number(activeAssignment.actualVolume) : null,
      } : null,
    }

    return NextResponse.json(transformed)

  } catch (error: any) {
    console.error('[LOTS API PATCH] Error:', error.message)
    return NextResponse.json(
      { error: 'შეცდომა', details: error.message },
      { status: 500 }
    )
  }
})

