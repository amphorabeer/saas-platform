export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

// GET - Fetch all charge items
export async function GET() {
  try {
    const { getTenantId, unauthorizedResponse } = await import('@/lib/tenant')
    const tenantId = await getTenantId()
    
    if (!tenantId) {
      return unauthorizedResponse()
    }
    
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()
    
    const items = await prisma.hotelChargeItem.findMany({
      where: { organizationId: tenantId },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    })
    
    return NextResponse.json(items)
  } catch (error: any) {
    console.error('Error loading charge items:', error)
    return NextResponse.json({ error: 'Failed to load charge items' }, { status: 500 })
  }
}

// POST - Create or update charge item (upsert by code)
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
    
    const code = data.code || data.name?.toUpperCase().replace(/\s+/g, '-').slice(0, 20)
    
    // Try to find existing
    const existing = await prisma.hotelChargeItem.findFirst({
      where: { organizationId: tenantId, code }
    })
    
    if (existing) {
      const updated = await prisma.hotelChargeItem.update({
        where: { id: existing.id },
        data: {
          name: data.name ?? existing.name,
          price: data.price ?? existing.price,
          category: data.category ?? existing.category,
          department: data.department ?? existing.department,
          unit: data.unit ?? existing.unit,
          stock: data.stock ?? existing.stock,
          isActive: data.isActive ?? data.available ?? existing.isActive,
          itemData: data.itemData ?? existing.itemData,
        },
      })
      return NextResponse.json(updated)
    }
    
    const created = await prisma.hotelChargeItem.create({
      data: {
        organizationId: tenantId,
        name: data.name,
        code,
        price: data.price || 0,
        category: data.category || 'Other',
        department: data.department || null,
        unit: data.unit || 'piece',
        stock: data.stock || null,
        isActive: data.isActive ?? data.available ?? true,
        itemData: data.itemData || null,
      },
    })
    
    return NextResponse.json(created)
  } catch (error: any) {
    console.error('Error creating charge item:', error)
    return NextResponse.json({ error: 'Failed to create charge item' }, { status: 500 })
  }
}

// PUT - Update charge item
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
    
    const updated = await prisma.hotelChargeItem.update({
      where: { id: data.id },
      data: {
        name: data.name,
        code: data.code,
        price: data.price,
        category: data.category,
        department: data.department,
        unit: data.unit,
        stock: data.stock,
        isActive: data.isActive ?? data.available,
        itemData: data.itemData,
      },
    })
    
    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('Error updating charge item:', error)
    return NextResponse.json({ error: 'Failed to update charge item' }, { status: 500 })
  }
}

// DELETE - Delete charge item
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
    
    await prisma.hotelChargeItem.delete({
      where: { id },
    })
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting charge item:', error)
    return NextResponse.json({ error: 'Failed to delete charge item' }, { status: 500 })
  }
}