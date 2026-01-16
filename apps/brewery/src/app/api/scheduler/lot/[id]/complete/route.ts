import { NextRequest, NextResponse } from 'next/server'
import { completeLot } from '@/lib/scheduler/operations'
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
        status: 'ACTIVE',
      },
      orderBy: { createdAt: 'desc' },
    })
    
    if (!assignment) {
      return NextResponse.json(
        { error: 'No active assignment found for this lot' },
        { status: 404 }
      )
    }
    
    const completedAt = body.completedAt ? new Date(body.completedAt) : new Date()

    await completeLot(assignment.id, completedAt)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error completing lot:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to complete lot' },
      { status: 400 }
    )
  }
})

