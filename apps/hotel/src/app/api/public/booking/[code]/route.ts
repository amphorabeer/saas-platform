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

    // Find booking by bookingNumber
    const booking = await prisma.spaBooking.findFirst({
      where: {
        bookingNumber: code
      }
    })

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json({
      id: booking.id,
      bookingNumber: booking.bookingNumber,
      guestName: booking.guestName,
      guestPhone: booking.guestPhone,
      guestEmail: booking.guestEmail,
      date: booking.date,
      startTime: booking.startTime,
      endTime: booking.endTime,
      guests: booking.guests,
      totalPrice: booking.totalPrice,
      status: booking.status,
      services: booking.services,
      createdAt: booking.createdAt
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('[Public Booking] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch booking' },
      { status: 500, headers: corsHeaders }
    )
  }
}
