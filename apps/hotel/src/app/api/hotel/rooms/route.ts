import { NextRequest, NextResponse } from 'next/server'
import { getRooms, addRoom, updateRoom, deleteRoom } from '../../../../lib/dataStore'

export async function GET() {
  try {
    const rooms = await getRooms()
    return NextResponse.json(rooms)
  } catch (error: any) {
    console.error('Error loading rooms:', error)
    return NextResponse.json({ error: 'Failed to load rooms', details: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Check if it's a status update (has roomId and status)
    if (body.roomId && body.status) {
      const updatedRoom = await updateRoom(body.roomId, { status: body.status })
      return NextResponse.json(updatedRoom)
    }
    
    // Otherwise, it's a new room creation
    const newRoom = await addRoom(body)
    return NextResponse.json(newRoom)
  } catch (error: any) {
    console.error('Error adding room:', error)
    return NextResponse.json({ error: 'Failed to add room', details: error.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updates } = body
    
    if (!id) {
      return NextResponse.json({ error: 'Room ID required' }, { status: 400 })
    }
    
    // Use updateRoom function from dataStore
    const updatedRoom = await updateRoom(id, updates)
    
    if (!updatedRoom) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }
    
    return NextResponse.json({ success: true, room: updatedRoom })
  } catch (error: any) {
    console.error('Error updating room:', error)
    return NextResponse.json({ error: 'Failed to update room', details: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const id = url.searchParams.get('id')
    
    if (!id) {
      // Try to get ID from path
      const pathParts = url.pathname.split('/')
      const pathId = pathParts[pathParts.length - 1]
      if (pathId && pathId !== 'rooms') {
        await deleteRoom(pathId)
        return NextResponse.json({ success: true })
      }
      return NextResponse.json({ error: 'Room ID required' }, { status: 400 })
    }
    
    await deleteRoom(id)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting room:', error)
    return NextResponse.json({ error: 'Failed to delete room', details: error.message }, { status: 500 })
  }
}
