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
    
    // Try to find organization by id OR by tenantId field
    let organization = await prisma.organization.findUnique({
      where: { id: hotelId }
    })
    
    // If not found by id, try to find by tenantId (some orgs use different IDs)
    if (!organization) {
      organization = await prisma.organization.findFirst({
        where: { tenantId: hotelId }
      })
    }
    
    // Use the hotelId directly as tenantId for rooms lookup
    const tenantIdForRooms = hotelId
    
    // HotelRoom uses tenantId
    const rooms = await prisma.hotelRoom.findMany({
      where: { tenantId: tenantIdForRooms }
    })
    
    // If we found rooms but no organization, create a virtual org response
    const orgName = organization?.name || 'Hotel'
    const orgSlug = organization?.slug || 'hotel'
    
    // HotelRoomRate uses organizationId - try both
    let roomRates = await prisma.hotelRoomRate.findMany({
      where: { organizationId: hotelId }
    })
    
    // If no rates found with organizationId, the hotel might not have rates configured
    
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
      name: orgName,
      slug: orgSlug,
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