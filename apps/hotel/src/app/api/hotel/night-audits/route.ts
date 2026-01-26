export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

// GET - Fetch all night audits or single by date
export async function GET(request: NextRequest) {
  try {
    const { getOrganizationId, unauthorizedResponse } = await import('@/lib/tenant')
    const organizationId = await getOrganizationId()
    
    if (!organizationId) {
      return unauthorizedResponse()
    }
    
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()
    
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '100')
    
    // Get single audit by date
    if (date) {
      const audit = await prisma.nightAudit.findFirst({
        where: { organizationId, date }
      })
      
      if (!audit) {
        return NextResponse.json(null)
      }
      
      return NextResponse.json(mapAuditToFrontend(audit))
    }
    
    // Get all audits
    const where: any = { organizationId }
    if (status) {
      where.status = status
    }
    
    const audits = await prisma.nightAudit.findMany({
      where,
      orderBy: { date: 'desc' },
      take: limit
    })
    
    const mapped = audits.map(mapAuditToFrontend)
    return NextResponse.json(mapped)
  } catch (error: any) {
    console.error('Error loading night audits:', error)
    return NextResponse.json({ error: 'Failed to load night audits', details: error.message }, { status: 500 })
  }
}

// POST - Create new night audit
export async function POST(request: NextRequest) {
  try {
    const { getOrganizationId, unauthorizedResponse } = await import('@/lib/tenant')
    const organizationId = await getOrganizationId()
    
    if (!organizationId) {
      return unauthorizedResponse()
    }
    
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()
    const data = await request.json()
    
    console.log('📥 POST /api/hotel/night-audits - Creating audit for:', data.date)
    
    // Check if audit for this date already exists
    const existing = await prisma.nightAudit.findFirst({
      where: { organizationId, date: data.date }
    })
    
    if (existing) {
      // Update existing
      const updated = await prisma.nightAudit.update({
        where: { id: existing.id },
        data: mapAuditToDatabase(data, organizationId)
      })
      console.log('✅ Night audit updated:', data.date)
      return NextResponse.json(mapAuditToFrontend(updated))
    }
    
    // Create new
    const created = await prisma.nightAudit.create({
      data: mapAuditToDatabase(data, organizationId)
    })
    
    console.log('✅ Night audit created:', data.date)
    return NextResponse.json(mapAuditToFrontend(created))
  } catch (error: any) {
    console.error('Error creating night audit:', error)
    return NextResponse.json({ error: 'Failed to create night audit', details: error.message }, { status: 500 })
  }
}

// PUT - Update night audit
export async function PUT(request: NextRequest) {
  try {
    const { getOrganizationId, unauthorizedResponse } = await import('@/lib/tenant')
    const organizationId = await getOrganizationId()
    
    if (!organizationId) {
      return unauthorizedResponse()
    }
    
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()
    const data = await request.json()
    
    if (!data.id && !data.date) {
      return NextResponse.json({ error: 'Audit ID or date required' }, { status: 400 })
    }
    
    // Find audit
    const existing = await prisma.nightAudit.findFirst({
      where: { 
        organizationId,
        OR: [
          { id: data.id },
          { date: data.date }
        ]
      }
    })
    
    if (!existing) {
      return NextResponse.json({ error: 'Night audit not found' }, { status: 404 })
    }
    
    const updated = await prisma.nightAudit.update({
      where: { id: existing.id },
      data: mapAuditToDatabase(data, organizationId)
    })
    
    return NextResponse.json(mapAuditToFrontend(updated))
  } catch (error: any) {
    console.error('Error updating night audit:', error)
    return NextResponse.json({ error: 'Failed to update night audit', details: error.message }, { status: 500 })
  }
}

// DELETE - Delete night audit (reverse)
export async function DELETE(request: NextRequest) {
  try {
    const { getOrganizationId, unauthorizedResponse } = await import('@/lib/tenant')
    const organizationId = await getOrganizationId()
    
    if (!organizationId) {
      return unauthorizedResponse()
    }
    
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()
    
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const date = searchParams.get('date')
    
    if (!id && !date) {
      return NextResponse.json({ error: 'Audit ID or date required' }, { status: 400 })
    }
    
    // Find audit
    const existing = await prisma.nightAudit.findFirst({
      where: { 
        organizationId,
        OR: [
          ...(id ? [{ id }] : []),
          ...(date ? [{ date }] : [])
        ]
      }
    })
    
    if (!existing) {
      return NextResponse.json({ error: 'Night audit not found' }, { status: 404 })
    }
    
    await prisma.nightAudit.delete({ where: { id: existing.id } })
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting night audit:', error)
    return NextResponse.json({ error: 'Failed to delete night audit', details: error.message }, { status: 500 })
  }
}

// Helper: Map database audit to frontend format
function mapAuditToFrontend(audit: any) {
  const auditData = audit.auditData || {}
  
  return {
    id: audit.id,
    date: audit.date,
    status: audit.status,
    completedAt: audit.completedAt?.toISOString(),
    closedAt: audit.closedAt?.toISOString(),
    closedBy: audit.closedBy,
    user: audit.user,
    
    // Stats
    checkIns: audit.checkIns,
    checkOuts: audit.checkOuts,
    noShows: audit.noShows,
    totalRooms: audit.totalRooms,
    occupiedRooms: audit.occupiedRooms,
    occupancy: audit.occupancy,
    revenue: audit.revenue,
    
    // Posting details
    roomChargesPosted: audit.roomChargesPosted,
    roomChargeTotal: audit.roomChargeTotal,
    packagesPosted: audit.packagesPosted,
    packageTotal: audit.packageTotal,
    foliosClosed: audit.foliosClosed,
    
    // Financial
    paymentsTotal: audit.paymentsTotal,
    taxesTotal: audit.taxesTotal,
    outstanding: audit.outstanding,
    
    // Extra data from JSON
    ...auditData
  }
}

// Helper: Map frontend audit to database format
function mapAuditToDatabase(data: any, organizationId: string) {
  return {
    organizationId,
    date: data.date,
    status: data.status || 'completed',
    completedAt: data.completedAt ? new Date(data.completedAt) : new Date(),
    closedAt: data.closedAt ? new Date(data.closedAt) : null,
    closedBy: data.closedBy || null,
    user: data.user || null,
    
    // Stats
    checkIns: Number(data.checkIns || 0),
    checkOuts: Number(data.checkOuts || 0),
    noShows: Number(data.noShows || 0),
    totalRooms: Number(data.totalRooms || 0),
    occupiedRooms: Number(data.occupiedRooms || 0),
    occupancy: Number(data.occupancy || 0),
    revenue: Number(data.revenue || 0),
    
    // Posting details
    roomChargesPosted: Number(data.roomChargesPosted || 0),
    roomChargeTotal: Number(data.roomChargeTotal || 0),
    packagesPosted: Number(data.packagesPosted || 0),
    packageTotal: Number(data.packageTotal || 0),
    foliosClosed: Number(data.foliosClosed || 0),
    
    // Financial
    paymentsTotal: Number(data.paymentsTotal || 0),
    taxesTotal: Number(data.taxesTotal || 0),
    outstanding: Number(data.outstanding || 0),
    
    // Store extra data as JSON
    auditData: {
      reservations: data.reservations,
      transactions: data.transactions,
      folios: data.folios,
      summary: data.summary,
      steps: data.steps,
      errors: data.errors
    }
  }
}