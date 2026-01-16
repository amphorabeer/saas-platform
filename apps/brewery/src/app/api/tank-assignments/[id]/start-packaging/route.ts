import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@saas-platform/database'
import { withTenant, RouteContext } from '@/lib/api-middleware'

// POST /api/tank-assignments/[id]/start-packaging - Start packaging for tank assignment
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
      include: {
        Lot: {
          include: {
            LotBatch: {
              include: {
                Batch: true,
              },
            },
          },
        },
      },
    })

    if (!assignment) {
      return NextResponse.json({ error: 'Tank assignment not found' }, { status: 404 })
    }

    // Update assignment phase to PACKAGING
    const updated = await prisma.tankAssignment.update({
      where: { id: assignmentId },
      data: {
        phase: 'PACKAGING',
        status: 'ACTIVE',
        updatedAt: new Date(),
        ...(body.notes !== undefined && { notes: body.notes }),
      },
    })

    // Update batch status to PACKAGING if not already
    const batch = assignment.Lot.LotBatch?.[0]?.Batch
    if (batch && batch.status !== 'PACKAGING') {
      await prisma.batch.update({
        where: { id: batch.id },
        data: {
          status: 'PACKAGING',
        },
      })
    }

    return NextResponse.json({ 
      success: true,
      assignment: updated,
    })
  } catch (error: any) {
    console.error('[POST /api/tank-assignments/[id]/start-packaging] Error:', error)
    return NextResponse.json(
      { error: 'Failed to start packaging', details: error.message },
      { status: 500 }
    )
  }
})
