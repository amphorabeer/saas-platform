import { NextRequest, NextResponse } from 'next/server'
import { getReservations, addReservation, updateReservation, saveReservations } from '../../../../lib/dataStore'

export async function GET() {
  try {
    const reservations = await getReservations()
    return NextResponse.json(reservations)
  } catch (error: any) {
    console.error('Error loading reservations:', error)
    return NextResponse.json({ error: 'Failed to load reservations', details: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    // ✅ Check for overlapping reservations
    const existingReservations = await getReservations()
    
    const hasOverlap = existingReservations.some((res: any) => {
      // Skip cancelled and no-show
      if (res.status === 'CANCELLED' || res.status === 'NO_SHOW') return false
      
      // Must be same room
      if (res.roomId !== data.roomId) return false
      
      // Check date overlap
      const newCheckIn = new Date(data.checkIn)
      const newCheckOut = new Date(data.checkOut)
      const resCheckIn = new Date(res.checkIn)
      const resCheckOut = new Date(res.checkOut)
      
      // Overlap if: newCheckIn < resCheckOut AND newCheckOut > resCheckIn
      return newCheckIn < resCheckOut && newCheckOut > resCheckIn
    })
    
    if (hasOverlap) {
      return NextResponse.json(
        { error: 'Room is already booked for these dates', code: 'OVERLAP' },
        { status: 409 } // Conflict
      )
    }
    
    const newReservation = await addReservation(data)
    return NextResponse.json(newReservation)
  } catch (error: any) {
    console.error('Error creating reservation:', error)
    return NextResponse.json({ error: 'Failed to create reservation', details: error.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, ...updates } = await request.json()
    
    if (!id) {
      return NextResponse.json({ error: 'Reservation ID required' }, { status: 400 })
    }
    
    const updatedReservation = await updateReservation(id, updates)
    return NextResponse.json(updatedReservation)
  } catch (error: any) {
    console.error('Error updating reservation:', error)
    return NextResponse.json({ error: 'Failed to update reservation', details: error.message }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    await saveReservations([])
    return NextResponse.json({ message: 'All reservations deleted', count: 0 })
  } catch (error: any) {
    console.error('Error deleting reservations:', error)
    return NextResponse.json({ error: 'Failed to delete reservations', details: error.message }, { status: 500 })
  }
}

