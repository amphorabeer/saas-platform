export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

// GET - Fetch all folios or single folio by id/reservationId
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
    const id = searchParams.get('id')
    const reservationId = searchParams.get('reservationId')
    const status = searchParams.get('status')
    
    // Get single folio by id
    if (id) {
      const folio = await prisma.folio.findFirst({
        where: { id, organizationId }
      })
      
      if (!folio) {
        return NextResponse.json({ error: 'Folio not found' }, { status: 404 })
      }
      
      // Map to frontend format
      const mapped = mapFolioToFrontend(folio)
      return NextResponse.json(mapped)
    }
    
    // Get folio by reservationId
    if (reservationId) {
      const folio = await prisma.folio.findFirst({
        where: { reservationId, organizationId }
      })
      
      if (!folio) {
        return NextResponse.json(null)
      }
      
      const mapped = mapFolioToFrontend(folio)
      return NextResponse.json(mapped)
    }
    
    // Get all folios with optional status filter
    const where: any = { organizationId }
    if (status) {
      where.status = status
    }
    
    const folios = await prisma.folio.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 500 // Limit for performance
    })
    
    const mapped = folios.map(mapFolioToFrontend)
    return NextResponse.json({ folios: mapped })
  } catch (error: any) {
    console.error('Error loading folios:', error)
    return NextResponse.json({ error: 'Failed to load folios', details: error.message }, { status: 500 })
  }
}

// POST - Create new folio
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
    
    console.log('📥 POST /api/hotel/folios - Creating folio:', data.folioNumber)
    
    // Check if folio with same folioNumber exists
    const existing = await prisma.folio.findFirst({
      where: { organizationId, folioNumber: data.folioNumber }
    })
    
    if (existing) {
      // Update existing
      const updated = await prisma.folio.update({
        where: { id: existing.id },
        data: mapFolioToDatabase(data, organizationId)
      })
      return NextResponse.json(mapFolioToFrontend(updated))
    }
    
    // Create new
    const created = await prisma.folio.create({
      data: mapFolioToDatabase(data, organizationId)
    })
    
    console.log('✅ Folio created:', created.folioNumber)
    return NextResponse.json(mapFolioToFrontend(created))
  } catch (error: any) {
    console.error('Error creating folio:', error)
    return NextResponse.json({ error: 'Failed to create folio', details: error.message }, { status: 500 })
  }
}

// PUT - Update folio
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
    
    if (!data.id) {
      return NextResponse.json({ error: 'Folio ID required' }, { status: 400 })
    }
    
    // Verify folio belongs to organization
    const existing = await prisma.folio.findFirst({
      where: { id: data.id, organizationId }
    })
    
    if (!existing) {
      return NextResponse.json({ error: 'Folio not found' }, { status: 404 })
    }
    
    const updated = await prisma.folio.update({
      where: { id: data.id },
      data: mapFolioToDatabase(data, organizationId)
    })
    
    return NextResponse.json(mapFolioToFrontend(updated))
  } catch (error: any) {
    console.error('Error updating folio:', error)
    return NextResponse.json({ error: 'Failed to update folio', details: error.message }, { status: 500 })
  }
}

// DELETE - Delete folio
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
    
    if (!id) {
      return NextResponse.json({ error: 'Folio ID required' }, { status: 400 })
    }
    
    // Verify folio belongs to organization
    const existing = await prisma.folio.findFirst({
      where: { id, organizationId }
    })
    
    if (!existing) {
      return NextResponse.json({ error: 'Folio not found' }, { status: 404 })
    }
    
    await prisma.folio.delete({ where: { id } })
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting folio:', error)
    return NextResponse.json({ error: 'Failed to delete folio', details: error.message }, { status: 500 })
  }
}

// Helper: Map database folio to frontend format
function mapFolioToFrontend(folio: any) {
  const folioData = folio.folioData || {}
  const charges = folio.charges || []
  const payments = folio.payments || []
  
  // Check if transactions are stored in folioData (legacy format)
  if (folioData.transactions && Array.isArray(folioData.transactions) && folioData.transactions.length > 0) {
    // Use transactions directly from folioData
    return {
      id: folio.id,
      folioNumber: folio.folioNumber,
      reservationId: folio.reservationId,
      guestName: folio.guestName,
      roomNumber: folio.roomNumber,
      balance: folio.balance,
      creditLimit: folioData.creditLimit || 5000,
      paymentMethod: folioData.paymentMethod || 'cash',
      status: folio.status,
      openDate: folio.createdAt?.toISOString().split('T')[0] || folioData.openDate,
      closeDate: folio.closedAt?.toISOString().split('T')[0] || folioData.closeDate,
      checkIn: folio.checkIn?.toISOString().split('T')[0] || folioData.checkIn,
      checkOut: folio.checkOut?.toISOString().split('T')[0] || folioData.checkOut,
      transactions: folioData.transactions,
      routingInstructions: folioData.routingInstructions || [],
      masterFolioId: folioData.masterFolioId,
      companyId: folioData.companyId,
      initialRoomCharge: folioData.initialRoomCharge || null,
      totalCharges: folio.totalCharges,
      totalPayments: folio.totalPayments
    }
  }
  
  // Reconstruct transactions from charges and payments
  const transactions = [
    ...charges.map((c: any) => ({ ...c, type: c.type || 'charge' })),
    ...payments.map((p: any) => ({ ...p, type: p.type || 'payment' }))
  ].sort((a: any, b: any) => {
    const dateA = new Date(`${a.date} ${a.time || '00:00'}`).getTime()
    const dateB = new Date(`${b.date} ${b.time || '00:00'}`).getTime()
    return dateA - dateB
  })
  
  return {
    id: folio.id,
    folioNumber: folio.folioNumber,
    reservationId: folio.reservationId,
    guestName: folio.guestName,
    roomNumber: folio.roomNumber,
    balance: folio.balance,
    creditLimit: folioData.creditLimit || 5000,
    paymentMethod: folioData.paymentMethod || 'cash',
    status: folio.status,
    openDate: folio.createdAt?.toISOString().split('T')[0] || folioData.openDate,
    closeDate: folio.closedAt?.toISOString().split('T')[0] || folioData.closeDate,
    checkIn: folio.checkIn?.toISOString().split('T')[0] || folioData.checkIn,
    checkOut: folio.checkOut?.toISOString().split('T')[0] || folioData.checkOut,
    transactions,
    routingInstructions: folioData.routingInstructions || [],
    masterFolioId: folioData.masterFolioId,
    companyId: folioData.companyId,
    initialRoomCharge: folioData.initialRoomCharge || null,
    totalCharges: folio.totalCharges,
    totalPayments: folio.totalPayments
  }
}

// Helper: Map frontend folio to database format
function mapFolioToDatabase(data: any, organizationId: string) {
  // Separate transactions into charges and payments
  const transactions = data.transactions || []
  const charges = transactions.filter((t: any) => 
    t.type === 'charge' || t.type === 'adjustment' || t.debit > 0
  )
  const payments = transactions.filter((t: any) => 
    t.type === 'payment' || t.credit > 0
  )
  
  const totalCharges = charges.reduce((sum: number, t: any) => sum + Number(t.debit || 0), 0)
  const totalPayments = payments.reduce((sum: number, t: any) => sum + Number(t.credit || 0), 0)
  
  // Ensure balance is a number
  let balance = data.balance
  if (typeof balance === 'string') {
    balance = parseFloat(balance) || 0
  }
  if (balance === null || balance === undefined) {
    balance = totalCharges - totalPayments
  }
  
  return {
    organizationId,
    folioNumber: data.folioNumber,
    guestName: data.guestName,
    roomNumber: data.roomNumber || null,
    reservationId: data.reservationId || null,
    status: data.status || 'open',
    folioType: data.folioType || 'guest',
    totalCharges: Number(totalCharges),
    totalPayments: Number(totalPayments),
    balance: Number(balance),
    checkIn: data.checkIn ? new Date(data.checkIn) : null,
    checkOut: data.checkOut ? new Date(data.checkOut) : null,
    closedAt: data.status === 'closed' && data.closeDate ? new Date(data.closeDate) : null,
    charges,
    payments,
    folioData: {
      creditLimit: data.creditLimit,
      paymentMethod: data.paymentMethod,
      openDate: data.openDate,
      closeDate: data.closeDate,
      routingInstructions: data.routingInstructions,
      masterFolioId: data.masterFolioId,
      companyId: data.companyId,
      // Store initial room charge info
      initialRoomCharge: data.initialRoomCharge || null,
      transactions: data.transactions || []
    }
  }
}