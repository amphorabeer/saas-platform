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
    
    // Use correct model: HotelRoom
    const rooms = await prisma.hotelRoom.findMany({
      where: { tenantId: hotelId }
    })
    
    // Use correct model: HotelRoomRate
    const roomRates = await prisma.hotelRoomRate.findMany({
      where: { tenantId: hotelId }
    })
    
    const ratesByType: Record<string, { weekday: number; weekend: number }> = {}
    roomRates.forEach(rate => {
      const type = rate.roomType || 'STANDARD'
      if (!ratesByType[type]) {
        ratesByType[type] = { weekday: 0, weekend: 0 }
      }
      if (rate.dayOfWeek === 0 || rate.dayOfWeek === 6) {
        ratesByType[type].weekend = rate.price
      } else if (rate.dayOfWeek === 1) {
        ratesByType[type].weekday = rate.price
      }
    })
    
    const roomTypes: Record<string, any> = {}
    rooms.forEach(room => {
      const type = room.roomType || 'STANDARD'
      if (!roomTypes[type]) {
        const rates = ratesByType[type] || { weekday: room.basePrice || 100, weekend: room.basePrice || 100 }
        roomTypes[type] = {
          roomType: type,
          name: type,
          maxOccupancy: room.maxOccupancy || 2,
          weekdayRate: rates.weekday || room.basePrice || 100,
          weekendRate: rates.weekend || rates.weekday || room.basePrice || 100,
          totalRooms: 0
        }
      }
      roomTypes[type].totalRooms++
    })
    
    return NextResponse.json({
      hotelId,
      hotelName: organization.name,
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