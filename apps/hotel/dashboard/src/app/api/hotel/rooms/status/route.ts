import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@saas-platform/database'

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
    console.error('Error updating room status:', error)
    return NextResponse.json(
      { error: 'Failed to update room status', details: error.message },
      { status: 500 }
    )
  }
}




