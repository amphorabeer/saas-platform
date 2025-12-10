export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getTenantId, unauthorizedResponse } from '@/lib/tenant'

// Lazy load prisma to avoid build-time initialization
async function getPrisma() {
  const { prisma } = await import('@saas-platform/database')
  return prisma
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenantId = await getTenantId()
    
    if (!tenantId) {
      return unauthorizedResponse()
    }
    
    const prisma = await getPrisma()
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

