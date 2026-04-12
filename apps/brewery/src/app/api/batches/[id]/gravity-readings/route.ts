import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@brewery/database'
import { withPermission, RouteContext } from '@/lib/api-middleware'
import { randomUUID } from 'crypto'

export const POST = withPermission('batch:update', async (
  req: NextRequest,
  ctx: RouteContext
) => {
  try {
    const batchId = req.url.split('/').slice(-2)[0]
    const body = await req.json()
    
    const { gravity, temperature, notes } = body
    
    if (!gravity) {
      return NextResponse.json({ error: 'Gravity is required' }, { status: 400 })
    }
    
    // Create gravity reading
    const reading = await prisma.gravityReading.create({
      data: {
        id: randomUUID(),
        batchId,
        gravity: parseFloat(gravity),
        temperature: temperature ? parseFloat(temperature) : 0,
        notes: notes || null,
        recordedAt: new Date(),
        recordedBy: ctx.userId || 'system',
      },
    })
    
    // HACCP TEMPERATURE auto-sync (only if temperature provided)
    if (temperature) {
      try {
        // Get batch info for context
        const batch = await prisma.batch.findUnique({
          where: { id: batchId },
          select: {
            batchNumber: true,
            tenantId: true,
            tankId: true,
            tank: { select: { id: true, name: true } },
          },
        })
        let tankName = batch?.tank?.name || null
        let resolvedTankId = batch?.tankId || null

        // If no direct tankId, look through LotBatch → TankAssignment
        if (!resolvedTankId && batch) {
          try {
            const lotBatch = await (prisma as any).lotBatch.findFirst({
              where: { batchId },
              include: {
                Lot: {
                  include: {
                    TankAssignment: {
                      where: { status: { in: ['ACTIVE', 'COMPLETED'] } },
                      include: { Tank: { select: { id: true, name: true } } },
                      orderBy: { actualStart: 'desc' },
                      take: 1,
                    },
                  },
                },
              },
            })
            const tank = lotBatch?.Lot?.TankAssignment?.[0]?.Tank
            if (tank) {
              resolvedTankId = tank.id
              tankName = tank.name
            }
          } catch {
            /* skip */
          }
        }
        if (batch) {
          await prisma.haccpJournal.create({
            data: {
              tenantId: batch.tenantId,
              type: 'TEMPERATURE',
              data: {
                source: 'auto',
                area: tankName ? `ავზი ${tankName}` : `BRW: ${batch?.batchNumber || batchId}`,
                tankId: resolvedTankId,
                tankName: tankName,
                batchId,
                batchNumber: batch.batchNumber,
                temperature: parseFloat(temperature),
                humidity: null,
                gravity: parseFloat(gravity),
                notes: notes || null,
                autoTag: `სიმკვრივიდან | ${batch.batchNumber} | ${temperature}°C`,
              },
              recordedBy: ctx.userId || 'system',
              recordedAt: new Date(),
            },
          })
        }
      } catch (syncErr) {
        console.error('[GravityReading] HACCP TEMPERATURE sync error:', syncErr)
      }
    }

    // Also add to timeline
    await prisma.batchTimeline.create({
      data: {
        id: randomUUID(),
        batchId,
        type: 'GRAVITY_READING',
        title: 'სიმკვრივის გაზომვა',
        description: `SG: ${gravity}${temperature ? `, ${temperature}°C` : ''}`,
        data: { gravity, temperature, notes },
        createdBy: ctx.userId || 'system',
      },
    })
    
    return NextResponse.json({ reading })
  } catch (error: any) {
    console.error('[GRAVITY_READINGS] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})

