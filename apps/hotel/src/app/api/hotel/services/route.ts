export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

// GET - Fetch all services for tenant
export async function GET() {
  try {
    const { getTenantId, unauthorizedResponse } = await import('@/lib/tenant')
    const tenantId = await getTenantId()
    
    if (!tenantId) {
      return unauthorizedResponse()
    }
    
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()
    
    const services = await prisma.hotelService.findMany({
      where: { organizationId: tenantId },
      orderBy: { name: 'asc' },
    })
    
    return NextResponse.json(services)
  } catch (error: any) {
    console.error('Error loading services:', error)
    return NextResponse.json({ error: 'Failed to load services', details: error.message }, { status: 500 })
  }
}

// POST - Create or update service (upsert by code)
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
    
    const code = data.code || data.name?.toUpperCase().replace(/\s+/g, '_').slice(0, 20)
    
    // Try to find existing by code
    const existing = await prisma.hotelService.findFirst({
      where: { organizationId: tenantId, code }
    })
    
    if (existing) {
      // Update existing
      const service = await prisma.hotelService.update({
        where: { id: existing.id },
        data: {
          name: data.name ?? existing.name,
          price: data.price ?? existing.price,
          category: data.category ?? existing.category,
          description: data.description ?? existing.description,
          isActive: data.isActive ?? data.available ?? existing.isActive,
          serviceData: data.serviceData ?? existing.serviceData,
        },
      })
      return NextResponse.json(service)
    }
    
    // Create new
    const service = await prisma.hotelService.create({
      data: {
        organizationId: tenantId,
        name: data.name,
        code,
        price: data.price || 0,
        category: data.category || null,
        description: data.description || null,
        isActive: data.isActive ?? data.available ?? true,
        serviceData: data.serviceData || null,
      },
    })
    
    return NextResponse.json(service)
  } catch (error: any) {
    console.error('Error creating service:', error)
    return NextResponse.json({ error: 'Failed to create service', details: error.message }, { status: 500 })
  }
}

// PUT - Update service
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
      return NextResponse.json({ error: 'Service ID required' }, { status: 400 })
    }
    
    const existing = await prisma.hotelService.findFirst({
      where: { id: data.id, organizationId: tenantId }
    })
    
    if (!existing) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }
    
    const service = await prisma.hotelService.update({
      where: { id: data.id },
      data: {
        name: data.name ?? existing.name,
        code: data.code ?? existing.code,
        price: data.price ?? existing.price,
        category: data.category ?? existing.category,
        description: data.description ?? existing.description,
        isActive: data.isActive ?? data.active ?? existing.isActive,
        serviceData: data.serviceData ?? existing.serviceData,
      },
    })
    
    return NextResponse.json(service)
  } catch (error: any) {
    console.error('Error updating service:', error)
    return NextResponse.json({ error: 'Failed to update service', details: error.message }, { status: 500 })
  }
}

// DELETE - Delete service
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
      return NextResponse.json({ error: 'Service ID required' }, { status: 400 })
    }
    
    const existing = await prisma.hotelService.findFirst({
      where: { id, organizationId: tenantId }
    })
    
    if (!existing) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }
    
    await prisma.hotelService.delete({
      where: { id },
    })
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting service:', error)
    return NextResponse.json({ error: 'Failed to delete service', details: error.message }, { status: 500 })
  }
}