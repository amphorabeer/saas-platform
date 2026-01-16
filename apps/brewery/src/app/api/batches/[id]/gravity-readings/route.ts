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

