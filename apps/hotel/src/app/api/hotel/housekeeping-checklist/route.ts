export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

// GET - Fetch housekeeping checklist items
export async function GET() {
  try {
    const { getTenantId, unauthorizedResponse } = await import('@/lib/tenant')
    const tenantId = await getTenantId()
    
    if (!tenantId) {
      return unauthorizedResponse()
    }
    
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()
    
    const items = await prisma.hotelHousekeepingItem.findMany({
      where: { organizationId: tenantId },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    })
    
    return NextResponse.json(items)
  } catch (error: any) {
    console.error('Error loading housekeeping checklist:', error)
    return NextResponse.json({ error: 'Failed to load housekeeping checklist' }, { status: 500 })
  }
}

// POST - Create or update item (upsert by name)
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
    
    // Handle bulk save (array of items)
    if (Array.isArray(data)) {
      // Delete existing and replace
      await prisma.hotelHousekeepingItem.deleteMany({
        where: { organizationId: tenantId }
      })
      
      const created = await prisma.hotelHousekeepingItem.createMany({
        data: data.map((item: any, index: number) => ({
          organizationId: tenantId,
          name: item.name || item.text || item.label,
          category: item.category || 'general',
          sortOrder: item.sortOrder ?? index,
          isRequired: item.isRequired ?? item.required ?? false,
          isActive: item.isActive ?? item.checked ?? true,
        }))
      })
      
      return NextResponse.json({ success: true, count: created.count })
    }
    
    // Single item
    const existing = await prisma.hotelHousekeepingItem.findFirst({
      where: { organizationId: tenantId, name: data.name }
    })
    
    if (existing) {
      const updated = await prisma.hotelHousekeepingItem.update({
        where: { id: existing.id },
        data: {
          name: data.name ?? existing.name,
          category: data.category ?? existing.category,
          sortOrder: data.sortOrder ?? existing.sortOrder,
          isRequired: data.isRequired ?? existing.isRequired,
          isActive: data.isActive ?? existing.isActive,
        },
      })
      return NextResponse.json(updated)
    }
    
    const created = await prisma.hotelHousekeepingItem.create({
      data: {
        organizationId: tenantId,
        name: data.name,
        category: data.category || 'general',
        sortOrder: data.sortOrder || 0,
        isRequired: data.isRequired ?? false,
        isActive: data.isActive ?? true,
      },
    })
    
    return NextResponse.json(created)
  } catch (error: any) {
    console.error('Error saving housekeeping item:', error)
    return NextResponse.json({ error: 'Failed to save housekeeping item' }, { status: 500 })
  }
}

// DELETE - Delete item
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
    
    await prisma.hotelHousekeepingItem.delete({
      where: { id },
    })
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting housekeeping item:', error)
    return NextResponse.json({ error: 'Failed to delete housekeeping item' }, { status: 500 })
  }
}