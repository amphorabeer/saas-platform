export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Hotel-ID',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const hotelId = searchParams.get('hotelId') || request.headers.get('X-Hotel-ID')
    
    if (!hotelId) {
      return NextResponse.json({ error: 'hotelId is required' }, { status: 400, headers: corsHeaders })
    }
    
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()
    
    const organization = await prisma.organization.findUnique({
      where: { id: hotelId }
    })
    
    if (!organization) {
      return NextResponse.json({ error: 'Hotel not found' }, { status: 404, headers: corsHeaders })
    }
    
    // HotelRoom uses tenantId
    const rooms = await prisma.hotelRoom.findMany({
      where: { tenantId: hotelId }
    })
    
    // HotelRoomRate uses organizationId
    const roomRates = await prisma.hotelRoomRate.findMany({
      where: { organizationId: hotelId }
    })
    
    const minRate = roomRates.length > 0 
      ? Math.min(...roomRates.map(r => r.basePrice))
      : rooms.length > 0 ? Math.min(...rooms.map(r => Number(r.basePrice) || 100)) : 100
    
    const roomTypes: Record<string, any> = {}
    rooms.forEach(room => {
      const type = room.roomType || 'STANDARD'
      if (!roomTypes[type]) {
        roomTypes[type] = { type, name: type, count: 0, maxOccupancy: room.maxOccupancy || 2 }
      }
      roomTypes[type].count++
    })
    
    return NextResponse.json({
      id: hotelId,
      name: organization.name,
      slug: organization.slug,
      rooms: { total: rooms.length, types: Object.values(roomTypes) },
      pricing: { currency: 'GEL', startingFrom: minRate },
      policies: { checkInTime: '14:00', checkOutTime: '12:00' },
      generatedAt: new Date().toISOString()
    }, { headers: corsHeaders })
    
  } catch (error: any) {
    console.error('[Public Hotel API] Error:', error)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500, headers: corsHeaders })
  }
}