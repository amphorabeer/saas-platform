export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

// GET - Fetch all room types for tenant
export async function GET() {
  try {
    const { getTenantId, unauthorizedResponse } = await import('@/lib/tenant')
    const tenantId = await getTenantId()
    
    if (!tenantId) {
      return unauthorizedResponse()
    }
    
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()
    
    const roomTypes = await prisma.roomType.findMany({
      where: { organizationId: tenantId },
      orderBy: { name: 'asc' },
    })
    
    return NextResponse.json(roomTypes)
  } catch (error: any) {
    console.error('Error loading room types:', error)
    return NextResponse.json({ error: 'Failed to load room types', details: error.message }, { status: 500 })
  }
}

// POST - Create new room type
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
    
    const roomType = await prisma.roomType.create({
      data: {
        organizationId: tenantId,
        code: data.code || data.name?.toUpperCase().replace(/\s+/g, '_').slice(0, 10) || 'TYPE',
        name: data.name,
        nameEn: data.nameEn || data.name,
        basePrice: data.basePrice || data.price || 0,
        maxOccupancy: data.maxOccupancy || 2,
        amenities: data.amenities || [],
        description: data.description || null,
        isActive: data.isActive ?? data.active ?? true,
        typeData: data.typeData || null,
      },
    })
    
    return NextResponse.json(roomType)
  } catch (error: any) {
    console.error('Error creating room type:', error)
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Room type with this code already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to create room type', details: error.message }, { status: 500 })
  }
}

// PUT - Update room type
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
    
    if (!data.id && !data.code) {
      return NextResponse.json({ error: 'Room type ID or code required' }, { status: 400 })
    }
    
    const existing = await prisma.roomType.findFirst({
      where: data.id 
        ? { id: data.id, organizationId: tenantId }
        : { code: data.code, organizationId: tenantId }
    })
    
    if (!existing) {
      return NextResponse.json({ error: 'Room type not found' }, { status: 404 })
    }
    
    const roomType = await prisma.roomType.update({
      where: { id: existing.id },
      data: {
        code: data.code ?? existing.code,
        name: data.name ?? existing.name,
        nameEn: data.nameEn ?? existing.nameEn,
        basePrice: data.basePrice ?? data.price ?? existing.basePrice,
        maxOccupancy: data.maxOccupancy ?? existing.maxOccupancy,
        amenities: data.amenities ?? existing.amenities,
        description: data.description ?? existing.description,
        isActive: data.isActive ?? data.active ?? existing.isActive,
        typeData: data.typeData ?? existing.typeData,
      },
    })
    
    return NextResponse.json(roomType)
  } catch (error: any) {
    console.error('Error updating room type:', error)
    return NextResponse.json({ error: 'Failed to update room type', details: error.message }, { status: 500 })
  }
}

// DELETE - Delete room type
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
      return NextResponse.json({ error: 'Room type ID required' }, { status: 400 })
    }
    
    const existing = await prisma.roomType.findFirst({
      where: { id, organizationId: tenantId }
    })
    
    if (!existing) {
      return NextResponse.json({ error: 'Room type not found' }, { status: 404 })
    }
    
    await prisma.roomType.delete({
      where: { id },
    })
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting room type:', error)
    return NextResponse.json({ error: 'Failed to delete room type', details: error.message }, { status: 500 })
  }
}