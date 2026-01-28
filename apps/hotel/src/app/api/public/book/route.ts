export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import moment from 'moment'

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
    const { hotelId, roomId, checkIn, checkOut, guest, adults = 2, children = 0, specialRequests } = body
    
    const errors: string[] = []
    if (!hotelId) errors.push('hotelId required')
    if (!roomId) errors.push('roomId required')
    if (!checkIn) errors.push('checkIn required')
    if (!checkOut) errors.push('checkOut required')
    if (!guest?.firstName) errors.push('guest.firstName required')
    if (!guest?.lastName) errors.push('guest.lastName required')
    if (!guest?.email) errors.push('guest.email required')
    if (!guest?.phone) errors.push('guest.phone required')
    
    if (errors.length > 0) {
      return NextResponse.json({ error: 'Validation failed', details: errors }, { status: 400, headers: corsHeaders })
    }
    
    const checkInDate = moment(checkIn)
    const checkOutDate = moment(checkOut)
    
    if (checkInDate.isBefore(moment().startOf('day'))) {
      return NextResponse.json({ error: 'checkIn cannot be in the past' }, { status: 400, headers: corsHeaders })
    }
    
    if (checkOutDate.isSameOrBefore(checkInDate)) {
      return NextResponse.json({ error: 'checkOut must be after checkIn' }, { status: 400, headers: corsHeaders })
    }
    
    const nights = checkOutDate.diff(checkInDate, 'days')
    
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()
    
    const organization = await prisma.organization.findUnique({ where: { id: hotelId } })
    if (!organization) {
      return NextResponse.json({ error: 'Hotel not found' }, { status: 404, headers: corsHeaders })
    }
    
    // HotelRoom uses tenantId
    const room = await prisma.hotelRoom.findFirst({
      where: { id: roomId, tenantId: hotelId }
    })
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404, headers: corsHeaders })
    }
    
    // HotelReservation uses tenantId
    const overlapping = await prisma.hotelReservation.findFirst({
      where: {
        tenantId: hotelId,
        roomId,
        status: { in: ['CONFIRMED', 'CHECKED_IN', 'PENDING'] },
        checkIn: { lt: checkOutDate.toDate() },
        checkOut: { gt: checkInDate.toDate() }
      }
    })
    
    if (overlapping) {
      return NextResponse.json({ error: 'Room not available for selected dates' }, { status: 409, headers: corsHeaders })
    }
    
    // HotelRoomRate uses organizationId
    const roomRates = await prisma.hotelRoomRate.findMany({
      where: { organizationId: hotelId, roomTypeCode: room.roomType || 'STANDARD' }
    })
    
    const ratesByDay: Record<number, number> = {}
    roomRates.forEach(rate => { 
      if (rate.dayOfWeek !== null) ratesByDay[rate.dayOfWeek] = rate.basePrice 
    })
    
    const basePrice = Number(room.basePrice) || 100
    let totalAmount = 0
    for (let i = 0; i < nights; i++) {
      const d = moment(checkIn).add(i, 'days').day()
      totalAmount += ratesByDay[d] || basePrice
    }
    
    const confirmationNumber = `WEB${moment().format('YYMMDD')}${Math.random().toString(36).substring(2, 8).toUpperCase()}`
    
    // HotelReservation uses tenantId
    const reservation = await prisma.hotelReservation.create({
      data: {
        tenantId: hotelId,
        roomId,
        guestName: `${guest.firstName} ${guest.lastName}`,
        guestEmail: guest.email,
        guestPhone: guest.phone,
        checkIn: checkInDate.toDate(),
        checkOut: checkOutDate.toDate(),
        adults,
        children,
        totalAmount,
        status: 'CONFIRMED',
        source: 'WEBSITE',
        notes: specialRequests || '',
        confirmationNumber
      }
    })
    
    console.log(`[Public Book] New booking: ${confirmationNumber}`)
    
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
        pricing: { currency: 'GEL', totalAmount, pricePerNight: Math.round(totalAmount / nights) },
        createdAt: new Date().toISOString()
      }
    }, { status: 201, headers: corsHeaders })
    
  } catch (error: any) {
    console.error('[Public Book API] Error:', error)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500, headers: corsHeaders })
  }
}