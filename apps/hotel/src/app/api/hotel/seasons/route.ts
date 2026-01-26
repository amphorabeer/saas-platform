export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

// GET - Fetch all seasons for tenant
export async function GET() {
  try {
    const { getTenantId, unauthorizedResponse } = await import('@/lib/tenant')
    const tenantId = await getTenantId()
    
    if (!tenantId) {
      return unauthorizedResponse()
    }
    
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()
    
    const seasons = await prisma.hotelSeason.findMany({
      where: { organizationId: tenantId },
      orderBy: { startDate: 'asc' },
    })
    
    return NextResponse.json(seasons)
  } catch (error: any) {
    console.error('Error loading seasons:', error)
    return NextResponse.json({ error: 'Failed to load seasons', details: error.message }, { status: 500 })
  }
}

// POST - Create new season
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
    
    const season = await prisma.hotelSeason.create({
      data: {
        organizationId: tenantId,
        name: data.name,
        startDate: new Date(data.startDate || data.start),
        endDate: new Date(data.endDate || data.end),
        priceMultiplier: data.priceMultiplier || data.multiplier || 1.0,
        isActive: data.isActive ?? data.active ?? true,
        seasonData: data.seasonData || null,
      },
    })
    
    return NextResponse.json(season)
  } catch (error: any) {
    console.error('Error creating season:', error)
    return NextResponse.json({ error: 'Failed to create season', details: error.message }, { status: 500 })
  }
}

// PUT - Update season
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
      return NextResponse.json({ error: 'Season ID required' }, { status: 400 })
    }
    
    const existing = await prisma.hotelSeason.findFirst({
      where: { id: data.id, organizationId: tenantId }
    })
    
    if (!existing) {
      return NextResponse.json({ error: 'Season not found' }, { status: 404 })
    }
    
    const season = await prisma.hotelSeason.update({
      where: { id: data.id },
      data: {
        name: data.name ?? existing.name,
        startDate: data.startDate ? new Date(data.startDate) : (data.start ? new Date(data.start) : existing.startDate),
        endDate: data.endDate ? new Date(data.endDate) : (data.end ? new Date(data.end) : existing.endDate),
        priceMultiplier: data.priceMultiplier ?? data.multiplier ?? existing.priceMultiplier,
        isActive: data.isActive ?? data.active ?? existing.isActive,
        seasonData: data.seasonData ?? existing.seasonData,
      },
    })
    
    return NextResponse.json(season)
  } catch (error: any) {
    console.error('Error updating season:', error)
    return NextResponse.json({ error: 'Failed to update season', details: error.message }, { status: 500 })
  }
}

// DELETE - Delete season
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
      return NextResponse.json({ error: 'Season ID required' }, { status: 400 })
    }
    
    const existing = await prisma.hotelSeason.findFirst({
      where: { id, organizationId: tenantId }
    })
    
    if (!existing) {
      return NextResponse.json({ error: 'Season not found' }, { status: 404 })
    }
    
    await prisma.hotelSeason.delete({
      where: { id },
    })
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting season:', error)
    return NextResponse.json({ error: 'Failed to delete season', details: error.message }, { status: 500 })
  }
}
