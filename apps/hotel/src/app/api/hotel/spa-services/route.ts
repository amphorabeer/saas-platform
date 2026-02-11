export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

// GET - ყველა სპა სერვისის მიღება
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
    const activeOnly = searchParams.get('activeOnly') === 'true'
    const category = searchParams.get('category')

    const where: any = { tenantId }
    if (activeOnly) where.isActive = true
    if (category) where.category = category

    const services = await prisma.spaService.findMany({
      where,
      orderBy: [{ category: 'asc' }, { name: 'asc' }]
    })

    return NextResponse.json(services)
  } catch (error: any) {
    console.error('Error fetching spa services:', error)
    return NextResponse.json({ error: 'Failed to fetch services', details: error.message }, { status: 500 })
  }
}

// POST - ახალი სერვისის დამატება
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
    const { name, nameEn, price, duration, description, category, isActive } = body

    if (!name || price === undefined) {
      return NextResponse.json({ error: 'Name and price are required' }, { status: 400 })
    }

    const service = await prisma.spaService.create({
      data: {
        tenantId,
        name,
        nameEn: nameEn || null,
        price: Number(price),
        duration: duration || 30,
        description: description || null,
        category: category || null,
        isActive: isActive ?? true
      }
    })

    return NextResponse.json(service, { status: 201 })
  } catch (error: any) {
    console.error('Error creating spa service:', error)
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Service with this name already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to create service', details: error.message }, { status: 500 })
  }
}

// PUT - სერვისების bulk update
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
        body.map(async (service: any) => {
          // Check if it's an existing record
          if (service.id && service.id.length > 20) {
            return prisma.spaService.update({
              where: { id: service.id },
              data: {
                name: service.name,
                nameEn: service.nameEn || null,
                price: Number(service.price),
                duration: service.duration || 30,
                description: service.description || null,
                category: service.category || null,
                isActive: service.isActive ?? true
              }
            })
          } else {
            // Create new
            return prisma.spaService.create({
              data: {
                tenantId,
                name: service.name,
                nameEn: service.nameEn || null,
                price: Number(service.price),
                duration: service.duration || 30,
                description: service.description || null,
                category: service.category || null,
                isActive: service.isActive ?? true
              }
            })
          }
        })
      )
      return NextResponse.json(results)
    }

    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  } catch (error: any) {
    console.error('Error updating spa services:', error)
    return NextResponse.json({ error: 'Failed to update services', details: error.message }, { status: 500 })
  }
}

// DELETE - სერვისის წაშლა
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
      return NextResponse.json({ error: 'Service ID required' }, { status: 400 })
    }

    await prisma.spaService.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting spa service:', error)
    return NextResponse.json({ error: 'Failed to delete service', details: error.message }, { status: 500 })
  }
}
