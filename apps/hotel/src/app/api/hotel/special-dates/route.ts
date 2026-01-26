export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

// GET - Fetch all special dates
export async function GET() {
  try {
    const { getTenantId, unauthorizedResponse } = await import('@/lib/tenant')
    const tenantId = await getTenantId()
    
    if (!tenantId) {
      return unauthorizedResponse()
    }
    
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()
    
    const dates = await prisma.hotelSpecialDate.findMany({
      where: { organizationId: tenantId },
      orderBy: { date: 'asc' },
    })
    
    return NextResponse.json(dates)
  } catch (error: any) {
    console.error('Error loading special dates:', error)
    return NextResponse.json({ error: 'Failed to load special dates' }, { status: 500 })
  }
}

// POST - Create or update special date (upsert by date)
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
    
    const dateValue = new Date(data.date)
    
    // Try to find existing
    const existing = await prisma.hotelSpecialDate.findFirst({
      where: { organizationId: tenantId, date: dateValue }
    })
    
    if (existing) {
      const updated = await prisma.hotelSpecialDate.update({
        where: { id: existing.id },
        data: {
          name: data.name ?? existing.name,
          priceModifier: data.priceModifier ?? existing.priceModifier,
          priceType: data.priceType ?? existing.priceType,
          fixedPrice: data.fixedPrice ?? existing.fixedPrice,
          color: data.color ?? existing.color,
          roomTypes: data.roomTypes ?? existing.roomTypes,
          isActive: data.isActive ?? existing.isActive,
          dateData: data.dateData ?? existing.dateData,
        },
      })
      return NextResponse.json(updated)
    }
    
    const created = await prisma.hotelSpecialDate.create({
      data: {
        organizationId: tenantId,
        date: dateValue,
        name: data.name,
        priceModifier: data.priceModifier || 0,
        priceType: data.priceType || 'modifier',
        fixedPrice: data.fixedPrice || null,
        color: data.color || null,
        roomTypes: data.roomTypes || [],
        isActive: data.isActive ?? true,
        dateData: data.dateData || null,
      },
    })
    
    return NextResponse.json(created)
  } catch (error: any) {
    console.error('Error creating special date:', error)
    return NextResponse.json({ error: 'Failed to create special date' }, { status: 500 })
  }
}

// PUT - Update special date
export async function PUT(request: NextRequest) {
  try {
    const { getTenantId, unauthorizedResponse } = await import('@/lib/tenant')
    const tenantId = await getTenantId()
    
    if (!tenantId) {
      return unauthorizedResponse()
    }
    
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()
    const data = await request.json()
    
    if (!data.id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 })
    }
    
    const updated = await prisma.hotelSpecialDate.update({
      where: { id: data.id },
      data: {
        date: data.date ? new Date(data.date) : undefined,
        name: data.name,
        priceModifier: data.priceModifier,
        priceType: data.priceType,
        fixedPrice: data.fixedPrice,
        color: data.color,
        roomTypes: data.roomTypes,
        isActive: data.isActive,
        dateData: data.dateData,
      },
    })
    
    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('Error updating special date:', error)
    return NextResponse.json({ error: 'Failed to update special date' }, { status: 500 })
  }
}

// DELETE - Delete special date
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
    
    await prisma.hotelSpecialDate.delete({
      where: { id },
    })
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting special date:', error)
    return NextResponse.json({ error: 'Failed to delete special date' }, { status: 500 })
  }
}