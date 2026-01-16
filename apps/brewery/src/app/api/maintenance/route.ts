import { NextRequest, NextResponse } from 'next/server'
import { withTenant, RouteContext } from '@/lib/api-middleware'
import { prisma } from '@saas-platform/database'

// GET /api/maintenance
export const GET = withTenant(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const maintenanceLogs = await prisma.maintenanceLog.findMany({
      where: {
        // ✅ FIX: Use Equipment (capital E) - this is the Prisma relation name
        Equipment: {
          tenantId: ctx.tenantId,
        },
      },
      include: {
        // ✅ FIX: Use Equipment (capital E)
        Equipment: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    // Transform to match expected format (lowercase equipment for API response)
    const transformed = maintenanceLogs.map(log => ({
      ...log,
      equipment: log.Equipment,
      Equipment: undefined,
    }))

    return NextResponse.json({ maintenanceLogs: transformed })
  } catch (error) {
    console.error('[GET /api/maintenance] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
})

// POST /api/maintenance
export const POST = withTenant(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const body = await req.json()
    const { 
      equipmentId, 
      type, 
      status, 
      priority,
      scheduledDate, 
      completedDate,
      duration,
      performedBy, 
      cost,
      partsUsed,
      description 
    } = body

    if (!equipmentId || !type) {
      return NextResponse.json(
        { error: 'equipmentId and type are required' },
        { status: 400 }
      )
    }

    // Verify equipment belongs to tenant
    const equipment = await prisma.equipment.findFirst({
      where: { id: equipmentId, tenantId: ctx.tenantId },
    })

    if (!equipment) {
      return NextResponse.json({ error: 'Equipment not found' }, { status: 404 })
    }

    const maintenanceLog = await prisma.maintenanceLog.create({
      data: {
        equipmentId,
        type,
        status: status || 'SCHEDULED',
        priority: priority || 'MEDIUM',
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        completedDate: completedDate ? new Date(completedDate) : null,
        duration: duration ? parseInt(String(duration)) : null,
        performedBy: performedBy || null,
        cost: cost ? parseFloat(String(cost)) : null,
        partsUsed: partsUsed || [],
        description: description || null,
      },
      include: {
        Equipment: {
          select: { id: true, name: true, type: true },
        },
      },
    })

    return NextResponse.json({
      ...maintenanceLog,
      equipment: maintenanceLog.Equipment,
    }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/maintenance] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
})

// PATCH /api/maintenance/[id]
export const PATCH = withTenant(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const url = new URL(req.url)
    const id = url.pathname.split('/').pop()
    
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const body = await req.json()

    // Verify maintenance log belongs to tenant's equipment
    const existing = await prisma.maintenanceLog.findFirst({
      where: {
        id,
        Equipment: { tenantId: ctx.tenantId },
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Maintenance log not found' }, { status: 404 })
    }

    const updated = await prisma.maintenanceLog.update({
      where: { id },
      data: {
        ...(body.status && { status: body.status }),
        ...(body.completedDate && { completedDate: new Date(body.completedDate) }),
        ...(body.duration && { duration: parseInt(String(body.duration)) }),
        ...(body.performedBy && { performedBy: body.performedBy }),
        ...(body.cost && { cost: parseFloat(String(body.cost)) }),
        ...(body.partsUsed && { partsUsed: body.partsUsed }),
        ...(body.description && { description: body.description }),
      },
      include: {
        Equipment: {
          select: { id: true, name: true, type: true },
        },
      },
    })

    return NextResponse.json({
      ...updated,
      equipment: updated.Equipment,
    })
  } catch (error) {
    console.error('[PATCH /api/maintenance] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
})
