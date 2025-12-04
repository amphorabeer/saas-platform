import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@saas-platform/database'

export async function GET() {
  try {
    // Get first organization's tenant ID (in production, get from auth/session)
    const org = await prisma.organization.findFirst()
    
    if (!org) {
      return NextResponse.json([])
    }

    const reservations = await prisma.hotelReservation.findMany({
      where: { tenantId: org.tenantId },
      include: {
        room: true
      },
      orderBy: { checkIn: 'asc' }
    })
    
    // Transform to include room number and match expected format
    const formattedReservations = reservations.map(res => ({
      id: res.id,
      guestName: res.guestName,
      guestEmail: res.guestEmail,
      guestPhone: res.guestPhone,
      checkIn: res.checkIn.toISOString(),
      checkOut: res.checkOut.toISOString(),
      adults: res.adults,
      children: res.children,
      totalAmount: Number(res.totalAmount),
      paidAmount: Number(res.paidAmount),
      status: res.status,
      roomNumber: res.room?.roomNumber || '-',
      roomId: res.roomId,
      tenantId: res.tenantId,
      notes: res.notes
    }))
    
    return NextResponse.json(formattedReservations)
  } catch (error: any) {
    console.error('Error fetching reservations:', error)
    // Fallback to empty array if database fails
    return NextResponse.json([])
  }
}

