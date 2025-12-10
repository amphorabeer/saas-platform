export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getTenantId, unauthorizedResponse } from '@/lib/tenant'

import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const tenantId = await getTenantId()
    
    if (!tenantId) {
      return unauthorizedResponse()
    }
    const data = await request.json()
    
    // Get room for validation
    const room = await prisma.hotelRoom.findUnique({
      where: { 
        id: data.roomId,
        tenantId, // Ensure tenant isolation
      }
    })
    
    if (!room) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      )
    }
    
    // Use totalAmount from request (already calculated with season modifiers on frontend)
    // If not provided, fallback to base price calculation (for backward compatibility)
    const checkIn = new Date(data.checkIn)
    const checkOut = new Date(data.checkOut)
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
    const totalAmount = data.totalAmount !== undefined 
      ? Number(data.totalAmount)  // Use frontend-calculated amount (includes season modifiers)
      : Number(room.basePrice) * nights  // Fallback for backward compatibility
    
    // Create reservation
    const reservation = await prisma.hotelReservation.create({
      data: {
        tenantId,
        roomId: data.roomId,
        guestName: data.guestName,
        guestEmail: data.guestEmail || '',
        guestPhone: data.guestPhone || '',
        checkIn: checkIn,
        checkOut: checkOut,
        adults: data.adults || 1,
        children: data.children || 0,
        totalAmount: totalAmount,
        paidAmount: 0,
        status: 'CHECKED_IN',
        source: data.source || 'direct',
        companyName: data.companyName || null,
        companyTaxId: data.companyTaxId || null,
        companyAddress: data.companyAddress || null,
        companyBank: data.companyBank || null,
        companyBankAccount: data.companyBankAccount || null,
        notes: data.notes,
      },
      include: { room: true },
    })
    
    // Update room status to OCCUPIED
    await prisma.hotelRoom.update({
      where: { 
        id: data.roomId,
        tenantId, // Ensure tenant isolation
      },
      data: { status: 'OCCUPIED' }
    })
    
    // Return reservation with roomNumber
    return NextResponse.json({
      ...reservation,
      roomNumber: room.roomNumber,
      roomType: room.roomType || null,
      roomPrice: room.basePrice
    })
  } catch (error: any) {
    console.error('Error creating reservation:', error)
    return NextResponse.json(
      { error: 'Failed to create reservation', details: error.message },
      { status: 500 }
    )
  }
}

