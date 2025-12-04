import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@saas-platform/database'

export async function GET() {
  try {
    // Get first organization's tenant ID (in production, get from auth/session)
    const org = await prisma.organization.findFirst()
    
    if (!org) {
      return NextResponse.json([])
    }

    const rooms = await prisma.hotelRoom.findMany({
      where: { tenantId: org.tenantId },
      orderBy: [
        { floor: 'desc' },
        { roomNumber: 'asc' }
      ]
    })
    
    // Add room type based on floor
    const enrichedRooms = rooms.map(room => ({
      ...room,
      basePrice: Number(room.basePrice),
      roomType: room.floor === 3 ? 'Suite' : room.floor === 2 ? 'Deluxe' : 'Standard'
    }))
    
    return NextResponse.json(enrichedRooms)
  } catch (error: any) {
    console.error('Error fetching rooms:', error)
    // Fallback to empty array if database fails
    return NextResponse.json([])
  }
}

export async function POST(request: NextRequest) {
  try {
    const { roomId, status } = await request.json()
    
    if (!roomId || !status) {
      return NextResponse.json(
        { error: 'roomId and status are required' },
        { status: 400 }
      )
    }
    
    const room = await prisma.hotelRoom.update({
      where: { id: roomId },
      data: { status }
    })
    
    return NextResponse.json(room)
  } catch (error: any) {
    console.error('Error updating room:', error)
    return NextResponse.json(
      { error: 'Failed to update room', details: error.message },
      { status: 500 }
    )
  }
}

