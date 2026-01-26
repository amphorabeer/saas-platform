export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

// GET - Fetch charge categories
export async function GET() {
  try {
    const { getTenantId, unauthorizedResponse } = await import('@/lib/tenant')
    const tenantId = await getTenantId()
    
    if (!tenantId) {
      return unauthorizedResponse()
    }
    
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()
    
    const categories = await prisma.hotelChargeCategory.findMany({
      where: { organizationId: tenantId },
      orderBy: { sortOrder: 'asc' },
    })
    
    return NextResponse.json(categories)
  } catch (error: any) {
    console.error('Error loading charge categories:', error)
    return NextResponse.json({ error: 'Failed to load charge categories' }, { status: 500 })
  }
}

// POST - Create or update category (upsert by code)
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
    
    // Handle bulk save
    if (Array.isArray(data)) {
      const results = []
      for (const cat of data) {
        const code = cat.code || cat.id || cat.name?.toUpperCase().replace(/\s+/g, '_')
        
        const existing = await prisma.hotelChargeCategory.findFirst({
          where: { organizationId: tenantId, code }
        })
        
        if (existing) {
          const updated = await prisma.hotelChargeCategory.update({
            where: { id: existing.id },
            data: {
              name: cat.name ?? existing.name,
              icon: cat.icon ?? existing.icon,
              sortOrder: cat.sortOrder ?? existing.sortOrder,
              isActive: cat.isActive ?? existing.isActive,
            },
          })
          results.push(updated)
        } else {
          const created = await prisma.hotelChargeCategory.create({
            data: {
              organizationId: tenantId,
              name: cat.name,
              code,
              icon: cat.icon || null,
              sortOrder: cat.sortOrder || 0,
              isActive: cat.isActive ?? true,
            },
          })
          results.push(created)
        }
      }
      return NextResponse.json(results)
    }
    
    // Single category
    const code = data.code || data.name?.toUpperCase().replace(/\s+/g, '_')
    
    const existing = await prisma.hotelChargeCategory.findFirst({
      where: { organizationId: tenantId, code }
    })
    
    if (existing) {
      const updated = await prisma.hotelChargeCategory.update({
        where: { id: existing.id },
        data: {
          name: data.name ?? existing.name,
          icon: data.icon ?? existing.icon,
          sortOrder: data.sortOrder ?? existing.sortOrder,
          isActive: data.isActive ?? existing.isActive,
        },
      })
      return NextResponse.json(updated)
    }
    
    const created = await prisma.hotelChargeCategory.create({
      data: {
        organizationId: tenantId,
        name: data.name,
        code,
        icon: data.icon || null,
        sortOrder: data.sortOrder || 0,
        isActive: data.isActive ?? true,
      },
    })
    
    return NextResponse.json(created)
  } catch (error: any) {
    console.error('Error saving charge category:', error)
    return NextResponse.json({ error: 'Failed to save charge category' }, { status: 500 })
  }
}

// DELETE - Delete category
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
    
    await prisma.hotelChargeCategory.delete({
      where: { id },
    })
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting charge category:', error)
    return NextResponse.json({ error: 'Failed to delete charge category' }, { status: 500 })
  }
}