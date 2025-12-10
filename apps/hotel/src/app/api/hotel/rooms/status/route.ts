export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getTenantId, unauthorizedResponse } from '@/lib/tenant'

// Lazy load prisma to avoid build-time initialization
async function getPrisma() {
  const { prisma } = await import('@saas-platform/database')
  return prisma
}

export async function POST(request: NextRequest) {
  try {
    const tenantId = await getTenantId()
    
    if (!tenantId) {
      return unauthorizedResponse()
    }
    
    const prisma = await getPrisma()
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
    
    // Try to find room by ID first, then by roomNumber
    let room = await prisma.hotelRoom.findFirst({
      where: {
        tenantId,
        OR: [
          { id: roomId },
          { roomNumber: roomId },
        ],
      },
    })
    
    if (!room) {
      return NextResponse.json(
        { error: `Room not found: ${roomId}` },
        { status: 404 }
      )
    }
    
    // Update room status
    const updatedRoom = await prisma.hotelRoom.update({
      where: { id: room.id },
      data: { status },
    })
    
    // Log status change
    console.log(`Room ${roomId} status changed to ${status}`)
    
    return NextResponse.json({ 
      success: true, 
      roomId: updatedRoom.id,
      newStatus: status 
    })
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }
    console.error('Error updating room status:', error)
    return NextResponse.json(
      { error: 'Failed to update room status', details: error.message },
      { status: 500 }
    )
  }
}

