export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

// GET - Fetch all taxes for tenant
export async function GET() {
  try {
    const { getTenantId, unauthorizedResponse } = await import('@/lib/tenant')
    const tenantId = await getTenantId()
    
    if (!tenantId) {
      return unauthorizedResponse()
    }
    
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()
    
    const taxes = await prisma.hotelTax.findMany({
      where: { organizationId: tenantId },
      orderBy: { name: 'asc' },
    })
    
    return NextResponse.json(taxes)
  } catch (error: any) {
    console.error('Error loading taxes:', error)
    return NextResponse.json({ error: 'Failed to load taxes', details: error.message }, { status: 500 })
  }
}

// POST - Create or update tax (upsert by code)
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
    
    // Try to find existing by code
    const existing = await prisma.hotelTax.findFirst({
      where: { organizationId: tenantId, code: data.code }
    })
    
    if (existing) {
      // Update existing
      const tax = await prisma.hotelTax.update({
        where: { id: existing.id },
        data: {
          name: data.name ?? existing.name,
          rate: data.rate ?? existing.rate,
          isActive: data.isActive ?? existing.isActive,
          isIncluded: data.isIncluded ?? existing.isIncluded,
          taxData: data.taxData ?? existing.taxData,
        },
      })
      return NextResponse.json(tax)
    }
    
    // Create new
    const tax = await prisma.hotelTax.create({
      data: {
        organizationId: tenantId,
        name: data.name,
        code: data.code,
        rate: data.rate || 0,
        isActive: data.isActive ?? true,
        isIncluded: data.isIncluded ?? false,
        taxData: data.taxData || null,
      },
    })
    
    return NextResponse.json(tax)
  } catch (error: any) {
    console.error('Error creating tax:', error)
    return NextResponse.json({ error: 'Failed to create tax', details: error.message }, { status: 500 })
  }
}

// PUT - Update tax
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
    
    if (!data.id && !data.code) {
      return NextResponse.json({ error: 'Tax ID or code required' }, { status: 400 })
    }
    
    const existing = await prisma.hotelTax.findFirst({
      where: data.id 
        ? { id: data.id, organizationId: tenantId }
        : { code: data.code, organizationId: tenantId }
    })
    
    if (!existing) {
      return NextResponse.json({ error: 'Tax not found' }, { status: 404 })
    }
    
    const tax = await prisma.hotelTax.update({
      where: { id: existing.id },
      data: {
        name: data.name ?? existing.name,
        code: data.code ?? existing.code,
        rate: data.rate ?? existing.rate,
        isActive: data.isActive ?? existing.isActive,
        isIncluded: data.isIncluded ?? existing.isIncluded,
        taxData: data.taxData ?? existing.taxData,
      },
    })
    
    return NextResponse.json(tax)
  } catch (error: any) {
    console.error('Error updating tax:', error)
    return NextResponse.json({ error: 'Failed to update tax', details: error.message }, { status: 500 })
  }
}

// DELETE - Delete tax
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
      return NextResponse.json({ error: 'Tax ID required' }, { status: 400 })
    }
    
    const existing = await prisma.hotelTax.findFirst({
      where: { id, organizationId: tenantId }
    })
    
    if (!existing) {
      return NextResponse.json({ error: 'Tax not found' }, { status: 404 })
    }
    
    await prisma.hotelTax.delete({
      where: { id },
    })
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting tax:', error)
    return NextResponse.json({ error: 'Failed to delete tax', details: error.message }, { status: 500 })
  }
}