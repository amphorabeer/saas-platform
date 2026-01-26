export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

// GET - Fetch all staff for tenant
export async function GET() {
  try {
    const { getTenantId, unauthorizedResponse } = await import('@/lib/tenant')
    const tenantId = await getTenantId()
    
    if (!tenantId) {
      return unauthorizedResponse()
    }
    
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()
    
    const staff = await prisma.hotelStaff.findMany({
      where: { organizationId: tenantId },
      orderBy: { lastName: 'asc' },
    })
    
    return NextResponse.json(staff)
  } catch (error: any) {
    console.error('Error loading staff:', error)
    return NextResponse.json({ error: 'Failed to load staff', details: error.message }, { status: 500 })
  }
}

// POST - Create or update staff member (upsert by name)
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
    
    // Try to find existing by firstName + lastName
    const existing = await prisma.hotelStaff.findFirst({
      where: { 
        organizationId: tenantId, 
        firstName: data.firstName,
        lastName: data.lastName
      }
    })
    
    if (existing) {
      // Update existing
      const staff = await prisma.hotelStaff.update({
        where: { id: existing.id },
        data: {
          position: data.position ?? existing.position,
          department: data.department ?? existing.department,
          phone: data.phone ?? existing.phone,
          email: data.email ?? existing.email,
          isActive: data.isActive ?? data.active ?? existing.isActive,
          hireDate: data.hireDate ? new Date(data.hireDate) : existing.hireDate,
          notes: data.notes ?? existing.notes,
          staffData: data.staffData ?? existing.staffData,
        },
      })
      return NextResponse.json(staff)
    }
    
    // Create new
    const staff = await prisma.hotelStaff.create({
      data: {
        organizationId: tenantId,
        firstName: data.firstName,
        lastName: data.lastName,
        position: data.position,
        department: data.department,
        phone: data.phone || null,
        email: data.email || null,
        isActive: data.isActive ?? data.active ?? true,
        hireDate: data.hireDate ? new Date(data.hireDate) : null,
        notes: data.notes || null,
        staffData: data.staffData || null,
      },
    })
    
    return NextResponse.json(staff)
  } catch (error: any) {
    console.error('Error creating staff:', error)
    return NextResponse.json({ error: 'Failed to create staff', details: error.message }, { status: 500 })
  }
}

// PUT - Update staff member
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
      return NextResponse.json({ error: 'Staff ID required' }, { status: 400 })
    }
    
    const existing = await prisma.hotelStaff.findFirst({
      where: { id: data.id, organizationId: tenantId }
    })
    
    if (!existing) {
      return NextResponse.json({ error: 'Staff not found' }, { status: 404 })
    }
    
    const staff = await prisma.hotelStaff.update({
      where: { id: data.id },
      data: {
        firstName: data.firstName ?? existing.firstName,
        lastName: data.lastName ?? existing.lastName,
        position: data.position ?? existing.position,
        department: data.department ?? existing.department,
        phone: data.phone ?? existing.phone,
        email: data.email ?? existing.email,
        isActive: data.isActive ?? data.active ?? existing.isActive,
        hireDate: data.hireDate ? new Date(data.hireDate) : existing.hireDate,
        notes: data.notes ?? existing.notes,
        staffData: data.staffData ?? existing.staffData,
      },
    })
    
    return NextResponse.json(staff)
  } catch (error: any) {
    console.error('Error updating staff:', error)
    return NextResponse.json({ error: 'Failed to update staff', details: error.message }, { status: 500 })
  }
}

// DELETE - Delete staff member
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
      return NextResponse.json({ error: 'Staff ID required' }, { status: 400 })
    }
    
    const existing = await prisma.hotelStaff.findFirst({
      where: { id, organizationId: tenantId }
    })
    
    if (!existing) {
      return NextResponse.json({ error: 'Staff not found' }, { status: 404 })
    }
    
    await prisma.hotelStaff.delete({
      where: { id },
    })
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting staff:', error)
    return NextResponse.json({ error: 'Failed to delete staff', details: error.message }, { status: 500 })
  }
}