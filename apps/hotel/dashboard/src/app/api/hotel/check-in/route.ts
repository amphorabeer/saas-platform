import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@saas-platform/database'

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    // Get first organization's tenant ID (in production, get from auth/session)
    const org = await prisma.organization.findFirst()
    
    if (!org) {
      return NextResponse.json(
        { error: 'No organization found' },
        { status: 404 }
      )
    }
    
    // Calculate total amount based on room price and nights
    const room = await prisma.hotelRoom.findUnique({
      where: { id: data.roomId }
    })
    
    if (!room) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      )
    }
    
    const checkIn = new Date(data.checkIn)
    const checkOut = new Date(data.checkOut)
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
    const totalAmount = Number(room.basePrice) * nights
    
    // Create reservation
    const reservation = await prisma.hotelReservation.create({
      data: {
        tenantId: org.tenantId,
        roomId: data.roomId,
        guestName: data.guestName,
        guestEmail: data.guestEmail,
        guestPhone: data.guestPhone || '',
        checkIn: checkIn,
        checkOut: checkOut,
        adults: data.adults || 1,
        children: data.children || 0,
        totalAmount: totalAmount,
        paidAmount: 0,
        status: 'CONFIRMED'
      }
    })
    
    // Update room status to OCCUPIED
    await prisma.hotelRoom.update({
      where: { id: data.roomId },
      data: { status: 'OCCUPIED' }
    })
    
    return NextResponse.json(reservation)
  } catch (error: any) {
    console.error('Error creating reservation:', error)
    return NextResponse.json(
      { error: 'Failed to create reservation', details: error.message },
      { status: 500 }
    )
  }
}




