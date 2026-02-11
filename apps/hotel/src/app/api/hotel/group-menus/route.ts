export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

// GET - ყველა ჯგუფის მენიუ
export async function GET() {
  try {
    const { getTenantId, unauthorizedResponse } = await import('@/lib/tenant')
    const tenantId = await getTenantId()
    
    if (!tenantId) {
      return unauthorizedResponse()
    }
    
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()

    const menus = await prisma.groupMenu.findMany({
      where: { tenantId },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' }
        }
      },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json(menus)
  } catch (error: any) {
    console.error('Error fetching group menus:', error)
    return NextResponse.json({ error: 'Failed to fetch menus', details: error.message }, { status: 500 })
  }
}

// POST - ახალი ჯგუფის მენიუ
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
      name, nameEn, description, pricePerPerson, 
      minPersons, maxPersons, includesDrinks, includesDessert,
      items, isActive 
    } = body

    if (!name || pricePerPerson === undefined) {
      return NextResponse.json({ error: 'Name and price are required' }, { status: 400 })
    }

    const menu = await prisma.groupMenu.create({
      data: {
        tenantId,
        name,
        nameEn: nameEn || null,
        description: description || null,
        pricePerPerson: Number(pricePerPerson),
        minPersons: minPersons || null,
        maxPersons: maxPersons || null,
        includesDrinks: includesDrinks ?? false,
        includesDessert: includesDessert ?? false,
        isActive: isActive ?? true,
        items: items?.length > 0 ? {
          create: items.map((item: any, idx: number) => ({
            name: item.name,
            nameEn: item.nameEn || null,
            quantity: item.quantity || 1,
            unitPrice: Number(item.unitPrice || 0),
            category: item.category || null,
            sortOrder: idx
          }))
        } : undefined
      },
      include: { items: true }
    })

    return NextResponse.json(menu, { status: 201 })
  } catch (error: any) {
    console.error('Error creating group menu:', error)
    return NextResponse.json({ error: 'Failed to create menu', details: error.message }, { status: 500 })
  }
}

// PUT - ჯგუფის მენიუების bulk update
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
        body.map(async (menu: any) => {
          if (menu.id && menu.id.length > 20) {
            // Delete existing items and recreate
            await prisma.groupMenuItem.deleteMany({
              where: { groupMenuId: menu.id }
            })
            
            return prisma.groupMenu.update({
              where: { id: menu.id },
              data: {
                name: menu.name,
                nameEn: menu.nameEn || null,
                description: menu.description || null,
                pricePerPerson: Number(menu.pricePerPerson),
                minPersons: menu.minPersons || null,
                maxPersons: menu.maxPersons || null,
                includesDrinks: menu.includesDrinks ?? false,
                includesDessert: menu.includesDessert ?? false,
                isActive: menu.isActive ?? true,
                items: menu.items?.length > 0 ? {
                  create: menu.items.map((item: any, idx: number) => ({
                    name: item.name,
                    nameEn: item.nameEn || null,
                    quantity: item.quantity || 1,
                    unitPrice: Number(item.unitPrice || 0),
                    category: item.category || null,
                    sortOrder: idx
                  }))
                } : undefined
              },
              include: { items: true }
            })
          } else {
            return prisma.groupMenu.create({
              data: {
                tenantId,
                name: menu.name,
                nameEn: menu.nameEn || null,
                description: menu.description || null,
                pricePerPerson: Number(menu.pricePerPerson),
                minPersons: menu.minPersons || null,
                maxPersons: menu.maxPersons || null,
                includesDrinks: menu.includesDrinks ?? false,
                includesDessert: menu.includesDessert ?? false,
                isActive: menu.isActive ?? true,
                items: menu.items?.length > 0 ? {
                  create: menu.items.map((item: any, idx: number) => ({
                    name: item.name,
                    nameEn: item.nameEn || null,
                    quantity: item.quantity || 1,
                    unitPrice: Number(item.unitPrice || 0),
                    category: item.category || null,
                    sortOrder: idx
                  }))
                } : undefined
              },
              include: { items: true }
            })
          }
        })
      )
      return NextResponse.json(results)
    }

    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  } catch (error: any) {
    console.error('Error updating group menus:', error)
    return NextResponse.json({ error: 'Failed to update menus', details: error.message }, { status: 500 })
  }
}

// DELETE - ჯგუფის მენიუს წაშლა
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
      return NextResponse.json({ error: 'Menu ID required' }, { status: 400 })
    }

    // Items will be deleted by cascade
    await prisma.groupMenu.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting group menu:', error)
    return NextResponse.json({ error: 'Failed to delete menu', details: error.message }, { status: 500 })
  }
}
