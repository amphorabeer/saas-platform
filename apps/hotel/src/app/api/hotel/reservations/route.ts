export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getTenantId, unauthorizedResponse } from '@/lib/tenant'

export async function GET() {
  try {
    const tenantId = await getTenantId()
    
    if (!tenantId) {
      return unauthorizedResponse()
    }
    
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()
    const reservations = await prisma.hotelReservation.findMany({
      where: { tenantId },
      include: { room: true },
      orderBy: { checkIn: 'desc' },
    })
    
    // Map reservations to include roomNumber from room object
    const reservationsWithRoomNumber = reservations.map(res => ({
      ...res,
      roomNumber: res.room?.roomNumber || res.roomId,
      roomType: res.room?.roomType || null,
      roomPrice: res.room?.basePrice || null
    }))
    
    return NextResponse.json(reservationsWithRoomNumber)
  } catch (error: any) {
    console.error('Error loading reservations:', error)
    return NextResponse.json({ error: 'Failed to load reservations', details: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const tenantId = await getTenantId()
    
    if (!tenantId) {
      return unauthorizedResponse()
    }
    
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()
    const data = await request.json()
    
    // Check for overlapping reservations
    const existingReservations = await prisma.hotelReservation.findMany({
      where: {
        tenantId,
        roomId: data.roomId,
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      },
    })
    
    const newCheckIn = new Date(data.checkIn)
    const newCheckOut = new Date(data.checkOut)
    
    const hasOverlap = existingReservations.some((res) => {
      const resCheckIn = new Date(res.checkIn)
      const resCheckOut = new Date(res.checkOut)
      return newCheckIn < resCheckOut && newCheckOut > resCheckIn
    })
    
    if (hasOverlap) {
      return NextResponse.json(
        { error: 'Room is already booked for these dates', code: 'OVERLAP' },
        { status: 409 }
      )
    }
    
    const room = await prisma.hotelRoom.findUnique({
      where: { id: data.roomId, tenantId },
    })
    
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }
    
    const nights = Math.ceil((newCheckOut.getTime() - newCheckIn.getTime()) / (1000 * 60 * 60 * 24))
    const totalAmount = data.totalAmount !== undefined 
      ? Number(data.totalAmount)
      : Number(room.basePrice) * nights
    
    const newReservation = await prisma.hotelReservation.create({
      data: {
        tenantId,
        roomId: data.roomId,
        guestName: data.guestName,
        guestEmail: data.guestEmail || '',  // ✅ empty string, not null
        guestPhone: data.guestPhone || '',
        checkIn: newCheckIn,
        checkOut: newCheckOut,
        adults: data.adults || 1,
        children: data.children || 0,
        totalAmount,
        paidAmount: data.paidAmount || 0,
        status: data.status || 'CONFIRMED',
        source: data.source || 'direct',
        notes: data.notes || '',  // ✅ empty string, not null
      },
      include: { room: true },
    })
    
    if (newReservation.status === 'CHECKED_IN') {
      await prisma.hotelRoom.update({
        where: { id: data.roomId },
        data: { status: 'OCCUPIED' },
      })
    }
    
    // Return reservation with roomNumber
    return NextResponse.json({
      ...newReservation,
      roomNumber: newReservation.room?.roomNumber || newReservation.roomId,
      roomType: newReservation.room?.roomType || null,
      roomPrice: newReservation.room?.basePrice || null
    })
  } catch (error: any) {
    console.error('Error creating reservation:', error)
    return NextResponse.json({ error: 'Failed to create reservation', details: error.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  let body: any = {}
  let updateData: any = {}
  try {
    const tenantId = await getTenantId()
    
    if (!tenantId) {
      return unauthorizedResponse()
    }
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()
    body = await request.json()
    const { id } = body
    
    if (!id) {
      return NextResponse.json({ error: 'Reservation ID required' }, { status: 400 })
    }
    
    // First verify reservation exists and belongs to tenant
    const existingReservation = await prisma.hotelReservation.findUnique({
      where: { id },
      include: { room: true },
    })
    
    if (!existingReservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }
    
    if (existingReservation.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    
    // Only allow valid fields - filter out unknown fields
    const validFields = [
      'guestName', 'guestEmail', 'guestPhone',
      'checkIn', 'checkOut', 'adults', 'children',
      'totalAmount', 'paidAmount', 'status', 'source', 'notes'
    ]
    
    updateData = {}
    
    for (const field of validFields) {
      if (body[field] !== undefined) {
        if (field === 'checkIn' || field === 'checkOut') {
          const dateVal = new Date(body[field])
          if (!isNaN(dateVal.getTime())) {
            updateData[field] = dateVal
          }
        } else if (field === 'totalAmount' || field === 'paidAmount') {
          let numVal: number
          if (typeof body[field] === 'object' && body[field] !== null && 'toNumber' in body[field]) {
            numVal = body[field].toNumber()
          } else {
            numVal = Number(body[field])
          }
          if (!isNaN(numVal) && numVal >= 0 && numVal <= 1000000) {
            updateData[field] = numVal
          }
        } else if (field === 'adults' || field === 'children') {
          const numVal = Number(body[field])
          if (!isNaN(numVal) && numVal >= 0) {
            updateData[field] = numVal
          }
        } else if (field === 'guestEmail' || field === 'guestPhone' || field === 'notes') {
          // ✅ FIX: Use empty string, NOT null (guestEmail is required)
          updateData[field] = body[field] || ''
        } else if (field === 'source') {
          updateData[field] = body[field] || 'direct'
        } else {
          updateData[field] = body[field]
        }
      }
    }
    
    // If no fields to update, return early
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(existingReservation)
    }
    
    // Handle roomId update
    if (body.roomId && body.roomId !== existingReservation.roomId) {
      // Verify room belongs to tenant
      const room = await prisma.hotelRoom.findUnique({
        where: { id: body.roomId, tenantId },
      })
      if (!room) {
        return NextResponse.json({ error: 'Room not found or access denied' }, { status: 404 })
      }
      updateData.roomId = body.roomId
    }
    
    // Check for overlapping reservations if dates or room are being changed
    if (updateData.checkIn || updateData.checkOut || updateData.roomId) {
      const checkIn = updateData.checkIn ? new Date(updateData.checkIn) : new Date(existingReservation.checkIn)
      const checkOut = updateData.checkOut ? new Date(updateData.checkOut) : new Date(existingReservation.checkOut)
      const roomId = updateData.roomId || existingReservation.roomId
      
      const overlappingReservations = await prisma.hotelReservation.findMany({
        where: {
          tenantId,
          roomId,
          id: { not: id }, // Exclude current reservation
          status: { notIn: ['CANCELLED', 'NO_SHOW'] },
        },
      })
      
      const hasOverlap = overlappingReservations.some((res) => {
        const resCheckIn = new Date(res.checkIn)
        const resCheckOut = new Date(res.checkOut)
        return checkIn < resCheckOut && checkOut > resCheckIn
      })
      
      if (hasOverlap) {
        return NextResponse.json(
          { error: 'Room is already booked for these dates', code: 'OVERLAP' },
          { status: 409 }
        )
      }
    }
    
    // Validate updateData before attempting update
    
    const updatedReservation = await prisma.hotelReservation.update({
      where: { id },
      data: updateData,
      include: { room: true },
    })
    
    // Update room status based on reservation status
    const finalRoomId = updateData.roomId || existingReservation.roomId
    if (updateData.status === 'CHECKED_IN' && finalRoomId) {
      await prisma.hotelRoom.update({
        where: { id: finalRoomId },
        data: { status: 'OCCUPIED' },
      })
    } else if (updateData.status === 'CHECKED_OUT' && finalRoomId) {
      await prisma.hotelRoom.update({
        where: { id: finalRoomId },
        data: { status: 'DIRTY' },
      })
    }
    
    // Return reservation with roomNumber
    return NextResponse.json({
      ...updatedReservation,
      roomNumber: updatedReservation.room?.roomNumber || updatedReservation.roomId,
      roomType: updatedReservation.room?.roomType || null,
      roomPrice: updatedReservation.room?.basePrice || null
    })
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }
    console.error('Error updating reservation:', error)
    console.error('Error name:', error.name)
    console.error('Error code:', error.code)
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    console.error('Request body:', JSON.stringify(body, null, 2))
    console.error('Update data that was attempted:', JSON.stringify(updateData || {}, null, 2))
    
    // Return more detailed error for debugging
    return NextResponse.json({ 
      error: 'Failed to update reservation', 
      details: error.message,
      code: error.code,
      meta: error.meta
    }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const tenantId = await getTenantId()
    
    if (!tenantId) {
      return unauthorizedResponse()
    }
    
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()
    const result = await prisma.hotelReservation.deleteMany({
      where: { tenantId },
    })
    
    return NextResponse.json({ message: 'All reservations deleted', count: result.count })
  } catch (error: any) {
    console.error('Error deleting reservations:', error)
    return NextResponse.json({ error: 'Failed to delete reservations', details: error.message }, { status: 500 })
  }
}