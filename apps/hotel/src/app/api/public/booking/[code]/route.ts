export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const code = params.code;

    if (!code) {
      return NextResponse.json(
        { error: 'Booking code required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()

    // First try SpaBooking (for spa and restaurant)
    const spaBooking = await prisma.spaBooking.findFirst({
      where: {
        bookingNumber: code
      }
    })

    if (spaBooking) {
      return NextResponse.json({
        id: spaBooking.id,
        type: 'spa',
        bookingNumber: spaBooking.bookingNumber,
        guestName: spaBooking.guestName,
        guestPhone: spaBooking.guestPhone,
        guestEmail: spaBooking.guestEmail,
        date: spaBooking.date,
        startTime: spaBooking.startTime,
        endTime: spaBooking.endTime,
        guests: spaBooking.guests,
        totalPrice: spaBooking.totalPrice,
        status: spaBooking.status,
        services: spaBooking.services,
        createdAt: spaBooking.createdAt
      }, { headers: corsHeaders });
    }

    // Then try HotelReservation (for hotel bookings)
    const hotelBooking = await prisma.hotelReservation.findFirst({
      where: {
        confirmationNumber: code
      },
      include: {
        room: true
      }
    })

    if (hotelBooking) {
      const nights = Math.ceil((new Date(hotelBooking.checkOut).getTime() - new Date(hotelBooking.checkIn).getTime()) / (1000 * 60 * 60 * 24))
      
      return NextResponse.json({
        id: hotelBooking.id,
        type: 'hotel',
        bookingNumber: hotelBooking.confirmationNumber,
        guestName: hotelBooking.guestName,
        guestPhone: hotelBooking.guestPhone,
        guestEmail: hotelBooking.guestEmail,
        checkIn: hotelBooking.checkIn,
        checkOut: hotelBooking.checkOut,
        nights,
        adults: hotelBooking.adults,
        children: hotelBooking.children,
        room: hotelBooking.room ? {
          number: hotelBooking.room.roomNumber,
          type: hotelBooking.room.roomType
        } : null,
        totalPrice: hotelBooking.totalAmount,
        status: hotelBooking.status,
        specialRequests: hotelBooking.notes,
        createdAt: hotelBooking.createdAt
      }, { headers: corsHeaders });
    }

    // Not found in either table
    return NextResponse.json(
      { error: 'Booking not found' },
      { status: 404, headers: corsHeaders }
    );

  } catch (error) {
    console.error('[Public Booking] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch booking' },
      { status: 500, headers: corsHeaders }
    )
  }
}
