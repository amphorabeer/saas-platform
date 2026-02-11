export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

// Generate booking number
function generateBookingNumber(): string {
  const date = new Date()
  const dateStr = date.toISOString().slice(2, 10).replace(/-/g, '')
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `SPA-${dateStr}-${random}`
}

// GET - ყველა სპა ჯავშანი
export async function GET(request: NextRequest) {
  try {
    const { getTenantId, unauthorizedResponse } = await import('@/lib/tenant')
    const tenantId = await getTenantId()
    
    if (!tenantId) {
      return unauthorizedResponse()
    }
    
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()
    
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const status = searchParams.get('status')

    const where: any = { tenantId }
    if (date) where.date = new Date(date)
    if (status) where.status = status

    const bookings = await prisma.spaBooking.findMany({
      where,
      orderBy: [
        { date: 'desc' },
        { startTime: 'asc' }
      ]
    })

    // Map to frontend expected format
    const mapped = bookings.map((b: any) => ({
      id: b.id,
      bookingNumber: b.bookingNumber,
      bathId: b.bathId,
      guestName: b.guestName,
      guestPhone: b.guestPhone || '',
      guestCount: b.guests,
      guests: b.guests,
      bookingDate: b.date,
      date: b.date,
      startTime: b.startTime,
      endTime: b.endTime,
      duration: b.duration,
      price: Number(b.totalPrice),
      totalPrice: Number(b.totalPrice),
      status: b.status,
      paymentStatus: b.paymentStatus,
      paymentMethod: b.paymentMethod,
      notes: b.notes || '',
      roomNumber: b.roomNumber,
      reservationId: b.reservationId,
      createdAt: b.createdAt
    }))

    return NextResponse.json(mapped)
  } catch (error: any) {
    console.error('Error fetching spa bookings:', error)
    return NextResponse.json({ error: 'Failed to fetch bookings', details: error.message }, { status: 500 })
  }
}

// POST - ახალი ჯავშანი
export async function POST(request: NextRequest) {
  try {
    const { getTenantId, unauthorizedResponse } = await import('@/lib/tenant')
    const tenantId = await getTenantId()
    
    if (!tenantId) {
      return unauthorizedResponse()
    }
    
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()
    
    const body = await request.json()
    const { 
      bathId, guestName, guestPhone, guestCount, guests,
      bookingDate, date, startTime, endTime, duration,
      price, totalPrice, notes, roomNumber, status 
    } = body

    if (!guestName || !(bookingDate || date) || !startTime) {
      return NextResponse.json({ error: 'Required fields missing' }, { status: 400 })
    }

    const bookingNumber = generateBookingNumber()
    const bookingDateValue = new Date(bookingDate || date)

    const booking = await prisma.spaBooking.create({
      data: {
        tenantId,
        bookingNumber,
        bathId: bathId || null,
        guestName,
        guestPhone: guestPhone || null,
        roomNumber: roomNumber || null,
        date: bookingDateValue,
        startTime,
        endTime: endTime || startTime,
        duration: duration || 60,
        guests: guestCount || guests || 2,
        totalPrice: price || totalPrice || 0,
        notes: notes || null,
        status: status || 'confirmed',
        paymentStatus: 'pending'
      }
    })

    return NextResponse.json({
      id: booking.id,
      bookingNumber: booking.bookingNumber,
      bathId: booking.bathId,
      guestName: booking.guestName,
      guestPhone: booking.guestPhone,
      guestCount: booking.guests,
      bookingDate: booking.date,
      date: booking.date,
      startTime: booking.startTime,
      endTime: booking.endTime,
      price: Number(booking.totalPrice),
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      notes: booking.notes,
      roomNumber: booking.roomNumber
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating spa booking:', error)
    return NextResponse.json({ error: 'Failed to create booking', details: error.message }, { status: 500 })
  }
}

// PUT - ჯავშნის განახლება
export async function PUT(request: NextRequest) {
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
      return NextResponse.json({ error: 'Booking ID required' }, { status: 400 })
    }

    const body = await request.json()
    
    // Build update data dynamically - map frontend fields to schema fields
    const updateData: any = {}
    
    if (body.status !== undefined) updateData.status = body.status
    if (body.paymentStatus !== undefined) updateData.paymentStatus = body.paymentStatus
    if (body.paymentMethod !== undefined) updateData.paymentMethod = body.paymentMethod
    if (body.guestName !== undefined) updateData.guestName = body.guestName
    if (body.guestPhone !== undefined) updateData.guestPhone = body.guestPhone
    if (body.guestCount !== undefined) updateData.guests = body.guestCount
    if (body.guests !== undefined) updateData.guests = body.guests
    if (body.roomNumber !== undefined) updateData.roomNumber = body.roomNumber
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.price !== undefined) updateData.totalPrice = body.price
    if (body.totalPrice !== undefined) updateData.totalPrice = body.totalPrice

    const booking = await prisma.spaBooking.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json({
      id: booking.id,
      bookingNumber: booking.bookingNumber,
      guestName: booking.guestName,
      guestCount: booking.guests,
      price: Number(booking.totalPrice),
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      paymentMethod: booking.paymentMethod,
      roomNumber: booking.roomNumber
    })
  } catch (error: any) {
    console.error('Error updating spa booking:', error)
    return NextResponse.json({ error: 'Failed to update booking', details: error.message }, { status: 500 })
  }
}

// DELETE - ჯავშნის წაშლა/გაუქმება
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
      return NextResponse.json({ error: 'Booking ID required' }, { status: 400 })
    }

    // Instead of deleting, mark as cancelled
    await prisma.spaBooking.update({
      where: { id },
      data: { status: 'cancelled' }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error cancelling spa booking:', error)
    return NextResponse.json({ error: 'Failed to cancel booking', details: error.message }, { status: 500 })
  }
}