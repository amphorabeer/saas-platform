export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import moment from 'moment'

// CORS headers for public API
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
    const roomTypeFilter = searchParams.get('roomType')
    const dateStr = searchParams.get('date')
    
    if (!hotelId) {
      return NextResponse.json(
        { error: 'hotelId is required' },
        { status: 400, headers: corsHeaders }
      )
    }
    
    // Lazy import like other working APIs
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()
    
    // Verify hotel exists
    const organization = await prisma.organization.findUnique({
      where: { id: hotelId }
    })
    
    if (!organization) {
      return NextResponse.json(
        { error: 'Hotel not found' },
        { status: 404, headers: corsHeaders }
      )
    }
    
    // Get rooms
    const rooms = await prisma.room.findMany({
      where: {
        organizationId: hotelId,
        isActive: true,
        ...(roomTypeFilter && { roomType: roomTypeFilter })
      }
    })
    
    // Get room rates
    const roomRates = await prisma.roomRate.findMany({
      where: {
        organizationId: hotelId,
        ...(roomTypeFilter && { roomTypeCode: roomTypeFilter })
      }
    })
    
    // Build rate lookup
    const ratesByType: Record<string, { weekday: number; weekend: number }> = {}
    roomRates.forEach(rate => {
      if (!ratesByType[rate.roomTypeCode]) {
        ratesByType[rate.roomTypeCode] = { weekday: 0, weekend: 0 }
      }
      if (rate.dayOfWeek === 0 || rate.dayOfWeek === 6) {
        ratesByType[rate.roomTypeCode].weekend = rate.price
      } else if (rate.dayOfWeek === 1) {
        ratesByType[rate.roomTypeCode].weekday = rate.price
      }
    })
    
    // Group rooms by type
    const roomTypes: Record<string, any> = {}
    rooms.forEach(room => {
      const type = room.roomType || 'standard'
      if (!roomTypes[type]) {
        const roomData = room.roomData as any
        const rates = ratesByType[type] || { weekday: room.basePrice || 100, weekend: room.basePrice || 100 }
        
        roomTypes[type] = {
          roomType: type,
          name: type.charAt(0).toUpperCase() + type.slice(1),
          description: roomData?.description || '',
          maxOccupancy: roomData?.maxOccupancy || room.maxOccupancy || 2,
          amenities: roomData?.amenities || [],
          images: roomData?.images || [],
          basePrice: room.basePrice,
          weekdayRate: rates.weekday || room.basePrice || 100,
          weekendRate: rates.weekend || rates.weekday || room.basePrice || 100,
          totalRooms: 0
        }
      }
      roomTypes[type].totalRooms++
    })
    
    // Build response
    const response = {
      hotelId,
      hotelName: organization.name,
      currency: 'GEL',
      roomTypes: Object.values(roomTypes),
      policies: {
        checkInTime: '14:00',
        checkOutTime: '12:00',
        cancellationPolicy: 'Free cancellation up to 24 hours before check-in'
      },
      generatedAt: new Date().toISOString()
    }
    
    return NextResponse.json(response, { headers: corsHeaders })
    
  } catch (error: any) {
    console.error('[Public Rates API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    )
  }
}