import { NextRequest, NextResponse } from 'next/server'
import { startLot } from '@/lib/scheduler/operations'
import { withTenant, RouteContext } from '@/lib/api-middleware'
import { prisma } from '@/lib/prisma'

export const POST = withTenant(async (
  request: NextRequest,
  ctx: RouteContext
) => {
  try {
    const body = await request.json()
    const lotId = request.url.split("/").slice(-2)[0]
    
    // Find the active assignment for this lot
    const assignment = await prisma.tankAssignment.findFirst({
      where: {
        lotId,
        tenantId: ctx.tenantId,
        status: 'PLANNED',
      },
      orderBy: { createdAt: 'asc' },
    })
    
    if (!assignment) {
      return NextResponse.json(
        { error: 'No planned assignment found for this lot' },
        { status: 404 }
      )
    }
    
    const startedAt = body.startedAt ? new Date(body.startedAt) : new Date()

    await startLot(assignment.id, startedAt)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error starting lot:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to start lot' },
      { status: 400 }
    )
  }
})

