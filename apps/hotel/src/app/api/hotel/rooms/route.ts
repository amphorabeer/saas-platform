export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@saas-platform/database'
import { getTenantId, unauthorizedResponse } from '@/lib/tenant'

export async function GET() {
  try {
    const tenantId = await getTenantId()
    
    if (!tenantId) {
      return unauthorizedResponse()
    }
    
    const rooms = await prisma.hotelRoom.findMany({
      where: { tenantId },
      orderBy: { roomNumber: 'asc' },
    })
    
    return NextResponse.json(rooms)
  } catch (error: any) {
    console.error('Error loading rooms:', error)
    return NextResponse.json({ error: 'Failed to load rooms', details: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const tenantId = await getTenantId()
    
    if (!tenantId) {
      return unauthorizedResponse()
    }
    
    const body = await request.json()
    console.log('📥 POST /api/hotel/rooms - Body:', JSON.stringify(body, null, 2))
    
    // Check if it's a status update (has roomId and status)
    if (body.roomId && body.status && !body.roomNumber) {
      const updatedRoom = await prisma.hotelRoom.update({
        where: { 
          id: body.roomId,
          tenantId,
        },
        data: { status: body.status },
      })
      return NextResponse.json(updatedRoom)
    }
    
    // Extract only valid fields for room creation
    const roomData = {
      tenantId,
      roomNumber: body.roomNumber,
      roomType: body.roomType || body.type || 'STANDARD', // Support both field names
      floor: typeof body.floor === 'number' ? body.floor : parseInt(body.floor) || 1,
      status: body.status || 'VACANT',
      basePrice: typeof body.basePrice === 'number' ? body.basePrice : parseFloat(body.basePrice) || 0,
      amenities: Array.isArray(body.amenities) ? body.amenities : [],
      maxOccupancy: typeof body.maxOccupancy === 'number' ? body.maxOccupancy : parseInt(body.maxOccupancy) || 2,
    }
    
    console.log('📥 Creating room with data:', JSON.stringify(roomData, null, 2))
    
    const newRoom = await prisma.hotelRoom.create({
      data: roomData,
    })
    
    return NextResponse.json(newRoom)
  } catch (error: any) {
    console.error('❌ Error adding room:', error.message)
    console.error('❌ Full error:', error)
    return NextResponse.json({ error: 'Failed to add room', details: error.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const tenantId = await getTenantId()
    
    if (!tenantId) {
      return unauthorizedResponse()
    }
    
    const body = await request.json()
    const { id, type, ...updates } = body // Remove 'type' field
    
    if (!id) {
      return NextResponse.json({ error: 'Room ID required' }, { status: 400 })
    }
    
    // Map type to roomType if needed
    if (type && !updates.roomType) {
      updates.roomType = type
    }
    
    const updatedRoom = await prisma.hotelRoom.update({
      where: { 
        id,
        tenantId,
      },
      data: updates,
    })
    
    return NextResponse.json({ success: true, room: updatedRoom })
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }
    console.error('Error updating room:', error)
    return NextResponse.json({ error: 'Failed to update room', details: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const tenantId = await getTenantId()
    
    if (!tenantId) {
      return unauthorizedResponse()
    }
    
    const url = new URL(request.url)
    const id = url.searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'Room ID required' }, { status: 400 })
    }
    
    // Check if room has active reservations
    const activeReservations = await prisma.hotelReservation.findMany({
      where: {
        roomId: id,
        tenantId,
        status: { in: ['CONFIRMED', 'CHECKED_IN', 'PENDING'] },
      },
    })
    
    if (activeReservations.length > 0) {
      return NextResponse.json(
        { error: `Cannot delete room - ${activeReservations.length} active reservation(s) exist` },
        { status: 400 }
      )
    }
    
    await prisma.hotelRoom.delete({
      where: {
        id,
        tenantId,
      },
    })
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }
    console.error('Error deleting room:', error)
    return NextResponse.json({ error: 'Failed to delete room', details: error.message }, { status: 500 })
  }
}
