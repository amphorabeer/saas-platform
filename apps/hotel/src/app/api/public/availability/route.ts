export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import moment from 'moment'

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
    const checkIn = searchParams.get('checkIn')
    const checkOut = searchParams.get('checkOut')
    const adults = parseInt(searchParams.get('adults') || '2')
    const children = parseInt(searchParams.get('children') || '0')
    
    if (!hotelId) {
      return NextResponse.json({ error: 'hotelId is required' }, { status: 400, headers: corsHeaders })
    }
    
    if (!checkIn || !checkOut) {
      return NextResponse.json({ error: 'checkIn and checkOut required (YYYY-MM-DD)' }, { status: 400, headers: corsHeaders })
    }
    
    const checkInDate = moment(checkIn)
    const checkOutDate = moment(checkOut)
    
    if (!checkInDate.isValid() || !checkOutDate.isValid()) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400, headers: corsHeaders })
    }
    
    if (checkInDate.isBefore(moment().startOf('day'))) {
      return NextResponse.json({ error: 'checkIn cannot be in the past' }, { status: 400, headers: corsHeaders })
    }
    
    if (checkOutDate.isSameOrBefore(checkInDate)) {
      return NextResponse.json({ error: 'checkOut must be after checkIn' }, { status: 400, headers: corsHeaders })
    }
    
    const nights = checkOutDate.diff(checkInDate, 'days')
    
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
    
    // Use correct model: HotelReservation
    const existingReservations = await prisma.hotelReservation.findMany({
      where: {
        tenantId: hotelId,
        status: { in: ['CONFIRMED', 'CHECKED_IN', 'PENDING'] },
        checkIn: { lt: checkOutDate.toDate() },
        checkOut: { gt: checkInDate.toDate() }
      },
      select: { roomId: true }
    })
    
    const occupiedRoomIds = new Set(existingReservations.map(r => r.roomId))
    
    const availableRooms = rooms.filter(room => {
      if (occupiedRoomIds.has(room.id)) return false
      if (adults + children > (room.maxOccupancy || 4)) return false
      return true
    })
    
    // Use correct model: HotelRoomRate
    const roomRates = await prisma.hotelRoomRate.findMany({
      where: { tenantId: hotelId }
    })
    
    const ratesByType: Record<string, { weekday: number; weekend: number }> = {}
    roomRates.forEach(rate => {
      const type = rate.roomType || 'STANDARD'
      if (!ratesByType[type]) ratesByType[type] = { weekday: 0, weekend: 0 }
      if (rate.dayOfWeek === 0 || rate.dayOfWeek === 6) {
        ratesByType[type].weekend = rate.price
      } else {
        ratesByType[type].weekday = rate.price
      }
    })
    
    const calculatePrice = (room: any): number => {
      const type = room.roomType || 'STANDARD'
      const rates = ratesByType[type] || { weekday: room.basePrice || 100, weekend: room.basePrice || 100 }
      let total = 0
      for (let i = 0; i < nights; i++) {
        const d = moment(checkIn).add(i, 'days').day()
        total += (d === 0 || d === 6) ? (rates.weekend || rates.weekday) : rates.weekday
      }
      return total
    }
    
    const roomsByType: Record<string, any[]> = {}
    availableRooms.forEach(room => {
      const type = room.roomType || 'STANDARD'
      if (!roomsByType[type]) roomsByType[type] = []
      const totalPrice = calculatePrice(room)
      roomsByType[type].push({
        id: room.id,
        roomNumber: room.roomNumber,
        roomType: type,
        floor: room.floor,
        maxOccupancy: room.maxOccupancy || 2,
        pricePerNight: Math.round(totalPrice / nights),
        totalPrice,
        nights
      })
    })
    
    return NextResponse.json({
      hotelId,
      hotelName: organization.name,
      checkIn,
      checkOut,
      nights,
      guests: { adults, children },
      currency: 'GEL',
      availableRoomTypes: Object.entries(roomsByType).map(([type, rms]) => ({
        roomType: type,
        availableCount: rms.length,
        startingPrice: Math.min(...rms.map(r => r.pricePerNight)),
        rooms: rms.sort((a, b) => a.pricePerNight - b.pricePerNight)
      })),
      totalAvailable: availableRooms.length,
      generatedAt: new Date().toISOString()
    }, { headers: corsHeaders })
    
  } catch (error: any) {
    console.error('[Public Availability API] Error:', error)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500, headers: corsHeaders })
  }
}