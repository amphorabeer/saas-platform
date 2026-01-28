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
 * GET /api/public/availability
 * 
 * Query params:
 * - hotelId: string (required) - Organization ID
 * - checkIn: string (required) - YYYY-MM-DD
 * - checkOut: string (required) - YYYY-MM-DD
 * - adults?: number (default: 2)
 * - children?: number (default: 0)
 * - roomType?: string (optional filter)
 * 
 * Returns available rooms with rates for the given period
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Get parameters
    const hotelId = searchParams.get('hotelId') || request.headers.get('X-Hotel-ID')
    const checkIn = searchParams.get('checkIn')
    const checkOut = searchParams.get('checkOut')
    const adults = parseInt(searchParams.get('adults') || '2')
    const children = parseInt(searchParams.get('children') || '0')
    const roomTypeFilter = searchParams.get('roomType')
    
    // Validate required params
    if (!hotelId) {
      return NextResponse.json(
        { error: 'hotelId is required' },
        { status: 400, headers: corsHeaders }
      )
    }
    
    if (!checkIn || !checkOut) {
      return NextResponse.json(
        { error: 'checkIn and checkOut dates are required (YYYY-MM-DD)' },
        { status: 400, headers: corsHeaders }
      )
    }
    
    // Validate dates
    const checkInDate = moment(checkIn)
    const checkOutDate = moment(checkOut)
    
    if (!checkInDate.isValid() || !checkOutDate.isValid()) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400, headers: corsHeaders }
      )
    }
    
    if (checkInDate.isBefore(moment().startOf('day'))) {
      return NextResponse.json(
        { error: 'checkIn date cannot be in the past' },
        { status: 400, headers: corsHeaders }
      )
    }
    
    if (checkOutDate.isSameOrBefore(checkInDate)) {
      return NextResponse.json(
        { error: 'checkOut must be after checkIn' },
        { status: 400, headers: corsHeaders }
      )
    }
    
    const nights = checkOutDate.diff(checkInDate, 'days')
    
    // Import Prisma
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
    
    // Get all rooms for this hotel
    const rooms = await prisma.room.findMany({
      where: {
        organizationId: hotelId,
        isActive: true,
        ...(roomTypeFilter && { roomType: roomTypeFilter })
      }
    })
    
    // Get existing reservations that overlap with requested dates
    const existingReservations = await prisma.reservation.findMany({
      where: {
        organizationId: hotelId,
        status: {
          in: ['CONFIRMED', 'CHECKED_IN', 'PENDING']
        },
        // Overlap check: existing checkIn < requested checkOut AND existing checkOut > requested checkIn
        checkIn: { lt: checkOutDate.toDate() },
        checkOut: { gt: checkInDate.toDate() }
      },
      select: {
        roomId: true,
        roomNumber: true
      }
    })
    
    // Get set of occupied room IDs
    const occupiedRoomIds = new Set(existingReservations.map(r => r.roomId))
    const occupiedRoomNumbers = new Set(existingReservations.map(r => r.roomNumber).filter(Boolean))
    
    // Filter available rooms
    const availableRooms = rooms.filter(room => {
      // Check by ID
      if (room.id && occupiedRoomIds.has(room.id)) return false
      // Check by room number
      if (room.roomNumber && occupiedRoomNumbers.has(room.roomNumber)) return false
      // Check capacity
      const roomData = room.roomData as any
      const maxOccupancy = roomData?.maxOccupancy || room.maxOccupancy || 4
      if (adults + children > maxOccupancy) return false
      return true
    })
    
    // Get room rates
    const roomRates = await prisma.roomRate.findMany({
      where: { organizationId: hotelId }
    })
    
    // Build rate lookup by room type
    const ratesByType: Record<string, { weekday: number; weekend: number }> = {}
    roomRates.forEach(rate => {
      if (!ratesByType[rate.roomTypeCode]) {
        ratesByType[rate.roomTypeCode] = { weekday: 0, weekend: 0 }
      }
      if (rate.dayOfWeek === 0 || rate.dayOfWeek === 6) {
        ratesByType[rate.roomTypeCode].weekend = rate.price
      } else {
        ratesByType[rate.roomTypeCode].weekday = rate.price
      }
    })
    
    // Calculate total price for each room
    const calculateTotalPrice = (room: any): number => {
      const roomType = room.roomType || 'standard'
      const rates = ratesByType[roomType] || { weekday: room.basePrice || 100, weekend: room.basePrice || 100 }
      
      let total = 0
      for (let i = 0; i < nights; i++) {
        const date = moment(checkIn).add(i, 'days')
        const dayOfWeek = date.day()
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
        total += isWeekend ? (rates.weekend || rates.weekday) : rates.weekday
      }
      
      return total
    }
    
    // Group available rooms by type
    const roomsByType: Record<string, any[]> = {}
    availableRooms.forEach(room => {
      const type = room.roomType || 'standard'
      if (!roomsByType[type]) {
        roomsByType[type] = []
      }
      
      const roomData = room.roomData as any
      const totalPrice = calculateTotalPrice(room)
      const pricePerNight = Math.round(totalPrice / nights)
      
      roomsByType[type].push({
        id: room.id,
        roomNumber: room.roomNumber,
        roomType: type,
        floor: room.floor,
        maxOccupancy: roomData?.maxOccupancy || room.maxOccupancy || 2,
        amenities: roomData?.amenities || [],
        description: roomData?.description || '',
        images: roomData?.images || [],
        basePrice: room.basePrice,
        pricePerNight,
        totalPrice,
        nights
      })
    })
    
    // Build response
    const response = {
      hotelId,
      hotelName: organization.name,
      checkIn,
      checkOut,
      nights,
      guests: { adults, children },
      currency: 'GEL',
      availableRoomTypes: Object.entries(roomsByType).map(([type, rooms]) => ({
        roomType: type,
        availableCount: rooms.length,
        startingPrice: Math.min(...rooms.map(r => r.pricePerNight)),
        rooms: rooms.sort((a, b) => a.pricePerNight - b.pricePerNight)
      })),
      totalAvailable: availableRooms.length,
      generatedAt: new Date().toISOString()
    }
    
    return NextResponse.json(response, { headers: corsHeaders })
    
  } catch (error: any) {
    console.error('[Public Availability API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    )
  }
}