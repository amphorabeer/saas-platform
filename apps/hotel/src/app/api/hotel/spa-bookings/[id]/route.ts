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

    return NextResponse.json({
      id: booking.id,
      bookingNumber: booking.bookingNumber,
      bathId: booking.bathId,
      guestName: booking.guestName,
      guestPhone: booking.guestPhone,
      guestEmail: booking.guestEmail,
      guests: booking.guests,
      date: booking.date,
      startTime: booking.startTime,
      endTime: booking.endTime,
      duration: booking.duration,
      totalPrice: Number(booking.totalPrice),
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      paymentMethod: booking.paymentMethod,
      notes: booking.notes,
      roomNumber: booking.roomNumber,
      services: booking.services,
      createdAt: booking.createdAt
    })
  } catch (error: any) {
    console.error('Error fetching spa booking:', error)
    return NextResponse.json({ error: 'Failed to fetch booking', details: error.message }, { status: 500 })
  }
}

// PUT - ჯავშნის განახლება (path param)
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

    // Verify booking belongs to tenant
    const existing = await prisma.spaBooking.findFirst({
      where: { id: params.id, tenantId }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    const body = await request.json()
    
    // Build update data dynamically
    const updateData: any = {}
    
    if (body.status !== undefined) updateData.status = body.status
    if (body.paymentStatus !== undefined) updateData.paymentStatus = body.paymentStatus
    if (body.paymentMethod !== undefined) updateData.paymentMethod = body.paymentMethod
    if (body.guestName !== undefined) updateData.guestName = body.guestName
    if (body.guestPhone !== undefined) updateData.guestPhone = body.guestPhone
    if (body.guestEmail !== undefined) updateData.guestEmail = body.guestEmail
    if (body.guestCount !== undefined) updateData.guests = body.guestCount
    if (body.guests !== undefined) updateData.guests = body.guests
    if (body.roomNumber !== undefined) updateData.roomNumber = body.roomNumber
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.price !== undefined) updateData.totalPrice = body.price
    if (body.totalPrice !== undefined) updateData.totalPrice = body.totalPrice
    if (body.startTime !== undefined) updateData.startTime = body.startTime
    if (body.endTime !== undefined) updateData.endTime = body.endTime
    if (body.date !== undefined) updateData.date = new Date(body.date)
    if (body.services !== undefined) updateData.services = body.services

    const booking = await prisma.spaBooking.update({
      where: { id: params.id },
      data: updateData
    })

    return NextResponse.json({
      id: booking.id,
      bookingNumber: booking.bookingNumber,
      guestName: booking.guestName,
      guestPhone: booking.guestPhone,
      guestEmail: booking.guestEmail,
      guests: booking.guests,
      date: booking.date,
      startTime: booking.startTime,
      endTime: booking.endTime,
      price: Number(booking.totalPrice),
      totalPrice: Number(booking.totalPrice),
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      paymentMethod: booking.paymentMethod,
      roomNumber: booking.roomNumber,
      notes: booking.notes,
      services: booking.services
    })
  } catch (error: any) {
    console.error('Error updating spa booking:', error)
    return NextResponse.json({ error: 'Failed to update booking', details: error.message }, { status: 500 })
  }
}

// DELETE - ჯავშნის გაუქმება
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

    // Verify booking belongs to tenant
    const existing = await prisma.spaBooking.findFirst({
      where: { id: params.id, tenantId }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Mark as cancelled instead of deleting
    await prisma.spaBooking.update({
      where: { id: params.id },
      data: { status: 'cancelled' }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error cancelling spa booking:', error)
    return NextResponse.json({ error: 'Failed to cancel booking', details: error.message }, { status: 500 })
  }
}
