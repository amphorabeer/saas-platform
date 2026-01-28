export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import moment from 'moment'

// CORS headers for public API
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Hotel-ID',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const {
      hotelId,
      roomId,
      checkIn,
      checkOut,
      guest,
      adults = 2,
      children = 0,
      specialRequests,
      paymentMethod = 'pay_at_hotel'
    } = body
    
    // Validate required fields
    const errors: string[] = []
    if (!hotelId) errors.push('hotelId is required')
    if (!roomId) errors.push('roomId is required')
    if (!checkIn) errors.push('checkIn is required')
    if (!checkOut) errors.push('checkOut is required')
    if (!guest) errors.push('guest information is required')
    if (guest && !guest.firstName) errors.push('guest.firstName is required')
    if (guest && !guest.lastName) errors.push('guest.lastName is required')
    if (guest && !guest.email) errors.push('guest.email is required')
    if (guest && !guest.phone) errors.push('guest.phone is required')
    
    if (errors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', details: errors },
        { status: 400, headers: corsHeaders }
      )
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(guest.email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400, headers: corsHeaders }
      )
    }
    
    const checkInDate = moment(checkIn)
    const checkOutDate = moment(checkOut)
    
    if (!checkInDate.isValid() || !checkOutDate.isValid()) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400, headers: corsHeaders }
      )
    }
    
    if (checkInDate.isBefore(moment().startOf('day'))) {
      return NextResponse.json(
        { error: 'checkIn date cannot be in the past' },
        { status: 400, headers: corsHeaders }
      )
    }
    
    if (checkOutDate.isSameOrBefore(checkInDate)) {
      return NextResponse.json(
        { error: 'checkOut must be after checkIn' },
        { status: 400, headers: corsHeaders }
      )
    }
    
    const nights = checkOutDate.diff(checkInDate, 'days')
    
    // Lazy import like other working APIs
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()
    
    // Verify hotel
    const organization = await prisma.organization.findUnique({
      where: { id: hotelId }
    })
    
    if (!organization) {
      return NextResponse.json(
        { error: 'Hotel not found' },
        { status: 404, headers: corsHeaders }
      )
    }
    
    // Get room
    const room = await prisma.room.findFirst({
      where: { id: roomId, organizationId: hotelId, isActive: true }
    })
    
    if (!room) {
      return NextResponse.json(
        { error: 'Room not found or not available' },
        { status: 404, headers: corsHeaders }
      )
    }
    
    // Check availability
    const overlapping = await prisma.reservation.findFirst({
      where: {
        organizationId: hotelId,
        OR: [{ roomId }, { roomNumber: room.roomNumber }],
        status: { in: ['CONFIRMED', 'CHECKED_IN', 'PENDING'] },
        checkIn: { lt: checkOutDate.toDate() },
        checkOut: { gt: checkInDate.toDate() }
      }
    })
    
    if (overlapping) {
      return NextResponse.json(
        { error: 'Room is not available for the selected dates' },
        { status: 409, headers: corsHeaders }
      )
    }
    
    // Calculate price
    const roomRates = await prisma.roomRate.findMany({
      where: { organizationId: hotelId, roomTypeCode: room.roomType || 'standard' }
    })
    
    const ratesByDay: Record<number, number> = {}
    roomRates.forEach(rate => { ratesByDay[rate.dayOfWeek] = rate.price })
    
    let totalAmount = 0
    for (let i = 0; i < nights; i++) {
      const date = moment(checkIn).add(i, 'days')
      totalAmount += ratesByDay[date.day()] || room.basePrice || 100
    }
    
    // Create reservation
    const confirmationNumber = `WEB${moment().format('YYMMDD')}${Math.random().toString(36).substring(2, 8).toUpperCase()}`
    
    const reservation = await prisma.reservation.create({
      data: {
        organizationId: hotelId,
        roomId,
        roomNumber: room.roomNumber,
        guestName: `${guest.firstName} ${guest.lastName}`,
        guestEmail: guest.email,
        guestPhone: guest.phone,
        checkIn: checkInDate.toDate(),
        checkOut: checkOutDate.toDate(),
        adults,
        children,
        totalAmount,
        status: 'CONFIRMED',
        source: 'website',
        notes: specialRequests || '',
        reservationData: {
          confirmationNumber,
          guest,
          paymentMethod,
          bookedAt: new Date().toISOString()
        }
      }
    })
    
    console.log(`[Public Book API] New booking: ${confirmationNumber}`)
    
    return NextResponse.json({
      success: true,
      booking: {
        confirmationNumber,
        reservationId: reservation.id,
        status: 'CONFIRMED',
        hotel: { id: hotelId, name: organization.name },
        room: { id: room.id, number: room.roomNumber, type: room.roomType },
        dates: { checkIn, checkOut, nights },
        guests: { adults, children },
        guest: { name: `${guest.firstName} ${guest.lastName}`, email: guest.email },
        pricing: { currency: 'GEL', totalAmount, pricePerNight: Math.round(totalAmount / nights) },
        createdAt: new Date().toISOString()
      },
      message: 'Booking confirmed!'
    }, { status: 201, headers: corsHeaders })
    
  } catch (error: any) {
    console.error('[Public Book API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    )
  }
}