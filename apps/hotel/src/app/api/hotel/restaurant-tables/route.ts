export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

// GET - ყველა მაგიდის მიღება
export async function GET() {
  try {
    const { getTenantId, unauthorizedResponse } = await import('@/lib/tenant')
    const tenantId = await getTenantId()
    
    if (!tenantId) {
      return unauthorizedResponse()
    }
    
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()

    const tables = await prisma.restaurantTable.findMany({
      where: { tenantId },
      orderBy: { number: 'asc' }
    })

    return NextResponse.json(tables)
  } catch (error: any) {
    console.error('Error fetching tables:', error)
    return NextResponse.json({ error: 'Failed to fetch tables', details: error.message }, { status: 500 })
  }
}

// POST - ახალი მაგიდის დამატება
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
    const { number, seats, zone, shape, status } = body

    if (!number) {
      return NextResponse.json({ error: 'Table number is required' }, { status: 400 })
    }

    const table = await prisma.restaurantTable.create({
      data: {
        tenantId,
        number,
        seats: seats || 4,
        zone: zone || 'inside',
        shape: shape || 'rect',
        status: status || 'available',
        isActive: true
      }
    })

    return NextResponse.json(table, { status: 201 })
  } catch (error: any) {
    console.error('Error creating table:', error)
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Table with this number already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to create table', details: error.message }, { status: 500 })
  }
}

// PUT - მაგიდების bulk update
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
        body.map(async (table: any) => {
          // Use upsert - update if exists by tenantId+number, create if not
          return prisma.restaurantTable.upsert({
            where: {
              tenantId_number: {
                tenantId,
                number: table.number
              }
            },
            update: {
              seats: table.seats || 4,
              zone: table.zone || 'inside',
              shape: table.shape || 'rect',
              status: table.status || 'available',
              isActive: table.isActive ?? true
            },
            create: {
              tenantId,
              number: table.number,
              seats: table.seats || 4,
              zone: table.zone || 'inside',
              shape: table.shape || 'rect',
              status: table.status || 'available',
              isActive: true
            }
          })
        })
      )
      return NextResponse.json(results)
    }

    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  } catch (error: any) {
    console.error('Error updating tables:', error)
    return NextResponse.json({ error: 'Failed to update tables', details: error.message }, { status: 500 })
  }
}

// DELETE - მაგიდის წაშლა
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
      return NextResponse.json({ error: 'Table ID required' }, { status: 400 })
    }

    await prisma.restaurantTable.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting table:', error)
    return NextResponse.json({ error: 'Failed to delete table', details: error.message }, { status: 500 })
  }
}