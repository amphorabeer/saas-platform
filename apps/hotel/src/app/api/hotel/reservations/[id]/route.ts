import { NextRequest, NextResponse } from 'next/server'
import { deleteReservation } from '../../../../../lib/dataStore'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    
    if (!id) {
      return NextResponse.json({ error: 'Reservation ID required' }, { status: 400 })
    }
    
    await deleteReservation(id)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting reservation:', error)
    return NextResponse.json({ error: 'Failed to delete reservation', details: error.message }, { status: 500 })
  }
}

