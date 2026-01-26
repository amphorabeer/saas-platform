export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

// GET - Fetch all packages for tenant
export async function GET() {
  try {
    const { getTenantId, unauthorizedResponse } = await import('@/lib/tenant')
    const tenantId = await getTenantId()
    
    if (!tenantId) {
      return unauthorizedResponse()
    }
    
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()
    
    const packages = await prisma.hotelPackage.findMany({
      where: { organizationId: tenantId },
      orderBy: { name: 'asc' },
    })
    
    return NextResponse.json(packages)
  } catch (error: any) {
    console.error('Error loading packages:', error)
    return NextResponse.json({ error: 'Failed to load packages', details: error.message }, { status: 500 })
  }
}

// POST - Create or update package (upsert by code)
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
    const existing = await prisma.hotelPackage.findFirst({
      where: { organizationId: tenantId, code }
    })
    
    if (existing) {
      // Update existing
      const pkg = await prisma.hotelPackage.update({
        where: { id: existing.id },
        data: {
          name: data.name ?? existing.name,
          price: data.price ?? existing.price,
          description: data.description ?? existing.description,
          includedItems: data.includedItems ?? data.includes ?? existing.includedItems,
          isActive: data.isActive ?? data.active ?? existing.isActive,
          packageData: data.packageData ?? existing.packageData,
        },
      })
      return NextResponse.json(pkg)
    }
    
    // Create new
    const pkg = await prisma.hotelPackage.create({
      data: {
        organizationId: tenantId,
        name: data.name,
        code,
        price: data.price || 0,
        description: data.description || null,
        includedItems: data.includedItems || data.includes || [],
        isActive: data.isActive ?? data.active ?? true,
        packageData: data.packageData || null,
      },
    })
    
    return NextResponse.json(pkg)
  } catch (error: any) {
    console.error('Error creating package:', error)
    return NextResponse.json({ error: 'Failed to create package', details: error.message }, { status: 500 })
  }
}

// PUT - Update package
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
      return NextResponse.json({ error: 'Package ID required' }, { status: 400 })
    }
    
    const existing = await prisma.hotelPackage.findFirst({
      where: { id: data.id, organizationId: tenantId }
    })
    
    if (!existing) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 })
    }
    
    const pkg = await prisma.hotelPackage.update({
      where: { id: data.id },
      data: {
        name: data.name ?? existing.name,
        code: data.code ?? existing.code,
        price: data.price ?? existing.price,
        description: data.description ?? existing.description,
        includedItems: data.includedItems ?? data.includes ?? existing.includedItems,
        isActive: data.isActive ?? data.active ?? existing.isActive,
        packageData: data.packageData ?? existing.packageData,
      },
    })
    
    return NextResponse.json(pkg)
  } catch (error: any) {
    console.error('Error updating package:', error)
    return NextResponse.json({ error: 'Failed to update package', details: error.message }, { status: 500 })
  }
}

// DELETE - Delete package
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
      return NextResponse.json({ error: 'Package ID required' }, { status: 400 })
    }
    
    const existing = await prisma.hotelPackage.findFirst({
      where: { id, organizationId: tenantId }
    })
    
    if (!existing) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 })
    }
    
    await prisma.hotelPackage.delete({
      where: { id },
    })
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting package:', error)
    return NextResponse.json({ error: 'Failed to delete package', details: error.message }, { status: 500 })
  }
}