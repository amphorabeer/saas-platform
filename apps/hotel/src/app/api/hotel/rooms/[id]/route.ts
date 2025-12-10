export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getTenantId, unauthorizedResponse } from '@/lib/tenant'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const tenantId = await getTenantId()
    
    if (!tenantId) {
      return unauthorizedResponse()
    }
    
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()
    const id = params.id
    const updates = await request.json()
    
    const updatedRoom = await prisma.hotelRoom.update({
      where: {
        id,
        tenantId, // Ensure tenant isolation
      },
      data: updates,
    })
    
    return NextResponse.json(updatedRoom)
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }
    console.error('Error updating room:', error)
    return NextResponse.json({ error: 'Failed to update room', details: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const tenantId = await getTenantId()
    
    if (!tenantId) {
      return unauthorizedResponse()
    }
    
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()
    const id = params.id
    
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
        tenantId, // Ensure tenant isolation
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
