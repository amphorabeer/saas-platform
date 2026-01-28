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
    
    // Try to find organization
    let organization = await prisma.organization.findUnique({ where: { id: hotelId } })
    if (!organization) {
      organization = await prisma.organization.findFirst({ where: { tenantId: hotelId } })
    }
    
    const orgName = organization?.name || 'Hotel'
    
    // HotelRoom uses tenantId - use hotelId directly
    const rooms = await prisma.hotelRoom.findMany({
      where: { tenantId: hotelId }
    })
    
    // HotelRoomRate uses organizationId
    const roomRates = await prisma.hotelRoomRate.findMany({
      where: { organizationId: organization?.id || hotelId }
    })
    
    const ratesByType: Record<string, { weekday: number; weekend: number }> = {}
    roomRates.forEach(rate => {
      const type = rate.roomTypeCode || 'STANDARD'
      if (!ratesByType[type]) ratesByType[type] = { weekday: 0, weekend: 0 }
      if (rate.dayOfWeek === 0 || rate.dayOfWeek === 6) {
        ratesByType[type].weekend = rate.basePrice
      } else if (rate.dayOfWeek === 1) {
        ratesByType[type].weekday = rate.basePrice
      }
    })
    
    const roomTypes: Record<string, any> = {}
    rooms.forEach(room => {
      const type = room.roomType || 'STANDARD'
      if (!roomTypes[type]) {
        const basePrice = Number(room.basePrice) || 100
        const rates = ratesByType[type] || { weekday: basePrice, weekend: basePrice }
        roomTypes[type] = {
          roomType: type,
          name: type,
          maxOccupancy: room.maxOccupancy || 2,
          weekdayRate: rates.weekday || basePrice,
          weekendRate: rates.weekend || rates.weekday || basePrice,
          totalRooms: 0
        }
      }
      roomTypes[type].totalRooms++
    })
    
    return NextResponse.json({
      hotelId,
      hotelName: orgName,
      currency: 'GEL',
      roomTypes: Object.values(roomTypes),
      policies: { checkInTime: '14:00', checkOutTime: '12:00' },
      generatedAt: new Date().toISOString()
    }, { headers: corsHeaders })
    
  } catch (error: any) {
    console.error('[Public Rates API] Error:', error)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500, headers: corsHeaders })
  }
}