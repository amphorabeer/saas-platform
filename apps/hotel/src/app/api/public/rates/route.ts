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

/**
 * GET /api/public/rates
 * 
 * Query params:
 * - hotelId: string (required) - Organization ID
 * - roomType?: string (optional) - Filter by room type
 * - date?: string (optional) - Specific date for rate (YYYY-MM-DD)
 * 
 * Returns room types with their rates
 */
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
    
    // Get seasons (for seasonal pricing info)
    const seasons = await prisma.season.findMany({
      where: {
        organizationId: hotelId,
        isActive: true
      }
    })
    
    // Build rate lookup
    const ratesByType: Record<string, { weekday: number; weekend: number; rates: any[] }> = {}
    roomRates.forEach(rate => {
      if (!ratesByType[rate.roomTypeCode]) {
        ratesByType[rate.roomTypeCode] = { weekday: 0, weekend: 0, rates: [] }
      }
      ratesByType[rate.roomTypeCode].rates.push(rate)
      if (rate.dayOfWeek === 0 || rate.dayOfWeek === 6) {
        ratesByType[rate.roomTypeCode].weekend = rate.price
      } else if (rate.dayOfWeek === 1) { // Monday as reference for weekday
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
          totalRooms: 0,
          availableRooms: 0 // Would need date to calculate
        }
      }
      roomTypes[type].totalRooms++
    })
    
    // If specific date requested, calculate rate for that date
    let dateRate = null
    if (dateStr) {
      const date = moment(dateStr)
      if (date.isValid()) {
        const dayOfWeek = date.day()
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
        
        // Check for active season
        const activeSeason = seasons.find(s => {
          const start = moment(s.startDate)
          const end = moment(s.endDate)
          return date.isBetween(start, end, 'day', '[]')
        })
        
        dateRate = {
          date: dateStr,
          dayOfWeek,
          dayName: date.format('dddd'),
          isWeekend,
          season: activeSeason ? {
            name: activeSeason.name,
            priceModifier: activeSeason.priceModifier
          } : null,
          ratesByType: Object.entries(roomTypes).map(([type, data]: [string, any]) => {
            let baseRate = isWeekend ? data.weekendRate : data.weekdayRate
            if (activeSeason) {
              baseRate = Math.round(baseRate * activeSeason.priceModifier)
            }
            return {
              roomType: type,
              rate: baseRate
            }
          })
        }
      }
    }
    
    // Build response
    const response = {
      hotelId,
      hotelName: organization.name,
      currency: 'GEL',
      roomTypes: Object.values(roomTypes),
      seasons: seasons.map(s => ({
        name: s.name,
        startDate: moment(s.startDate).format('YYYY-MM-DD'),
        endDate: moment(s.endDate).format('YYYY-MM-DD'),
        priceModifier: s.priceModifier,
        description: `${s.priceModifier > 1 ? '+' : ''}${Math.round((s.priceModifier - 1) * 100)}%`
      })),
      ...(dateRate && { dateRate }),
      policies: {
        checkInTime: '14:00',
        checkOutTime: '12:00',
        cancellationPolicy: 'Free cancellation up to 24 hours before check-in',
        childPolicy: 'Children of all ages are welcome',
        petPolicy: 'Pets are not allowed'
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