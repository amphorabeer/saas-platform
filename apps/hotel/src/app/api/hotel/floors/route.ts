export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

// GET - Fetch all floors for tenant
export async function GET() {
  try {
    const { getTenantId, unauthorizedResponse } = await import('@/lib/tenant')
    const tenantId = await getTenantId()
    
    if (!tenantId) {
      return unauthorizedResponse()
    }
    
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()
    
    const floors = await prisma.floor.findMany({
      where: { organizationId: tenantId },
      orderBy: { floorNumber: 'asc' },
    })
    
    return NextResponse.json(floors)
  } catch (error: any) {
    console.error('Error loading floors:', error)
    return NextResponse.json({ error: 'Failed to load floors', details: error.message }, { status: 500 })
  }
}

// POST - Create new floor
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
    
    const floor = await prisma.floor.create({
      data: {
        organizationId: tenantId,
        floorNumber: data.floorNumber || data.number,
        name: data.name || `სართული ${data.floorNumber || data.number}`,
        isActive: data.isActive ?? true,
        floorData: data.floorData || null,
      },
    })
    
    return NextResponse.json(floor)
  } catch (error: any) {
    console.error('Error creating floor:', error)
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Floor with this number already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to create floor', details: error.message }, { status: 500 })
  }
}

// PUT - Update floor
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
      return NextResponse.json({ error: 'Floor ID required' }, { status: 400 })
    }
    
    // Verify floor belongs to tenant
    const existing = await prisma.floor.findFirst({
      where: { id: data.id, organizationId: tenantId }
    })
    
    if (!existing) {
      return NextResponse.json({ error: 'Floor not found' }, { status: 404 })
    }
    
    const floor = await prisma.floor.update({
      where: { id: data.id },
      data: {
        floorNumber: data.floorNumber ?? data.number ?? existing.floorNumber,
        name: data.name ?? existing.name,
        isActive: data.isActive ?? existing.isActive,
        floorData: data.floorData ?? existing.floorData,
      },
    })
    
    return NextResponse.json(floor)
  } catch (error: any) {
    console.error('Error updating floor:', error)
    return NextResponse.json({ error: 'Failed to update floor', details: error.message }, { status: 500 })
  }
}

// DELETE - Delete floor
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
      return NextResponse.json({ error: 'Floor ID required' }, { status: 400 })
    }
    
    // Verify floor belongs to tenant
    const existing = await prisma.floor.findFirst({
      where: { id, organizationId: tenantId }
    })
    
    if (!existing) {
      return NextResponse.json({ error: 'Floor not found' }, { status: 404 })
    }
    
    await prisma.floor.delete({
      where: { id },
    })
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting floor:', error)
    return NextResponse.json({ error: 'Failed to delete floor', details: error.message }, { status: 500 })
  }
}
