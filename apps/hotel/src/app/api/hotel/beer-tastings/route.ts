export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

// GET - ყველა დეგუსტაციის მიღება
export async function GET() {
  try {
    const { getTenantId, unauthorizedResponse } = await import('@/lib/tenant')
    const tenantId = await getTenantId()
    
    if (!tenantId) {
      return unauthorizedResponse()
    }
    
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()

    const tastings = await prisma.beerTasting.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json(tastings)
  } catch (error: any) {
    console.error('Error fetching beer tastings:', error)
    return NextResponse.json({ error: 'Failed to fetch tastings', details: error.message }, { status: 500 })
  }
}

// POST - ახალი დეგუსტაციის დამატება
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
    const { name, nameEn, description, beers, price, duration, isActive } = body

    if (!name || price === undefined) {
      return NextResponse.json({ error: 'Name and price are required' }, { status: 400 })
    }

    const tasting = await prisma.beerTasting.create({
      data: {
        tenantId,
        name,
        nameEn: nameEn || null,
        description: description || null,
        beers: beers || [],
        price: Number(price),
        duration: duration || 30,
        isActive: isActive ?? true
      }
    })

    return NextResponse.json(tasting, { status: 201 })
  } catch (error: any) {
    console.error('Error creating beer tasting:', error)
    return NextResponse.json({ error: 'Failed to create tasting', details: error.message }, { status: 500 })
  }
}

// PUT - დეგუსტაციების bulk update
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
        body.map(async (tasting: any) => {
          if (tasting.id && tasting.id.length > 20) {
            return prisma.beerTasting.update({
              where: { id: tasting.id },
              data: {
                name: tasting.name,
                nameEn: tasting.nameEn || null,
                description: tasting.description || null,
                beers: tasting.beers || [],
                price: Number(tasting.price),
                duration: tasting.duration || 30,
                isActive: tasting.isActive ?? true
              }
            })
          } else {
            return prisma.beerTasting.create({
              data: {
                tenantId,
                name: tasting.name,
                nameEn: tasting.nameEn || null,
                description: tasting.description || null,
                beers: tasting.beers || [],
                price: Number(tasting.price),
                duration: tasting.duration || 30,
                isActive: tasting.isActive ?? true
              }
            })
          }
        })
      )
      return NextResponse.json(results)
    }

    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  } catch (error: any) {
    console.error('Error updating beer tastings:', error)
    return NextResponse.json({ error: 'Failed to update tastings', details: error.message }, { status: 500 })
  }
}

// DELETE - დეგუსტაციის წაშლა
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
      return NextResponse.json({ error: 'Tasting ID required' }, { status: 400 })
    }

    await prisma.beerTasting.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting beer tasting:', error)
    return NextResponse.json({ error: 'Failed to delete tasting', details: error.message }, { status: 500 })
  }
}
