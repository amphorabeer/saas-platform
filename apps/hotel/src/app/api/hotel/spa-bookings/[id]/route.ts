export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

// GET - ერთი ჯავშანი
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { getTenantId, unauthorizedResponse } = await import('@/lib/tenant')
    const tenantId = await getTenantId()
    
    if (!tenantId) {
      return unauthorizedResponse()
    }
    
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()

    const booking = await prisma.spaBooking.findFirst({
      where: { id: params.id, tenantId }
    })

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    return NextResponse.json(booking)
  } catch (error: any) {
    console.error('Error fetching spa booking:', error)
    return NextResponse.json({ error: 'Failed to fetch booking', details: error.message }, { status: 500 })
  }
}

// PUT - ჯავშნის განახლება
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { getTenantId, unauthorizedResponse } = await import('@/lib/tenant')
    const tenantId = await getTenantId()
    
    if (!tenantId) {
      return unauthorizedResponse()
    }
    
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()

    const body = await request.json()
    
    // Only update provided fields
    const updateData: any = {}
    if (body.bathId !== undefined) updateData.bathId = body.bathId
    if (body.guestName !== undefined) updateData.guestName = body.guestName
    if (body.guestPhone !== undefined) updateData.guestPhone = body.guestPhone
    if (body.guestEmail !== undefined) updateData.guestEmail = body.guestEmail
    if (body.roomNumber !== undefined) updateData.roomNumber = body.roomNumber
    if (body.date !== undefined) updateData.date = new Date(body.date)
    if (body.startTime !== undefined) updateData.startTime = body.startTime
    if (body.endTime !== undefined) updateData.endTime = body.endTime
    if (body.duration !== undefined) updateData.duration = body.duration
    if (body.guests !== undefined) updateData.guests = body.guests
    if (body.totalPrice !== undefined) updateData.totalPrice = Number(body.totalPrice)
    if (body.status !== undefined) updateData.status = body.status
    if (body.paymentStatus !== undefined) updateData.paymentStatus = body.paymentStatus
    if (body.paymentMethod !== undefined) updateData.paymentMethod = body.paymentMethod
    if (body.paidAt !== undefined) updateData.paidAt = new Date(body.paidAt)
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.services !== undefined) updateData.services = body.services

    const booking = await prisma.spaBooking.update({
      where: { id: params.id },
      data: updateData
    })

    return NextResponse.json(booking)
  } catch (error: any) {
    console.error('Error updating spa booking:', error)
    return NextResponse.json({ error: 'Failed to update booking', details: error.message }, { status: 500 })
  }
}

// DELETE - ჯავშნის წაშლა
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { getTenantId, unauthorizedResponse } = await import('@/lib/tenant')
    const tenantId = await getTenantId()
    
    if (!tenantId) {
      return unauthorizedResponse()
    }
    
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()

    await prisma.spaBooking.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting spa booking:', error)
    return NextResponse.json({ error: 'Failed to delete booking', details: error.message }, { status: 500 })
  }
}
