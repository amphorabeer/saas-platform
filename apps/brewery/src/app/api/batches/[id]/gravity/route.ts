import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@saas-platform/database'
import { withTenant, RouteContext } from '@/lib/api-middleware'

// POST /api/batches/[id]/gravity - Add gravity reading
export const POST = withTenant(async (
  req: NextRequest,
  ctx: RouteContext
) => {
  try {
    // Extract batchId from URL path: /api/batches/[id]/gravity
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    const batchId = pathParts[pathParts.indexOf('batches') + 1]

    if (!batchId) {
      return NextResponse.json({ error: 'Batch ID required' }, { status: 400 })
    }
    const body = await req.json()
    
    const { gravity, temperature, isOriginal } = body
    
    if (!gravity || isNaN(gravity)) {
      return NextResponse.json(
        { error: 'სიმკვრივე აუცილებელია' },
        { status: 400 }
      )
    }
    
    // Find batch
    const batch = await prisma.batch.findFirst({
      where: {
        id: batchId,
        tenantId: ctx.tenantId,
      },
    })
    
    if (!batch) {
      return NextResponse.json(
        { error: 'პარტია ვერ მოიძებნა' },
        { status: 404 }
      )
    }
    
    // Create gravity reading
    const reading = await prisma.gravityReading.create({
      data: {
        batchId,
        gravity: gravity,
        temperature: temperature || null,
        notes: isOriginal ? 'Original Gravity (OG)' : null,
        recordedBy: ctx.userId || 'system',
        recordedAt: new Date(),
      },
    })
    
    // Update batch with current gravity (and OG if it's the original reading)
    const updateData: any = {
      currentGravity: gravity,
      updatedAt: new Date(),
    }
    
    if (isOriginal) {
      updateData.originalGravity = gravity
    }
    
    await prisma.batch.update({
      where: { id: batchId },
      data: updateData,
    })
    
    console.log(`[GRAVITY API] Added reading for batch ${batchId}: ${gravity}${isOriginal ? ' (OG)' : ''}`)
    
    return NextResponse.json({
      success: true,
      reading,
      message: isOriginal ? 'საწყისი სიმკვრივე შენახულია' : 'სიმკვრივე შენახულია',
    })
  } catch (error: any) {
    console.error('[GRAVITY API] Error:', error)
    return NextResponse.json(
      { error: 'სიმკვრივის შენახვა ვერ მოხერხდა', details: error.message },
      { status: 500 }
    )
  }
})

// GET /api/batches/[id]/gravity - Get gravity readings
export const GET = withTenant(async (
  req: NextRequest,
  ctx: RouteContext
) => {
  try {
    // Extract batchId from URL path: /api/batches/[id]/gravity
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    const batchId = pathParts[pathParts.indexOf('batches') + 1]

    if (!batchId) {
      return NextResponse.json({ error: 'Batch ID required' }, { status: 400 })
    }
    
    const readings = await prisma.gravityReading.findMany({
      where: { batchId },
      orderBy: { recordedAt: 'desc' },
    })
    
    return NextResponse.json({ readings })
  } catch (error: any) {
    console.error('[GRAVITY API] Error:', error)
    return NextResponse.json(
      { error: 'სიმკვრივეების წამოღება ვერ მოხერხდა' },
      { status: 500 }
    )
  }
})
