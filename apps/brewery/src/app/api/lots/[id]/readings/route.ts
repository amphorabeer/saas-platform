import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@saas-platform/database'
import { withTenant, RouteContext } from '@/lib/api-middleware'
import { randomUUID } from 'crypto'

function extractLotId(url: string): string {
  const parts = new URL(url).pathname.split('/').filter(Boolean)
  const idx = parts.indexOf('lots')
  return parts[idx + 1] || ''
}

// GET /api/lots/[id]/readings
export const GET = withTenant(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const lotId = extractLotId(req.url)
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type')

    const readings = await prisma.lotReading.findMany({
      where: {
        lotId,
        Lot: { tenantId: ctx.tenantId },
        ...(type ? { readingType: type as any } : {}),
      },
      orderBy: { recordedAt: 'desc' },
      take: 100,
    })

    return NextResponse.json({ readings })
  } catch (error) {
    console.error('[GET /api/lots/[id]/readings]', error)
    return NextResponse.json({ error: 'Failed to fetch readings' }, { status: 500 })
  }
})

// POST /api/lots/[id]/readings
export const POST = withTenant(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const lotId = extractLotId(req.url)
    const body = await req.json()
    const { tankId, readingType, value, unit, notes } = body

    if (!tankId || !readingType || value === undefined) {
      return NextResponse.json(
        { error: 'tankId, readingType და value სავალდებულოა' },
        { status: 400 }
      )
    }

    // Verify lot belongs to tenant
    const lot = await prisma.lot.findFirst({
      where: { id: lotId, tenantId: ctx.tenantId },
      include: {
        LotBatch: {
          include: { Batch: { select: { batchNumber: true } } },
          take: 1,
        },
      },
    })
    if (!lot) {
      return NextResponse.json({ error: 'ლოტი ვერ მოიძებნა' }, { status: 404 })
    }

    // Verify tank belongs to tenant
    const tank = await prisma.tank.findFirst({
      where: { id: tankId, tenantId: ctx.tenantId },
      select: { id: true, name: true },
    })
    if (!tank) {
      return NextResponse.json({ error: 'ავზი ვერ მოიძებნა' }, { status: 404 })
    }

    const reading = await prisma.lotReading.create({
      data: {
        id: randomUUID(),
        lotId,
        tankId,
        readingType,
        value,
        unit: unit || (readingType === 'TEMPERATURE' ? '°C' : ''),
        notes: notes || null,
        recordedBy: ctx.userId,
        recordedAt: new Date(),
      },
    })

    // HACCP TEMPERATURE auto-sync for TEMPERATURE readings
    if (readingType === 'TEMPERATURE') {
      try {
        const batchNumber = lot.LotBatch[0]?.Batch?.batchNumber || null
        await prisma.haccpJournal.create({
          data: {
            tenantId: ctx.tenantId,
            type: 'TEMPERATURE',
            data: {
              source: 'auto',
              area: tank.name,
              tankId: tank.id,
              tankName: tank.name,
              lotId: lot.id,
              lotCode: lot.lotCode || null,
              batchNumber,
              temperature: Number(value),
              humidity: null,
              notes: notes || null,
              autoTag: `ავზიდან | ${tank.name} | ${value}°C`,
            },
            recordedBy: ctx.userId,
            recordedAt: new Date(),
          },
        })
      } catch (syncErr) {
        console.error('[LotReading] HACCP TEMPERATURE sync error:', syncErr)
      }
    }

    return NextResponse.json({ reading }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/lots/[id]/readings]', error)
    return NextResponse.json({ error: 'Failed to create reading' }, { status: 500 })
  }
})
