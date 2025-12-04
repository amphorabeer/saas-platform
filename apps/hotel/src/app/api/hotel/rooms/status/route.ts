import { NextRequest, NextResponse } from 'next/server'
import { getRooms, saveRooms } from '../../../../../lib/dataStore'

export async function POST(request: NextRequest) {
  try {
    const { roomId, status } = await request.json()
    
    if (!roomId || !status) {
      return NextResponse.json(
        { error: 'roomId and status are required' },
        { status: 400 }
      )
    }
    
    // Validate status
    const validStatuses = ['VACANT', 'OCCUPIED', 'CLEANING', 'MAINTENANCE', 'RESERVED']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    
    // Get all rooms
    const rooms = await getRooms()
    
    // Check if room exists (by id OR roomNumber)
    const roomExists = rooms.some((room: any) => 
      room.id === roomId || room.roomNumber === roomId
    )
    
    if (!roomExists) {
      return NextResponse.json(
        { error: `Room not found: ${roomId}` },
        { status: 404 }
      )
    }
    
    // Update room status - search by id OR roomNumber
    const updatedRooms = rooms.map((room: any) => 
      (room.id === roomId || room.roomNumber === roomId)
        ? { ...room, status, maintenanceDate: status === 'MAINTENANCE' ? new Date().toISOString() : null } 
        : room
    )
    
    // Save updated rooms
    await saveRooms(updatedRooms)
    
    // Log status change
    console.log(`Room ${roomId} status changed to ${status}`)
    
    return NextResponse.json({ 
      success: true, 
      roomId, 
      newStatus: status 
    })
  } catch (error: any) {
    console.error('Error updating room status:', error)
    return NextResponse.json(
      { error: 'Failed to update room status', details: error.message },
      { status: 500 }
    )
  }
}

