export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

// GET - Fetch all room rates
export async function GET() {
  try {
    const { getTenantId, unauthorizedResponse } = await import('@/lib/tenant')
    const tenantId = await getTenantId()
    
    if (!tenantId) {
      return unauthorizedResponse()
    }
    
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()
    
    const rates = await prisma.hotelRoomRate.findMany({
      where: { organizationId: tenantId },
      orderBy: [{ roomTypeCode: 'asc' }, { dayOfWeek: 'asc' }],
    })
    
    return NextResponse.json(rates)
  } catch (error: any) {
    console.error('Error loading room rates:', error)
    return NextResponse.json({ error: 'Failed to load room rates' }, { status: 500 })
  }
}

// POST - Create or update room rate (upsert by roomTypeCode + dayOfWeek)
export async function POST(request: NextRequest) {
  try {
    const { getTenantId, unauthorizedResponse } = await import('@/lib/tenant')
    const tenantId = await getTenantId()
    
    if (!tenantId) {
      return unauthorizedResponse()
    }
    
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()
    const data = await request.json()
    
    // Handle bulk save (array of rates)
    if (Array.isArray(data)) {
      const results = []
      for (const rate of data) {
        const existing = await prisma.hotelRoomRate.findFirst({
          where: { 
            organizationId: tenantId, 
            roomTypeCode: rate.roomTypeCode,
            dayOfWeek: rate.dayOfWeek ?? null
          }
        })
        
        if (existing) {
          const updated = await prisma.hotelRoomRate.update({
            where: { id: existing.id },
            data: {
              basePrice: rate.basePrice ?? rate.price ?? existing.basePrice,
              isActive: rate.isActive ?? existing.isActive,
              rateData: rate.rateData ?? existing.rateData,
            },
          })
          results.push(updated)
        } else {
          const created = await prisma.hotelRoomRate.create({
            data: {
              organizationId: tenantId,
              roomTypeCode: rate.roomTypeCode,
              dayOfWeek: rate.dayOfWeek ?? null,
              basePrice: rate.basePrice ?? rate.price ?? 0,
              isActive: rate.isActive ?? true,
              rateData: rate.rateData || null,
            },
          })
          results.push(created)
        }
      }
      return NextResponse.json(results)
    }
    
    // Single rate
    const existing = await prisma.hotelRoomRate.findFirst({
      where: { 
        organizationId: tenantId, 
        roomTypeCode: data.roomTypeCode,
        dayOfWeek: data.dayOfWeek ?? null
      }
    })
    
    if (existing) {
      const updated = await prisma.hotelRoomRate.update({
        where: { id: existing.id },
        data: {
          basePrice: data.basePrice ?? data.price ?? existing.basePrice,
          isActive: data.isActive ?? existing.isActive,
          rateData: data.rateData ?? existing.rateData,
        },
      })
      return NextResponse.json(updated)
    }
    
    const created = await prisma.hotelRoomRate.create({
      data: {
        organizationId: tenantId,
        roomTypeCode: data.roomTypeCode,
        dayOfWeek: data.dayOfWeek ?? null,
        basePrice: data.basePrice ?? data.price ?? 0,
        isActive: data.isActive ?? true,
        rateData: data.rateData || null,
      },
    })
    
    return NextResponse.json(created)
  } catch (error: any) {
    console.error('Error saving room rate:', error)
    return NextResponse.json({ error: 'Failed to save room rate' }, { status: 500 })
  }
}

// DELETE - Delete room rate
export async function DELETE(request: NextRequest) {
  try {
    const { getTenantId, unauthorizedResponse } = await import('@/lib/tenant')
    const tenantId = await getTenantId()
    
    if (!tenantId) {
      return unauthorizedResponse()
    }
    
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()
    
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 })
    }
    
    await prisma.hotelRoomRate.delete({
      where: { id },
    })
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting room rate:', error)
    return NextResponse.json({ error: 'Failed to delete room rate' }, { status: 500 })
  }
}