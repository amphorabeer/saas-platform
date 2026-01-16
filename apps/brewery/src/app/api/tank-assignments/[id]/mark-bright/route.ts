import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@saas-platform/database'
import { withTenant, RouteContext } from '@/lib/api-middleware'

// POST /api/tank-assignments/[id]/mark-bright - Mark tank assignment as bright (transfer to bright tank)
export const POST = withTenant(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    const assignmentIdIndex = pathParts.indexOf('tank-assignments') + 2
    const assignmentId = pathParts[assignmentIdIndex]

    if (!assignmentId) {
      return NextResponse.json({ error: 'Assignment ID is required' }, { status: 400 })
    }

    const body = await req.json()

    // Find assignment
    const assignment = await prisma.tankAssignment.findFirst({
      where: {
        id: assignmentId,
        tenantId: ctx.tenantId,
      },
    })

    if (!assignment) {
      return NextResponse.json({ error: 'Tank assignment not found' }, { status: 404 })
    }

    // Update assignment phase to BRIGHT
    const updated = await prisma.tankAssignment.update({
      where: { id: assignmentId },
      data: {
        phase: 'BRIGHT',
        updatedAt: new Date(),
        ...(body.notes !== undefined && { notes: body.notes }),
      },
    })

    return NextResponse.json({ 
      success: true,
      assignment: updated,
    })
  } catch (error: any) {
    console.error('[POST /api/tank-assignments/[id]/mark-bright] Error:', error)
    return NextResponse.json(
      { error: 'Failed to mark assignment as bright', details: error.message },
      { status: 500 }
    )
  }
})
