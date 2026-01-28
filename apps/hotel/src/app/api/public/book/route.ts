export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import moment from 'moment'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Hotel-ID',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { hotelId, roomId, checkIn, checkOut, guest, adults = 2, children = 0, specialRequests } = body
    
    const errors: string[] = []
    if (!hotelId) errors.push('hotelId required')
    if (!roomId) errors.push('roomId required')
    if (!checkIn) errors.push('checkIn required')
    if (!checkOut) errors.push('checkOut required')
    if (!guest?.firstName) errors.push('guest.firstName required')
    if (!guest?.lastName) errors.push('guest.lastName required')
    if (!guest?.email) errors.push('guest.email required')
    if (!guest?.phone) errors.push('guest.phone required')
    
    if (errors.length > 0) {
      return NextResponse.json({ error: 'Validation failed', details: errors }, { status: 400, headers: corsHeaders })
    }
    
    const checkInDate = moment(checkIn)
    const checkOutDate = moment(checkOut)
    
    if (checkInDate.isBefore(moment().startOf('day'))) {
      return NextResponse.json({ error: 'checkIn cannot be in the past' }, { status: 400, headers: corsHeaders })
    }
    
    if (checkOutDate.isSameOrBefore(checkInDate)) {
      return NextResponse.json({ error: 'checkOut must be after checkIn' }, { status: 400, headers: corsHeaders })
    }
    
    const nights = checkOutDate.diff(checkInDate, 'days')
    
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()
    
    // Try to find organization
    let organization = await prisma.organization.findUnique({ where: { id: hotelId } })
    if (!organization) {
      organization = await prisma.organization.findFirst({ where: { tenantId: hotelId } })
    }
    
    const orgName = organization?.name || 'Hotel'
    
    // HotelRoom uses tenantId
    const room = await prisma.hotelRoom.findFirst({
      where: { id: roomId, tenantId: hotelId }
    })
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404, headers: corsHeaders })
    }
    
    // HotelReservation uses tenantId
    const overlapping = await prisma.hotelReservation.findFirst({
      where: {
        tenantId: hotelId,
        roomId,
        status: { in: ['CONFIRMED', 'CHECKED_IN', 'PENDING'] },
        checkIn: { lt: checkOutDate.toDate() },
        checkOut: { gt: checkInDate.toDate() }
      }
    })
    
    if (overlapping) {
      return NextResponse.json({ error: 'Room not available for selected dates' }, { status: 409, headers: corsHeaders })
    }
    
    // HotelRoomRate uses organizationId
    const roomRates = await prisma.hotelRoomRate.findMany({
      where: { organizationId: organization?.id || hotelId, roomTypeCode: room.roomType || 'STANDARD' }
    })
    
    const ratesByDay: Record<number, number> = {}
    roomRates.forEach(rate => { 
      if (rate.dayOfWeek !== null) ratesByDay[rate.dayOfWeek] = rate.basePrice 
    })
    
    const basePrice = Number(room.basePrice) || 100
    let totalAmount = 0
    for (let i = 0; i < nights; i++) {
      const d = moment(checkIn).add(i, 'days').day()
      totalAmount += ratesByDay[d] || basePrice
    }
    
    const confirmationNumber = `WEB${moment().format('YYMMDD')}${Math.random().toString(36).substring(2, 8).toUpperCase()}`
    
    // HotelReservation uses tenantId
    const reservation = await prisma.hotelReservation.create({
      data: {
        tenantId: hotelId,
        roomId,
        guestName: `${guest.firstName} ${guest.lastName}`,
        guestEmail: guest.email,
        guestPhone: guest.phone,
        checkIn: checkInDate.toDate(),
        checkOut: checkOutDate.toDate(),
        adults,
        children,
        totalAmount,
        status: 'CONFIRMED',
        source: 'WEBSITE',
        notes: specialRequests || '',
        confirmationNumber
      }
    })
    
    console.log(`[Public Book] New booking: ${confirmationNumber}`)
    
    // Send confirmation email
    try {
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">🏨 ${orgName}</h1>
            <p style="color: rgba(255,255,255,0.9); margin-top: 10px;">ჯავშნის დადასტურება</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border: 1px solid #e9ecef;">
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: #333; margin-top: 0;">✅ ჯავშანი დადასტურებულია!</h2>
              <p style="font-size: 24px; color: #667eea; font-weight: bold; margin: 10px 0;">
                კოდი: ${confirmationNumber}
              </p>
            </div>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="color: #333; margin-top: 0;">📋 ჯავშნის დეტალები</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #666;">სტუმარი:</td>
                  <td style="padding: 8px 0; font-weight: bold;">${guest.firstName} ${guest.lastName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;">ოთახი:</td>
                  <td style="padding: 8px 0; font-weight: bold;">#${room.roomNumber} (${room.roomType})</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;">შესვლა:</td>
                  <td style="padding: 8px 0; font-weight: bold;">${checkIn} (14:00-დან)</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;">გასვლა:</td>
                  <td style="padding: 8px 0; font-weight: bold;">${checkOut} (12:00-მდე)</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;">ღამეები:</td>
                  <td style="padding: 8px 0; font-weight: bold;">${nights}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;">სტუმრები:</td>
                  <td style="padding: 8px 0; font-weight: bold;">${adults} მოზრდილი${children > 0 ? `, ${children} ბავშვი` : ''}</td>
                </tr>
              </table>
            </div>
            
            <div style="background: #667eea; color: white; padding: 20px; border-radius: 8px; text-align: center;">
              <p style="margin: 0; font-size: 14px;">სულ გადასახდელი</p>
              <p style="margin: 5px 0 0 0; font-size: 32px; font-weight: bold;">₾${totalAmount}</p>
            </div>
            
            ${specialRequests ? `
            <div style="background: white; padding: 20px; border-radius: 8px; margin-top: 20px;">
              <h3 style="color: #333; margin-top: 0;">📝 სპეციალური მოთხოვნები</h3>
              <p style="color: #666;">${specialRequests}</p>
            </div>
            ` : ''}
          </div>
          
          <div style="padding: 20px; text-align: center; color: #666; font-size: 12px;">
            <p>გმადლობთ რომ აირჩიეთ ${orgName}!</p>
            <p>კითხვების შემთხვევაში დაგვიკავშირდით.</p>
          </div>
        </div>
      `
      
      await fetch(new URL('/api/email/send', request.url).toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: [guest.email],
          subject: `✅ ჯავშანი დადასტურებულია - ${confirmationNumber} | ${orgName}`,
          body: emailHtml
        })
      })
      console.log(`[Public Book] Confirmation email sent to ${guest.email}`)
    } catch (emailError) {
      console.error('[Public Book] Failed to send confirmation email:', emailError)
      // Don't fail the booking if email fails
    }
    
    return NextResponse.json({
      success: true,
      booking: {
        confirmationNumber,
        reservationId: reservation.id,
        status: 'CONFIRMED',
        hotel: { id: hotelId, name: orgName },
        room: { id: room.id, number: room.roomNumber, type: room.roomType },
        dates: { checkIn, checkOut, nights },
        guests: { adults, children },
        pricing: { currency: 'GEL', totalAmount, pricePerNight: Math.round(totalAmount / nights) },
        createdAt: new Date().toISOString()
      }
    }, { status: 201, headers: corsHeaders })
    
  } catch (error: any) {
    console.error('[Public Book API] Error:', error)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500, headers: corsHeaders })
  }
}