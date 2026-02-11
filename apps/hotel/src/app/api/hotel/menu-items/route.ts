export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

// GET - ყველა კერძის მიღება
export async function GET(request: NextRequest) {
  try {
    const { getTenantId, unauthorizedResponse } = await import('@/lib/tenant')
    const tenantId = await getTenantId()
    
    if (!tenantId) {
      return unauthorizedResponse()
    }
    
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()

    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('categoryId')
    const activeOnly = searchParams.get('activeOnly') === 'true'

    const where: any = { tenantId }
    if (categoryId) where.categoryId = categoryId
    if (activeOnly) where.isActive = true

    const items = await prisma.menuItem.findMany({
      where,
      include: {
        category: true
      },
      orderBy: [
        { category: { sortOrder: 'asc' } },
        { name: 'asc' }
      ]
    })

    return NextResponse.json(items)
  } catch (error: any) {
    console.error('Error fetching menu items:', error)
    return NextResponse.json({ error: 'Failed to fetch menu items', details: error.message }, { status: 500 })
  }
}

// POST - ახალი კერძის დამატება
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
    const { 
      categoryId, name, nameEn, description, descriptionEn,
      price, preparationTime, isAvailable, isActive, imageUrl, allergens 
    } = body

    if (!categoryId || !name || price === undefined) {
      return NextResponse.json({ error: 'Category, name, and price are required' }, { status: 400 })
    }

    const item = await prisma.menuItem.create({
      data: {
        tenantId,
        categoryId,
        name,
        nameEn: nameEn || null,
        description: description || null,
        descriptionEn: descriptionEn || null,
        price: Number(price),
        preparationTime: preparationTime || 15,
        isAvailable: isAvailable ?? true,
        isActive: isActive ?? true,
        imageUrl: imageUrl || null,
        allergens: allergens || []
      },
      include: { category: true }
    })

    return NextResponse.json(item, { status: 201 })
  } catch (error: any) {
    console.error('Error creating menu item:', error)
    return NextResponse.json({ error: 'Failed to create menu item', details: error.message }, { status: 500 })
  }
}

// PUT - კერძების bulk update
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
        body.map(async (item: any) => {
          // Check if it's an existing record
          if (item.id && item.id.length > 20) {
            return prisma.menuItem.update({
              where: { id: item.id },
              data: {
                categoryId: item.categoryId,
                name: item.name,
                nameEn: item.nameEn || null,
                description: item.description || null,
                descriptionEn: item.descriptionEn || null,
                price: Number(item.price),
                preparationTime: item.preparationTime || 15,
                isAvailable: item.isAvailable ?? true,
                isActive: item.isActive ?? true,
                imageUrl: item.imageUrl || null,
                allergens: item.allergens || []
              }
            })
          } else {
            // Create new
            return prisma.menuItem.create({
              data: {
                tenantId,
                categoryId: item.categoryId,
                name: item.name,
                nameEn: item.nameEn || null,
                description: item.description || null,
                descriptionEn: item.descriptionEn || null,
                price: Number(item.price),
                preparationTime: item.preparationTime || 15,
                isAvailable: item.isAvailable ?? true,
                isActive: item.isActive ?? true,
                imageUrl: item.imageUrl || null,
                allergens: item.allergens || []
              }
            })
          }
        })
      )
      return NextResponse.json(results)
    }

    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  } catch (error: any) {
    console.error('Error updating menu items:', error)
    return NextResponse.json({ error: 'Failed to update menu items', details: error.message }, { status: 500 })
  }
}

// DELETE - კერძის წაშლა
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
      return NextResponse.json({ error: 'Item ID required' }, { status: 400 })
    }

    await prisma.menuItem.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting menu item:', error)
    return NextResponse.json({ error: 'Failed to delete item', details: error.message }, { status: 500 })
  }
}
