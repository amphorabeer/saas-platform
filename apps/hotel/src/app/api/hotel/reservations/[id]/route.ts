export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Lazy import to prevent build-time evaluation
    const { getTenantId, unauthorizedResponse } = await import('@/lib/tenant')
    const tenantId = await getTenantId()
    
    if (!tenantId) {
      return unauthorizedResponse()
    }
    
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()
    const { id } = params
    
    if (!id) {
      return NextResponse.json({ error: 'Reservation ID required' }, { status: 400 })
    }
    
    await prisma.hotelReservation.delete({
      where: {
        id,
        tenantId, // Ensure tenant isolation
      },
    })
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }
    console.error('Error deleting reservation:', error)
    return NextResponse.json({ error: 'Failed to delete reservation', details: error.message }, { status: 500 })
  }
}

