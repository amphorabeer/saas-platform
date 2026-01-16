import { NextRequest, NextResponse } from 'next/server'
import { withTenant, RouteContext } from '@/lib/api-middleware'
import { prisma } from '@saas-platform/database'

// GET /api/cip-logs
export const GET = withTenant(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const cipLogs = await prisma.cIPLog.findMany({
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
      orderBy: { date: 'desc' },
      take: 100,
    })

    // Transform to match expected format (lowercase equipment for API response)
    const transformed = cipLogs.map(log => ({
      ...log,
      equipment: log.Equipment,
      Equipment: undefined,
    }))

    return NextResponse.json({ cipLogs: transformed })
  } catch (error) {
    console.error('[GET /api/cip-logs] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
})

// POST /api/cip-logs
export const POST = withTenant(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const body = await req.json()
    const { equipmentId, cipType, date, duration, temperature, causticConcentration, performedBy, result, notes } = body

    if (!equipmentId || !cipType || !performedBy) {
      return NextResponse.json(
        { error: 'equipmentId, cipType, and performedBy are required' },
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

    const cipLog = await prisma.cIPLog.create({
      data: {
        equipmentId,
        cipType,
        date: date ? new Date(date) : new Date(),
        duration: parseInt(String(duration)) || 60,
        temperature: temperature ? parseFloat(String(temperature)) : null,
        causticConcentration: causticConcentration ? parseFloat(String(causticConcentration)) : null,
        performedBy,
        result: result || 'PASSED',
        notes: notes || null,
      },
      include: {
        Equipment: {
          select: { id: true, name: true, type: true },
        },
      },
    })

    return NextResponse.json({
      ...cipLog,
      equipment: cipLog.Equipment,
    }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/cip-logs] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
})
