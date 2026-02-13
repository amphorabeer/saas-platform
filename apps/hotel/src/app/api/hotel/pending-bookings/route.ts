export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

// GET - Pending bookings (spa, restaurant, hotel)
export async function GET(request: NextRequest) {
  try {
    const { getTenantId, unauthorizedResponse } = await import('@/lib/tenant')
    const tenantId = await getTenantId()
    
    if (!tenantId) {
      return unauthorizedResponse()
    }
    
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()
    
    // Get pending spa/restaurant bookings
    const spaBookings = await prisma.spaBooking.findMany({
      where: {
        tenantId,
        status: 'pending'
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    })

    // Get pending hotel reservations
    const hotelReservations = await prisma.hotelReservation.findMany({
      where: {
        tenantId,
        status: 'PENDING'
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    })

    // Map spa/restaurant bookings
    const spaMapped = spaBookings.map((b: any) => {
      const isRestaurant = b.bookingNumber?.startsWith('RST') || (b.services as any)?.type === 'restaurant'
      return {
        id: b.id,
        type: isRestaurant ? 'restaurant' : 'spa',
        bookingNumber: b.bookingNumber,
        guestName: b.guestName,
        guestPhone: b.guestPhone || '',
        date: b.date,
        time: b.startTime,
        guests: b.guests,
        status: b.status,
        createdAt: b.createdAt
      }
    })

    // Map hotel reservations
    const hotelMapped = hotelReservations.map((r: any) => ({
      id: r.id,
      type: 'hotel' as const,
      bookingNumber: r.confirmationNumber,
      guestName: r.guestName,
      guestPhone: r.guestPhone || '',
      date: r.checkIn,
      guests: r.adults + (r.children || 0),
      status: r.status,
      createdAt: r.createdAt
    }))

    // Combine and sort by createdAt
    const allPending = [...spaMapped, ...hotelMapped].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    return NextResponse.json(allPending)
  } catch (error: any) {
    console.error('[Pending Bookings] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch pending bookings', details: error.message }, { status: 500 })
  }
}
