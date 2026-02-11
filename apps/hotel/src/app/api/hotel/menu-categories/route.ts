export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

// GET - ყველა კატეგორიის მიღება
export async function GET() {
  try {
    const { getTenantId, unauthorizedResponse } = await import('@/lib/tenant')
    const tenantId = await getTenantId()
    
    if (!tenantId) {
      return unauthorizedResponse()
    }
    
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()
    
    const categories = await prisma.menuCategory.findMany({
      where: { tenantId },
      include: {
        items: {
          where: { isActive: true },
          orderBy: { name: 'asc' }
        }
      },
      orderBy: { sortOrder: 'asc' }
    })

    return NextResponse.json(categories)
  } catch (error: any) {
    console.error('Error fetching menu categories:', error)
    return NextResponse.json({ error: 'Failed to fetch categories', details: error.message }, { status: 500 })
  }
}

// POST - ახალი კატეგორიის დამატება
export async function POST(request: NextRequest) {
  try {
    const { getTenantId, unauthorizedResponse } = await import('@/lib/tenant')
    const tenantId = await getTenantId()
    
    if (!tenantId) {
      return unauthorizedResponse()
    }
    
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()
    
    const body = await request.json()
    const { name, nameEn, icon, sortOrder, isActive } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const category = await prisma.menuCategory.create({
      data: {
        tenantId,
        name,
        nameEn: nameEn || null,
        icon: icon || '🍽️',
        sortOrder: sortOrder || 0,
        isActive: isActive ?? true
      }
    })

    return NextResponse.json(category, { status: 201 })
  } catch (error: any) {
    console.error('Error creating menu category:', error)
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Category with this name already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to create category', details: error.message }, { status: 500 })
  }
}

// PUT - კატეგორიების bulk update
export async function PUT(request: NextRequest) {
  try {
    const { getTenantId, unauthorizedResponse } = await import('@/lib/tenant')
    const tenantId = await getTenantId()
    
    if (!tenantId) {
      return unauthorizedResponse()
    }
    
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()
    
    const body = await request.json()
    
    if (Array.isArray(body)) {
      const results = await Promise.all(
        body.map(async (cat: any) => {
          // Check if it's an existing record (has valid cuid)
          if (cat.id && cat.id.length > 20) {
            return prisma.menuCategory.update({
              where: { id: cat.id },
              data: {
                name: cat.name,
                nameEn: cat.nameEn || null,
                icon: cat.icon || '🍽️',
                sortOrder: cat.sortOrder || 0,
                isActive: cat.isActive ?? true
              }
            })
          } else {
            // Create new
            return prisma.menuCategory.create({
              data: {
                tenantId,
                name: cat.name,
                nameEn: cat.nameEn || null,
                icon: cat.icon || '🍽️',
                sortOrder: cat.sortOrder || 0,
                isActive: cat.isActive ?? true
              }
            })
          }
        })
      )
      return NextResponse.json(results)
    }

    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  } catch (error: any) {
    console.error('Error updating menu categories:', error)
    return NextResponse.json({ error: 'Failed to update categories', details: error.message }, { status: 500 })
  }
}

// DELETE - კატეგორიის წაშლა
export async function DELETE(request: NextRequest) {
  try {
    const { getTenantId, unauthorizedResponse } = await import('@/lib/tenant')
    const tenantId = await getTenantId()
    
    if (!tenantId) {
      return unauthorizedResponse()
    }
    
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()
    
    const url = new URL(request.url)
    const id = url.searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'Category ID required' }, { status: 400 })
    }

    await prisma.menuCategory.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting menu category:', error)
    return NextResponse.json({ error: 'Failed to delete category', details: error.message }, { status: 500 })
  }
}
