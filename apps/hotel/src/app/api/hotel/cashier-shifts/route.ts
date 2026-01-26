export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

// GET - Fetch all shifts or single by id/status
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
    const status = searchParams.get('status')
    const cashierId = searchParams.get('cashierId')
    const current = searchParams.get('current') // Get current open shift
    
    // Get single shift by id
    if (id) {
      const shift = await prisma.cashierShift.findFirst({
        where: { id, organizationId }
      })
      
      if (!shift) {
        return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
      }
      
      return NextResponse.json(mapShiftToFrontend(shift))
    }
    
    // Get current open shift
    if (current === 'true') {
      const shift = await prisma.cashierShift.findFirst({
        where: { organizationId, status: 'open' },
        orderBy: { openedAt: 'desc' }
      })
      
      return NextResponse.json(shift ? mapShiftToFrontend(shift) : null)
    }
    
    // Get all shifts with optional filters
    const where: any = { organizationId }
    if (status) where.status = status
    if (cashierId) where.cashierId = cashierId
    
    const shifts = await prisma.cashierShift.findMany({
      where,
      orderBy: { openedAt: 'desc' },
      take: 100
    })
    
    const mapped = shifts.map(mapShiftToFrontend)
    return NextResponse.json(mapped)
  } catch (error: any) {
    console.error('Error loading cashier shifts:', error)
    return NextResponse.json({ error: 'Failed to load shifts', details: error.message }, { status: 500 })
  }
}

// POST - Open new shift
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
    
    console.log('📥 POST /api/hotel/cashier-shifts - Opening shift for:', data.cashierName)
    
    // Check if there's already an open shift
    const existingOpen = await prisma.cashierShift.findFirst({
      where: { organizationId, status: 'open' }
    })
    
    if (existingOpen) {
      return NextResponse.json({ 
        error: 'There is already an open shift', 
        existingShift: mapShiftToFrontend(existingOpen) 
      }, { status: 400 })
    }
    
    // Generate shift number
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '')
    const count = await prisma.cashierShift.count({
      where: { organizationId }
    })
    const shiftNumber = `SH${today}-${String(count + 1).padStart(4, '0')}`
    
    // Create new shift
    const created = await prisma.cashierShift.create({
      data: {
        organizationId,
        shiftNumber,
        cashierName: data.cashierName,
        cashierId: data.cashierId || null,
        status: 'open',
        openedAt: new Date(),
        openingBalance: Number(data.openingBalance || 0),
        totalCashIn: 0,
        totalCashOut: 0,
        totalCard: 0,
        totalBank: 0,
        transactions: [],
        shiftData: data.shiftData || {}
      }
    })
    
    console.log('✅ Shift opened:', shiftNumber)
    return NextResponse.json(mapShiftToFrontend(created))
  } catch (error: any) {
    console.error('Error opening shift:', error)
    return NextResponse.json({ error: 'Failed to open shift', details: error.message }, { status: 500 })
  }
}

// PUT - Update shift (add transaction, close shift)
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
      return NextResponse.json({ error: 'Shift ID required' }, { status: 400 })
    }
    
    // Find shift
    const existing = await prisma.cashierShift.findFirst({
      where: { id: data.id, organizationId }
    })
    
    if (!existing) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
    }
    
    // Prepare update data
    const updateData: any = {}
    
    // Close shift
    if (data.action === 'close') {
      updateData.status = 'closed'
      updateData.closedAt = new Date()
      updateData.closingBalance = Number(data.closingBalance || 0)
    }
    
    // Update totals
    if (data.totalCashIn !== undefined) updateData.totalCashIn = Number(data.totalCashIn)
    if (data.totalCashOut !== undefined) updateData.totalCashOut = Number(data.totalCashOut)
    if (data.totalCard !== undefined) updateData.totalCard = Number(data.totalCard)
    if (data.totalBank !== undefined) updateData.totalBank = Number(data.totalBank)
    
    // Update transactions
    if (data.transactions !== undefined) updateData.transactions = data.transactions
    if (data.shiftData !== undefined) updateData.shiftData = data.shiftData
    
    const updated = await prisma.cashierShift.update({
      where: { id: data.id },
      data: updateData
    })
    
    return NextResponse.json(mapShiftToFrontend(updated))
  } catch (error: any) {
    console.error('Error updating shift:', error)
    return NextResponse.json({ error: 'Failed to update shift', details: error.message }, { status: 500 })
  }
}

// DELETE - Delete shift (admin only)
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
      return NextResponse.json({ error: 'Shift ID required' }, { status: 400 })
    }
    
    // Find shift
    const existing = await prisma.cashierShift.findFirst({
      where: { id, organizationId }
    })
    
    if (!existing) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
    }
    
    await prisma.cashierShift.delete({ where: { id } })
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting shift:', error)
    return NextResponse.json({ error: 'Failed to delete shift', details: error.message }, { status: 500 })
  }
}

// Helper: Map database shift to frontend format
function mapShiftToFrontend(shift: any) {
  return {
    id: shift.id,
    shiftNumber: shift.shiftNumber,
    cashierName: shift.cashierName,
    cashierId: shift.cashierId,
    status: shift.status,
    
    openedAt: shift.openedAt?.toISOString(),
    openingBalance: shift.openingBalance,
    
    closedAt: shift.closedAt?.toISOString(),
    closingBalance: shift.closingBalance,
    
    totalCashIn: shift.totalCashIn,
    totalCashOut: shift.totalCashOut,
    totalCard: shift.totalCard,
    totalBank: shift.totalBank,
    
    transactions: shift.transactions || [],
    ...(shift.shiftData || {})
  }
}