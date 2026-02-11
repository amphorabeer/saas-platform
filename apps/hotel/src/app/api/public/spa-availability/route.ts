export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

// All possible time slots
const ALL_TIME_SLOTS = ['10:00', '11:15', '12:30', '13:45', '15:00', '16:15', '17:30', '18:45', '20:00', '21:15'];

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json(
        { error: 'Date parameter required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()

    // Find organization
    const organization = await prisma.organization.findFirst({
      where: {
        OR: [
          { name: { contains: 'Brewery' } },
          { name: { contains: 'brewery' } }
        ]
      }
    })

    if (!organization) {
      return NextResponse.json(
        { availableSlots: ALL_TIME_SLOTS, bookedSlots: [] },
        { headers: corsHeaders }
      );
    }

    const tenantId = organization.tenantId

    // Get all bookings for this date
    const bookings = await prisma.spaBooking.findMany({
      where: {
        tenantId,
        date: new Date(date),
        status: { not: 'cancelled' }
      },
      select: {
        startTime: true,
        endTime: true
      }
    })

    // Helper: Convert time to minutes
    const timeToMinutes = (time: string): number => {
      const [h, m] = time.split(':').map(Number)
      return h * 60 + (m || 0)
    }

    // Find booked slots (any slot that overlaps with a booking)
    const bookedSlots: string[] = []
    
    for (const slot of ALL_TIME_SLOTS) {
      const slotStart = timeToMinutes(slot)
      const slotEnd = slotStart + 60 // 60 min session

      const isBooked = bookings.some((booking: { startTime: string; endTime: string }) => {
        const bookingStart = timeToMinutes(booking.startTime)
        const bookingEnd = timeToMinutes(booking.endTime)
        // Overlap check: slot overlaps if slotStart < bookingEnd AND slotEnd > bookingStart
        return slotStart < bookingEnd && slotEnd > bookingStart
      })

      if (isBooked) {
        bookedSlots.push(slot)
      }
    }

    // Available slots = all slots minus booked slots
    const availableSlots = ALL_TIME_SLOTS.filter(slot => !bookedSlots.includes(slot))

    return NextResponse.json({
      date,
      availableSlots,
      bookedSlots,
      totalSlots: ALL_TIME_SLOTS.length,
      availableCount: availableSlots.length
    }, { headers: corsHeaders })

  } catch (error) {
    console.error('[Spa Availability] Error:', error)
    return NextResponse.json(
      { error: 'Failed to check availability', availableSlots: ALL_TIME_SLOTS, bookedSlots: [] },
      { status: 500, headers: corsHeaders }
    )
  }
}
