import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@saas-platform/database'
import { withTenant, RouteContext } from '@/lib/api-middleware'

// ═══════════════════════════════════════════════════════════
// GET /api/tanks
// ═══════════════════════════════════════════════════════════

export const GET = withTenant(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const url = new URL(req.url)
    const type = url.searchParams.get('type')

    console.log('[GET /api/tanks] Tenant:', ctx.tenantId, 'Type filter:', type)

    const whereClause: any = { tenantId: ctx.tenantId }
    
    if (type) {
      whereClause.type = type.toUpperCase()
    }

    const tanks = await prisma.tank.findMany({
      where: whereClause,
      orderBy: { name: 'asc' },
    })

    console.log('[GET /api/tanks] Found:', tanks.length, 'tanks')

    return NextResponse.json(tanks)

  } catch (error: any) {
    console.error('[GET /api/tanks] Error:', error.message)
    return NextResponse.json(
      { error: 'Failed to fetch tanks', details: error.message },
      { status: 500 }
    )
  }
})

// ═══════════════════════════════════════════════════════════
// POST /api/tanks
// ═══════════════════════════════════════════════════════════

export const POST = withTenant(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const body = await req.json()

    const tank = await prisma.tank.create({
      data: {
        tenantId: ctx.tenantId,
        name: body.name,
        type: body.type?.toUpperCase() || 'FERMENTER',
        capacity: body.capacity ? parseFloat(body.capacity) : 0,
        status: body.status || 'AVAILABLE',
        location: body.location || null,
      },
    })

    console.log('[POST /api/tanks] Created:', tank.name)

    return NextResponse.json(tank, { status: 201 })

  } catch (error: any) {
    console.error('[POST /api/tanks] Error:', error.message)
    return NextResponse.json(
      { error: 'Failed to create tank', details: error.message },
      { status: 500 }
    )
  }
})

