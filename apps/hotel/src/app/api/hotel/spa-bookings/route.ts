export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

// Generate booking number
function generateBookingNumber(type?: string): string {
  const date = new Date()
  const dateStr = date.toISOString().slice(2, 10).replace(/-/g, '')
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  const prefix = type === 'restaurant' ? 'RST' : 'SPA'
  return `${prefix}${dateStr}${random}`
}

// GET - ყველა სპა/რესტორნის ჯავშანი
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
    const type = searchParams.get('type') // 'spa' or 'restaurant'

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

    // Filter by type if specified
    let filtered = bookings
    if (type === 'restaurant') {
      filtered = bookings.filter((b: any) => 
        b.bookingNumber?.startsWith('RST') || 
        (b.services as any)?.type === 'restaurant'
      )
    } else if (type === 'spa') {
      filtered = bookings.filter((b: any) => 
        b.bookingNumber?.startsWith('SPA') || 
        !(b.services as any)?.type || 
        (b.services as any)?.type === 'spa'
      )
    }

    // Map to frontend expected format
    const mapped = filtered.map((b: any) => ({
      id: b.id,
      bookingNumber: b.bookingNumber,
      bathId: b.bathId,
      guestName: b.guestName,
      guestPhone: b.guestPhone || '',
      guestEmail: b.guestEmail || '',
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
      services: b.services || {},
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
      type, // 'spa' or 'restaurant'
      bathId, guestName, guestPhone, guestEmail, guestCount, guests,
      bookingDate, date, startTime, endTime, duration,
      price, totalPrice, notes, roomNumber, status, services
    } = body

    if (!guestName || !(bookingDate || date) || !startTime) {
      return NextResponse.json({ error: 'Required fields missing' }, { status: 400 })
    }

    const bookingNumber = generateBookingNumber(type || services?.type)
    const bookingDateValue = new Date(bookingDate || date)

    const booking = await prisma.spaBooking.create({
      data: {
        tenantId,
        bookingNumber,
        bathId: bathId || null,
        guestName,
        guestPhone: guestPhone || null,
        guestEmail: guestEmail || null,
        roomNumber: roomNumber || null,
        date: bookingDateValue,
        startTime,
        endTime: endTime || startTime,
        duration: duration || 60,
        guests: guestCount || guests || 2,
        totalPrice: price || totalPrice || 0,
        notes: notes || null,
        status: status || 'confirmed',
        paymentStatus: 'pending',
        services: services || { type: type || 'spa', source: 'pos' }
      }
    })

    return NextResponse.json({
      id: booking.id,
      bookingNumber: booking.bookingNumber,
      bathId: booking.bathId,
      guestName: booking.guestName,
      guestPhone: booking.guestPhone,
      guestEmail: booking.guestEmail,
      guestCount: booking.guests,
      guests: booking.guests,
      bookingDate: booking.date,
      date: booking.date,
      startTime: booking.startTime,
      endTime: booking.endTime,
      price: Number(booking.totalPrice),
      totalPrice: Number(booking.totalPrice),
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      notes: booking.notes,
      roomNumber: booking.roomNumber,
      services: booking.services
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating spa booking:', error)
    return NextResponse.json({ error: 'Failed to create booking', details: error.message }, { status: 500 })
  }
}

// PUT - ჯავშნის განახლება (query param-ით)
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
      where: { id },
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
