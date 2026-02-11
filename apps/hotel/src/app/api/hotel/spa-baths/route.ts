export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

// GET - ყველა აბაზანის მიღება
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

    const where: any = { tenantId }
    if (activeOnly) where.isActive = true

    const baths = await prisma.spaBath.findMany({
      where,
      orderBy: { name: 'asc' }
    })

    return NextResponse.json(baths)
  } catch (error: any) {
    console.error('Error fetching spa baths:', error)
    return NextResponse.json({ error: 'Failed to fetch baths', details: error.message }, { status: 500 })
  }
}

// POST - ახალი აბაზანის დამატება
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
    const { name, nameEn, capacity, pricePerHour, description, features, imageUrl, isActive } = body

    if (!name || pricePerHour === undefined) {
      return NextResponse.json({ error: 'Name and price are required' }, { status: 400 })
    }

    const bath = await prisma.spaBath.create({
      data: {
        tenantId,
        name,
        nameEn: nameEn || null,
        capacity: capacity || 2,
        pricePerHour: Number(pricePerHour),
        description: description || null,
        features: features || [],
        imageUrl: imageUrl || null,
        isActive: isActive ?? true
      }
    })

    return NextResponse.json(bath, { status: 201 })
  } catch (error: any) {
    console.error('Error creating spa bath:', error)
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Bath with this name already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to create bath', details: error.message }, { status: 500 })
  }
}

// PUT - აბაზანების bulk update
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
        body.map(async (bath: any) => {
          // Check if it's an existing record
          if (bath.id && bath.id.length > 20) {
            return prisma.spaBath.update({
              where: { id: bath.id },
              data: {
                name: bath.name,
                nameEn: bath.nameEn || null,
                capacity: bath.capacity || 2,
                pricePerHour: Number(bath.pricePerHour || bath.price),
                description: bath.description || null,
                features: bath.features || [],
                imageUrl: bath.imageUrl || null,
                isActive: bath.isActive ?? true
              }
            })
          } else {
            // Create new
            return prisma.spaBath.create({
              data: {
                tenantId,
                name: bath.name,
                nameEn: bath.nameEn || null,
                capacity: bath.capacity || 2,
                pricePerHour: Number(bath.pricePerHour || bath.price),
                description: bath.description || null,
                features: bath.features || [],
                imageUrl: bath.imageUrl || null,
                isActive: bath.isActive ?? true
              }
            })
          }
        })
      )
      return NextResponse.json(results)
    }

    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  } catch (error: any) {
    console.error('Error updating spa baths:', error)
    return NextResponse.json({ error: 'Failed to update baths', details: error.message }, { status: 500 })
  }
}

// DELETE - აბაზანის წაშლა
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
      return NextResponse.json({ error: 'Bath ID required' }, { status: 400 })
    }

    await prisma.spaBath.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting spa bath:', error)
    return NextResponse.json({ error: 'Failed to delete bath', details: error.message }, { status: 500 })
  }
}
