export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import moment from 'moment'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Hotel-ID',
}

// Telegram notification
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || ''

async function sendTelegramNotification(booking: {
  type: 'spa' | 'restaurant' | 'hotel'
  bookingNumber: string
  guestName: string
  guestPhone: string
  date: string
  time?: string
  guests?: number
  price?: number
  details?: string
}): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return

  const typeEmoji: Record<string, string> = { spa: '🍺', restaurant: '🍽️', hotel: '🏨' }
  const typeName: Record<string, string> = { spa: 'ლუდის სპა', restaurant: 'რესტორანი', hotel: 'სასტუმრო' }

  const message = `
🔔 *ახალი ჯავშანი!*

${typeEmoji[booking.type]} *${typeName[booking.type]}*
📋 \`${booking.bookingNumber}\`
👤 ${booking.guestName}
📞 ${booking.guestPhone}
🗓 ${booking.date}${booking.time ? ` • ${booking.time}` : ''}
${booking.guests ? `👥 ${booking.guests} სტუმარი` : ''}
${booking.price ? `💰 ₾${booking.price}` : ''}
${booking.details ? `\n📝 ${booking.details}` : ''}
`.trim()

  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message, parse_mode: 'Markdown' })
    })
  } catch (error) {
    console.error('[Telegram] Failed:', error)
  }
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
    
    const orgName = organization?.name || 'Brewery House'
    
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
      const bookingUrl = `https://www.breweryhouse.ge/booking/${confirmationNumber}`
      
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>სასტუმროს ჯავშანი - ${confirmationNumber}</title>
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
          <div style="background: linear-gradient(135deg, #1e40af 0%, #7c3aed 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🏨 ${orgName}</h1>
            <p style="color: #e0e7ff; margin-top: 10px; font-size: 16px;">სასტუმრო - ჯავშნის დადასტურება</p>
          </div>
          
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb;">
            <div style="background: #ede9fe; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
              <h2 style="color: #5b21b6; margin-top: 0;">✅ ჯავშანი დადასტურებულია!</h2>
              <p style="font-size: 28px; color: #7c3aed; font-weight: bold; margin: 10px 0; letter-spacing: 2px;">
                ${confirmationNumber}
              </p>
            </div>
            
            <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="color: #374151; margin-top: 0; border-bottom: 2px solid #7c3aed; padding-bottom: 10px;">📋 ჯავშნის დეტალები</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 12px 0; color: #6b7280; border-bottom: 1px solid #e5e7eb;">სტუმარი:</td>
                  <td style="padding: 12px 0; font-weight: bold; color: #111827; border-bottom: 1px solid #e5e7eb;">${guest.firstName} ${guest.lastName}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; color: #6b7280; border-bottom: 1px solid #e5e7eb;">ოთახი:</td>
                  <td style="padding: 12px 0; font-weight: bold; color: #111827; border-bottom: 1px solid #e5e7eb;">#${room.roomNumber} (${room.roomType})</td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; color: #6b7280; border-bottom: 1px solid #e5e7eb;">შესვლა:</td>
                  <td style="padding: 12px 0; font-weight: bold; color: #111827; border-bottom: 1px solid #e5e7eb;">${checkIn} (14:00-დან)</td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; color: #6b7280; border-bottom: 1px solid #e5e7eb;">გასვლა:</td>
                  <td style="padding: 12px 0; font-weight: bold; color: #111827; border-bottom: 1px solid #e5e7eb;">${checkOut} (12:00-მდე)</td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; color: #6b7280; border-bottom: 1px solid #e5e7eb;">ღამეები:</td>
                  <td style="padding: 12px 0; font-weight: bold; color: #111827; border-bottom: 1px solid #e5e7eb;">${nights}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; color: #6b7280;">სტუმრები:</td>
                  <td style="padding: 12px 0; font-weight: bold; color: #111827;">${adults} მოზრდილი${children > 0 ? `, ${children} ბავშვი` : ''}</td>
                </tr>
              </table>
            </div>
            
            <div style="background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%); color: white; padding: 20px; border-radius: 8px; text-align: center;">
              <p style="margin: 0; font-size: 14px; opacity: 0.9;">სულ გადასახდელი</p>
              <p style="margin: 5px 0 0 0; font-size: 36px; font-weight: bold;">₾${totalAmount}</p>
            </div>
            
            ${specialRequests ? `
            <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-top: 20px;">
              <h3 style="color: #374151; margin-top: 0;">📝 სპეციალური მოთხოვნები</h3>
              <p style="color: #6b7280; margin: 0;">${specialRequests}</p>
            </div>
            ` : ''}
            
            <div style="text-align: center; margin-top: 25px;">
              <a href="${bookingUrl}" style="display: inline-block; background: #059669; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
                📄 ჯავშნის ნახვა / დაბეჭდვა
              </a>
            </div>
          </div>
          
          <div style="background: #1f2937; padding: 25px; text-align: center; color: #9ca3af; font-size: 13px; border-radius: 0 0 10px 10px;">
            <p style="margin: 0 0 8px 0; font-weight: bold; color: #ffffff; font-size: 15px;">გმადლობთ რომ აირჩიეთ Brewery House!</p>
            <p style="margin: 8px 0;">📍 ასპინძა, შორეთის ქ. 21, სამცხე-ჯავახეთი</p>
            <p style="margin: 8px 0;">📞 +995 599 946 500</p>
            <p style="margin: 15px 0 0 0;">
              <a href="https://www.breweryhouse.ge" style="color: #a78bfa; text-decoration: none;">www.breweryhouse.ge</a>
            </p>
          </div>
        </body>
        </html>
      `
      
      await fetch(new URL('/api/email/send', request.url).toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: [guest.email],
          subject: `✅ სასტუმროს ჯავშანი დადასტურებულია - ${confirmationNumber} | ${orgName}`,
          body: emailHtml
        })
      })
      console.log(`[Public Book] Confirmation email sent to ${guest.email}`)
    } catch (emailError) {
      console.error('[Public Book] Failed to send confirmation email:', emailError)
      // Don't fail the booking if email fails
    }

    // Send Telegram notification
    await sendTelegramNotification({
      type: 'hotel',
      bookingNumber: confirmationNumber,
      guestName: `${guest.firstName} ${guest.lastName}`,
      guestPhone: guest.phone,
      date: `${checkIn} → ${checkOut}`,
      guests: adults + children,
      price: totalAmount,
      details: `ოთახი #${room.roomNumber} (${room.roomType}) • ${nights} ღამე`
    })
    
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
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Public Book API] Error:', error)
    return NextResponse.json({ error: 'Internal server error', details: errorMessage }, { status: 500, headers: corsHeaders })
  }
}
