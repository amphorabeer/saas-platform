import { NextRequest, NextResponse } from 'next/server'
import { updateRoom, deleteRoom } from '../../../../../lib/dataStore'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    const updates = await request.json()
    
    const updatedRoom = await updateRoom(id, updates)
    return NextResponse.json(updatedRoom)
  } catch (error: any) {
    console.error('Error updating room:', error)
    return NextResponse.json({ error: 'Failed to update room', details: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    
    await deleteRoom(id)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting room:', error)
    return NextResponse.json({ error: 'Failed to delete room', details: error.message }, { status: 500 })
  }
}
