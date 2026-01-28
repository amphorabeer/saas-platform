export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

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
    
    if (!hotelId) {
      return NextResponse.json(
        { error: 'hotelId is required' },
        { status: 400, headers: corsHeaders }
      )
    }
    
    // Lazy import like other working APIs
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()
    
    // Get organization
    const organization = await prisma.organization.findUnique({
      where: { id: hotelId }
    })
    
    if (!organization) {
      return NextResponse.json(
        { error: 'Hotel not found' },
        { status: 404, headers: corsHeaders }
      )
    }
    
    // Get rooms summary
    const rooms = await prisma.room.findMany({
      where: {
        organizationId: hotelId,
        isActive: true
      }
    })
    
    // Get room rates for starting price
    const roomRates = await prisma.roomRate.findMany({
      where: { organizationId: hotelId }
    })
    
    const minRate = roomRates.length > 0 
      ? Math.min(...roomRates.map(r => r.price))
      : rooms.length > 0 ? Math.min(...rooms.map(r => r.basePrice || 100)) : 100
    
    // Group rooms by type
    const roomTypes: Record<string, any> = {}
    rooms.forEach(room => {
      const type = room.roomType || 'standard'
      if (!roomTypes[type]) {
        const roomData = room.roomData as any
        roomTypes[type] = {
          type,
          name: type.charAt(0).toUpperCase() + type.slice(1),
          count: 0,
          maxOccupancy: roomData?.maxOccupancy || room.maxOccupancy || 2,
          amenities: roomData?.amenities || [],
          description: roomData?.description || '',
          images: roomData?.images || []
        }
      }
      roomTypes[type].count++
    })
    
    // Build response
    const response = {
      id: hotelId,
      name: organization.name,
      slug: organization.slug,
      description: `Welcome to ${organization.name}`,
      
      contact: {
        email: '',
        phone: '',
        address: '',
        city: '',
        country: 'Georgia'
      },
      
      rooms: {
        total: rooms.length,
        types: Object.values(roomTypes)
      },
      
      pricing: {
        currency: 'GEL',
        startingFrom: minRate
      },
      
      amenities: [
        'Free WiFi',
        'Parking',
        'Room Service',
        'Reception 24/7'
      ],
      
      policies: {
        checkInTime: '14:00',
        checkOutTime: '12:00',
        cancellationPolicy: 'Free cancellation up to 24 hours before check-in'
      },
      
      generatedAt: new Date().toISOString()
    }
    
    return NextResponse.json(response, { headers: corsHeaders })
    
  } catch (error: any) {
    console.error('[Public Hotel API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    )
  }
}