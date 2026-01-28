export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

// Create prisma instance for public API
const prisma = new PrismaClient()

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
 * GET /api/public/hotel
 * 
 * Query params:
 * - hotelId: string (required) - Organization ID
 * 
 * Returns hotel information for website display
 */
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
      : Math.min(...rooms.map(r => r.basePrice || 100))
    
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
    
    // Get hotel settings if available
    let settings: any = {}
    try {
      const settingsRecord = await prisma.setting.findFirst({
        where: { organizationId: hotelId }
      })
      if (settingsRecord?.settingsData) {
        settings = settingsRecord.settingsData
      }
    } catch (e) {
      // Settings table might not exist
    }
    
    // Build response
    const response = {
      id: hotelId,
      name: organization.name,
      slug: organization.slug,
      description: settings.description || `Welcome to ${organization.name}`,
      
      // Contact info
      contact: {
        email: settings.email || '',
        phone: settings.phone || '',
        address: settings.address || '',
        city: settings.city || '',
        country: settings.country || 'Georgia'
      },
      
      // Location
      location: {
        address: settings.address || '',
        city: settings.city || '',
        country: settings.country || 'Georgia',
        latitude: settings.latitude || null,
        longitude: settings.longitude || null,
        mapUrl: settings.mapUrl || null
      },
      
      // Room summary
      rooms: {
        total: rooms.length,
        types: Object.values(roomTypes)
      },
      
      // Pricing
      pricing: {
        currency: 'GEL',
        startingFrom: minRate
      },
      
      // Amenities
      amenities: settings.amenities || [
        'Free WiFi',
        'Parking',
        'Room Service',
        'Reception 24/7'
      ],
      
      // Policies
      policies: {
        checkInTime: settings.checkInTime || '14:00',
        checkOutTime: settings.checkOutTime || '12:00',
        cancellationPolicy: settings.cancellationPolicy || 'Free cancellation up to 24 hours before check-in',
        childPolicy: settings.childPolicy || 'Children of all ages are welcome',
        petPolicy: settings.petPolicy || 'Pets are not allowed',
        paymentMethods: settings.paymentMethods || ['Cash', 'Card']
      },
      
      // Social & Links
      links: {
        website: settings.website || null,
        facebook: settings.facebook || null,
        instagram: settings.instagram || null,
        tripadvisor: settings.tripadvisor || null,
        booking: settings.bookingUrl || null
      },
      
      // Images
      images: {
        logo: settings.logo || null,
        cover: settings.coverImage || null,
        gallery: settings.gallery || []
      },
      
      // Languages
      languages: settings.languages || ['ka', 'en'],
      
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