import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@saas-platform/database'
import { withTenant, RouteContext } from '@/lib/api-middleware'

export const POST = withTenant(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/').filter(Boolean)
    // Find 'batches' index and get the next part (the batch ID)
    const batchesIndex = pathParts.findIndex(part => part === 'batches')
    const batchId = batchesIndex >= 0 && batchesIndex < pathParts.length - 1 
      ? pathParts[batchesIndex + 1] 
      : null

    if (!batchId) {
      return NextResponse.json({ error: 'Batch ID is required', code: 'INVALID_REQUEST' }, { status: 400 })
    }

    const body = await req.json().catch(() => ({}))
    const { newTankId } = body

    // Find batch
    const batch = await prisma.batch.findFirst({
      where: { id: batchId, tenantId: ctx.tenantId },
    })

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found', code: 'NOT_FOUND' }, { status: 404 })
    }

    // Find target tank - first try Tank table, then Equipment
    let targetTankId = newTankId

    if (newTankId) {
      let tank = await prisma.tank.findFirst({
        where: { id: newTankId, tenantId: ctx.tenantId }
      })

      if (!tank) {
        // Maybe it's Equipment ID - find by ID and create Tank
        const equipment = await prisma.equipment.findFirst({
          where: { id: newTankId, tenantId: ctx.tenantId }
        })

        if (equipment) {
          // Find or create Tank by name
          tank = await prisma.tank.findFirst({
            where: { tenantId: ctx.tenantId, name: equipment.name }
          })

          if (!tank) {
            tank = await prisma.tank.create({
              data: {
                tenantId: ctx.tenantId,
                name: equipment.name,
                type: equipment.type as any || 'BRITE',
                capacity: equipment.capacity || 0,
                status: 'AVAILABLE',
              }
            })
          }

          targetTankId = tank.id

          // Update Equipment
          await prisma.equipment.update({
            where: { id: equipment.id },
            data: { currentBatchId: batch.id }
          })
        }
      }

      if (tank) {
        targetTankId = tank.id
        
        // Release old tank
        if (batch.tankId && batch.tankId !== targetTankId) {
          await prisma.tank.update({
            where: { id: batch.tankId },
            data: { status: 'CLEANING', currentBatchId: null }
          }).catch(() => {})
          
          // Clear old equipment by name
          const oldTank = await prisma.tank.findUnique({ where: { id: batch.tankId } })
          if (oldTank) {
            await prisma.equipment.updateMany({
              where: { tenantId: ctx.tenantId, name: oldTank.name },
              data: { currentBatchId: null }
            }).catch(() => {})
          }
        }

        // Update new tank
        await prisma.tank.update({
          where: { id: targetTankId },
          data: { status: 'OCCUPIED', currentBatchId: batch.id }
        })
      }
    }

    // Update batch
    const updatedBatch = await prisma.batch.update({
      where: { id: batchId },
      data: {
        status: 'CONDITIONING',
        tankId: targetTankId || batch.tankId,
        conditioningStartedAt: new Date(),
      }
    })

    // Timeline
    await prisma.batchTimeline.create({
      data: {
        batchId,
        type: 'CONDITIONING_STARTED',
        title: 'კონდიცირება დაიწყო',
        createdBy: ctx.userId,
      }
    })

    return NextResponse.json({ success: true, batch: updatedBatch })
  } catch (error) {
    console.error('[transfer] Error:', error)
    return NextResponse.json({ error: 'Failed', details: String(error) }, { status: 500 })
  }
})


