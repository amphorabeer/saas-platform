export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

// CORS headers for public access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

// Telegram notification
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || ''

// Get booking settings for organization (works in public context)
async function getBookingSettings(prisma: any, tenantId: string): Promise<{
  autoConfirmSpa: boolean
  autoConfirmRestaurant: boolean
  autoConfirmHotel: boolean
  sendEmailOnConfirm: boolean
  sendTelegramNotification: boolean
}> {
  const defaults = {
    autoConfirmSpa: true,
    autoConfirmRestaurant: true,
    autoConfirmHotel: true,
    sendEmailOnConfirm: true,
    sendTelegramNotification: true
  }
  
  try {
    // Find organization by tenantId and include hotelSettings
    const org = await prisma.organization.findFirst({
      where: { tenantId },
      include: { hotelSettings: true }
    })
    
    if (!org?.hotelSettings?.settingsData) {
      console.log('[BookingSettings] No settings found, using defaults')
      return defaults
    }
    
    const settingsData = org.hotelSettings.settingsData as any
    const booking = settingsData.booking || {}
    
    console.log('[BookingSettings] Loaded:', booking)
    return { ...defaults, ...booking }
  } catch (e) {
    console.error('[BookingSettings] Error:', e)
    return defaults
  }
}

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
  isPending?: boolean
}): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.log('[Telegram] Missing credentials, skipping notification')
    return
  }

  const typeEmoji: Record<string, string> = { spa: '🍺', restaurant: '🍽️', hotel: '🏨' }
  const typeName: Record<string, string> = { spa: 'ლუდის სპა', restaurant: 'რესტორანი', hotel: 'სასტუმრო' }

  const statusLine = booking.isPending ? '\n⏳ *მოლოდინშია - საჭიროებს დადასტურებას*' : ''

  const message = `
🔔 *ახალი ჯავშანი!*

${typeEmoji[booking.type]} *${typeName[booking.type]}*
📋 \`${booking.bookingNumber}\`
👤 ${booking.guestName}
📞 ${booking.guestPhone}
🗓 ${booking.date}${booking.time ? ` • ${booking.time}` : ''}
${booking.guests ? `👥 ${booking.guests} სტუმარი` : ''}
${booking.price ? `💰 ₾${booking.price}` : ''}${statusLine}
${booking.details ? `\n📝 ${booking.details}` : ''}
`.trim()

  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'Markdown'
      })
    })
    console.log('[Telegram] Notification sent')
  } catch (error) {
    console.error('[Telegram] Failed to send:', error)
  }
}

// All possible time slots
const ALL_TIME_SLOTS = ['10:00', '11:15', '12:30', '13:45', '15:00', '16:15', '17:30', '18:45', '20:00', '21:15'];

// Pricing packages
const PRICING: Record<string, number> = {
  '1-1': 100,  // 1 guest, 1 bath
  '2-1': 150,  // 2 guests, 1 bath
  '2-2': 200,  // 2 guests, 2 baths
  '3-2': 250,  // 3 guests, 2 baths
  '4-2': 300,  // 4 guests, 2 baths
}

// Helper: Convert time to minutes
function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + (m || 0)
}

// Helper: Calculate end time
function calculateEndTime(startTime: string, durationMinutes: number): string {
  const totalMinutes = timeToMinutes(startTime) + durationMinutes
  const endHours = Math.floor(totalMinutes / 60) % 24
  const endMinutes = totalMinutes % 60
  return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`
}

// OPTIONS - CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders })
}

// POST - Create booking
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, name, phone, email, date, time, guests, baths, price, packageId, occasion, notes, source } = body

    console.log(`[Public Bookings] New ${type} booking:`, { name, phone, date, time, guests, baths })

    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()

    // Find organization
    const organization = await prisma.organization.findFirst({
      where: {
        OR: [
          { name: { contains: 'Brewery' } },
          { name: { contains: 'brewery' } }
        ]
      }
    })

    if (!organization) {
      console.error('[Public Bookings] Organization not found')
      return NextResponse.json(
        { error: 'Configuration error' },
        { status: 500, headers: corsHeaders }
      )
    }

    const tenantId = organization.tenantId
    const orgName = organization.name || 'Brewery House'

    // Get booking settings
    const bookingSettings = await getBookingSettings(prisma, tenantId)

    // Generate confirmation code
    const confirmationCode = `${type === 'spa' ? 'SPA' : 'RST'}${Date.now().toString(36).toUpperCase()}`

    if (type === 'spa') {
      // Determine status based on settings
      const autoConfirm = bookingSettings.autoConfirmSpa
      const bookingStatus = autoConfirm ? 'confirmed' : 'pending'
      
      // Check availability first
      const bookingDate = new Date(date)
      const requestedStart = timeToMinutes(time)
      const requestedEnd = requestedStart + 60

      const existingBookings = await prisma.spaBooking.findMany({
        where: {
          tenantId,
          date: bookingDate,
          status: { not: 'cancelled' }
        }
      })

      // Check if time slot is already booked
      const hasConflict = existingBookings.some((booking: { startTime: string; endTime: string }) => {
        const bookingStart = timeToMinutes(booking.startTime)
        const bookingEnd = timeToMinutes(booking.endTime)
        return requestedStart < bookingEnd && requestedEnd > bookingStart
      })

      if (hasConflict) {
        return NextResponse.json(
          { 
            error: 'არჩეული დრო დაკავებულია. გთხოვთ აირჩიოთ სხვა დრო.', 
            errorCode: 'TIME_UNAVAILABLE' 
          },
          { status: 409, headers: corsHeaders }
        )
      }

      // Calculate price based on guests and baths
      const guestCount = guests || 2
      const bathCount = baths || 1
      const priceKey = `${guestCount}-${bathCount}`
      const calculatedPrice = PRICING[priceKey] || price || 150

      // Get bath IDs
      const allBaths = await prisma.spaBath.findMany({
        where: { tenantId, isActive: true },
        orderBy: { name: 'asc' },
        take: bathCount
      })

      const bathId = allBaths[0]?.id || null

      // Create spa booking
      const booking = await prisma.spaBooking.create({
        data: {
          tenantId,
          bookingNumber: confirmationCode,
          bathId,
          guestName: name,
          guestPhone: phone || null,
          guestEmail: email || null,
          date: bookingDate,
          startTime: time,
          endTime: calculateEndTime(time, 60),
          duration: 60,
          guests: guestCount,
          status: bookingStatus,
          paymentStatus: 'pending',
          notes: notes || '',
          totalPrice: calculatedPrice,
          services: { 
            packageId,
            baths: bathCount,
            source: source || 'website' 
          }
        }
      })

      console.log('[Public Bookings] Spa booking created:', booking.id, 'status:', bookingStatus)

      // Send confirmation email ONLY if auto-confirmed
      if (email && autoConfirm && bookingSettings.sendEmailOnConfirm) {
        try {
          const bathLabel = bathCount === 1 ? '1 აბაზანა' : '2 აბაზანა'
          const emailHtml = generateSpaEmailHtml({
            orgName,
            confirmationCode,
            guestName: name,
            guests: guestCount,
            baths: bathCount,
            bathLabel,
            price: calculatedPrice,
            date,
            time
          })

          await fetch(new URL('/api/email/send', request.url).toString(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: [email],
              subject: `✅ სპა ჯავშანი დადასტურებულია - ${confirmationCode} | ${orgName}`,
              body: emailHtml
            })
          })
          console.log(`[Public Bookings] Confirmation email sent to ${email}`)
        } catch (emailError) {
          console.error('[Public Bookings] Failed to send email:', emailError)
        }
      }

      // Send Telegram notification (always, regardless of auto-confirm)
      if (bookingSettings.sendTelegramNotification) {
        await sendTelegramNotification({
          type: 'spa',
          bookingNumber: confirmationCode,
          guestName: name,
          guestPhone: phone || 'არ არის მითითებული',
          date: date,
          time: time,
          guests: guestCount,
          price: calculatedPrice,
          details: `${bathCount} აბაზანა`,
          isPending: !autoConfirm
        })
      }

      return NextResponse.json(
        { 
          success: true, 
          bookingId: booking.id, 
          confirmationCode,
          price: calculatedPrice,
          status: bookingStatus
        },
        { headers: corsHeaders }
      )

    } else if (type === 'restaurant') {
      // Determine status based on settings
      const autoConfirm = bookingSettings.autoConfirmRestaurant
      const bookingStatus = autoConfirm ? 'confirmed' : 'pending'
      
      // Create restaurant reservation
      const reservation = await prisma.spaBooking.create({
        data: {
          tenantId,
          bookingNumber: confirmationCode,
          guestName: name,
          guestPhone: phone || null,
          guestEmail: email || null,
          date: new Date(date),
          startTime: time,
          endTime: calculateEndTime(time, 120),
          duration: 120,
          guests: guests || 2,
          status: bookingStatus,
          paymentStatus: 'pending',
          notes: notes || '',
          totalPrice: 0,
          services: { type: 'restaurant', occasion, source: source || 'website' }
        }
      })

      console.log('[Public Bookings] Restaurant reservation created:', reservation.id, 'status:', bookingStatus)

      // Send confirmation email ONLY if auto-confirmed
      if (email && autoConfirm && bookingSettings.sendEmailOnConfirm) {
        try {
          const emailHtml = generateRestaurantEmailHtml({
            orgName,
            confirmationCode,
            guestName: name,
            date,
            time,
            guests: guests || 2,
            occasion
          })

          await fetch(new URL('/api/email/send', request.url).toString(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: [email],
              subject: `✅ მაგიდა დაჯავშნილია - ${confirmationCode} | ${orgName}`,
              body: emailHtml
            })
          })
          console.log(`[Public Bookings] Restaurant email sent to ${email}`)
        } catch (emailError) {
          console.error('[Public Bookings] Failed to send email:', emailError)
        }
      }

      // Send Telegram notification (always)
      if (bookingSettings.sendTelegramNotification) {
        await sendTelegramNotification({
          type: 'restaurant',
          bookingNumber: confirmationCode,
          guestName: name,
          guestPhone: phone || 'არ არის მითითებული',
          date: date,
          time: time,
          guests: guests || 2,
          details: occasion ? `🎉 ${occasion}` : undefined,
          isPending: !autoConfirm
        })
      }

      return NextResponse.json(
        { success: true, bookingId: reservation.id, confirmationCode, status: bookingStatus },
        { headers: corsHeaders }
      )

    } else {
      return NextResponse.json(
        { error: 'Invalid booking type' },
        { status: 400, headers: corsHeaders }
      )
    }

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Public Bookings] Error:', error)
    return NextResponse.json(
      { error: 'Failed to create booking', details: errorMessage },
      { status: 500, headers: corsHeaders }
    )
  }
}

// GET - Get bookings
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const status = searchParams.get('status') || 'confirmed'

    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()

    const organization = await prisma.organization.findFirst({
      where: {
        OR: [
          { name: { contains: 'Brewery' } },
          { name: { contains: 'brewery' } }
        ]
      }
    })

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404, headers: corsHeaders })
    }

    const tenantId = organization.tenantId
    const results: Record<string, unknown> = {}

    const allBookings = await prisma.spaBooking.findMany({
      where: {
        tenantId,
        status: status,
        date: { gte: new Date() }
      },
      orderBy: { date: 'asc' },
      take: 50
    })

    if (type === 'spa' || type === 'all' || !type) {
      results.spaBookings = allBookings.filter((b: { services: unknown }) => {
        const services = b.services as Record<string, unknown> | null
        return services?.type !== 'restaurant'
      })
    }

    if (type === 'restaurant' || type === 'all' || !type) {
      results.restaurantReservations = allBookings.filter((b: { services: unknown }) => {
        const services = b.services as Record<string, unknown> | null
        return services?.type === 'restaurant'
      })
    }

    return NextResponse.json(results, { headers: corsHeaders })

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Public Bookings] GET Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch bookings', details: errorMessage },
      { status: 500, headers: corsHeaders }
    )
  }
}

// Generate Spa Email HTML
function generateSpaEmailHtml(data: {
  orgName: string
  confirmationCode: string
  guestName: string
  guests: number
  baths: number
  bathLabel: string
  price: number
  date: string
  time: string
}): string {
  const bookingUrl = `https://www.breweryhouse.ge/booking/${data.confirmationCode}`
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>სპა ჯავშანი - ${data.confirmationCode}</title>
    </head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
      <div style="background: linear-gradient(135deg, #d97706 0%, #92400e 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🍺 Brewery House & Beer Spa</h1>
        <p style="color: #fef3c7; margin-top: 10px; font-size: 16px;">ლუდის სპა - ჯავშნის დადასტურება</p>
      </div>
      
      <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb;">
        <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
          <h2 style="color: #92400e; margin-top: 0;">✅ ჯავშანი დადასტურებულია!</h2>
          <p style="font-size: 28px; color: #d97706; font-weight: bold; margin: 10px 0; letter-spacing: 2px;">
            ${data.confirmationCode}
          </p>
        </div>
        
        <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #374151; margin-top: 0; border-bottom: 2px solid #d97706; padding-bottom: 10px;">📋 ჯავშნის დეტალები</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 12px 0; color: #6b7280; border-bottom: 1px solid #e5e7eb;">სტუმარი:</td>
              <td style="padding: 12px 0; font-weight: bold; color: #111827; border-bottom: 1px solid #e5e7eb;">${data.guestName}</td>
            </tr>
            <tr>
              <td style="padding: 12px 0; color: #6b7280; border-bottom: 1px solid #e5e7eb;">პაკეტი:</td>
              <td style="padding: 12px 0; font-weight: bold; color: #111827; border-bottom: 1px solid #e5e7eb;">${data.guests} სტუმარი - ${data.bathLabel}</td>
            </tr>
            <tr>
              <td style="padding: 12px 0; color: #6b7280; border-bottom: 1px solid #e5e7eb;">თარიღი:</td>
              <td style="padding: 12px 0; font-weight: bold; color: #111827; border-bottom: 1px solid #e5e7eb;">${data.date}</td>
            </tr>
            <tr>
              <td style="padding: 12px 0; color: #6b7280;">დრო:</td>
              <td style="padding: 12px 0; font-weight: bold; color: #111827;">${data.time}</td>
            </tr>
          </table>
        </div>
        
        <div style="background: linear-gradient(135deg, #d97706 0%, #b45309 100%); color: white; padding: 20px; border-radius: 8px; text-align: center;">
          <p style="margin: 0; font-size: 14px; opacity: 0.9;">სულ გადასახდელი</p>
          <p style="margin: 5px 0 0 0; font-size: 36px; font-weight: bold;">₾${data.price}</p>
        </div>
        
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
          <a href="https://www.breweryhouse.ge" style="color: #fbbf24; text-decoration: none;">www.breweryhouse.ge</a>
        </p>
      </div>
    </body>
    </html>
  `
}

// Generate Restaurant Email HTML
function generateRestaurantEmailHtml(data: {
  orgName: string
  confirmationCode: string
  guestName: string
  date: string
  time: string
  guests: number
  occasion?: string
}): string {
  const bookingUrl = `https://www.breweryhouse.ge/booking/${data.confirmationCode}`
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>მაგიდის ჯავშანი - ${data.confirmationCode}</title>
    </head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
      <div style="background: linear-gradient(135deg, #d97706 0%, #92400e 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🍽️ Brewery House Restaurant</h1>
        <p style="color: #fef3c7; margin-top: 10px; font-size: 16px;">რესტორანი - მაგიდის ჯავშანი</p>
      </div>
      
      <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb;">
        <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
          <h2 style="color: #92400e; margin-top: 0;">✅ მაგიდა დაჯავშნილია!</h2>
          <p style="font-size: 28px; color: #d97706; font-weight: bold; margin: 10px 0; letter-spacing: 2px;">
            ${data.confirmationCode}
          </p>
        </div>
        
        <div style="background: #f9fafb; padding: 20px; border-radius: 8px;">
          <h3 style="color: #374151; margin-top: 0; border-bottom: 2px solid #d97706; padding-bottom: 10px;">📋 ჯავშნის დეტალები</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 12px 0; color: #6b7280; border-bottom: 1px solid #e5e7eb;">სტუმარი:</td>
              <td style="padding: 12px 0; font-weight: bold; color: #111827; border-bottom: 1px solid #e5e7eb;">${data.guestName}</td>
            </tr>
            <tr>
              <td style="padding: 12px 0; color: #6b7280; border-bottom: 1px solid #e5e7eb;">თარიღი:</td>
              <td style="padding: 12px 0; font-weight: bold; color: #111827; border-bottom: 1px solid #e5e7eb;">${data.date}</td>
            </tr>
            <tr>
              <td style="padding: 12px 0; color: #6b7280; border-bottom: 1px solid #e5e7eb;">დრო:</td>
              <td style="padding: 12px 0; font-weight: bold; color: #111827; border-bottom: 1px solid #e5e7eb;">${data.time}</td>
            </tr>
            <tr>
              <td style="padding: 12px 0; color: #6b7280;${data.occasion ? ' border-bottom: 1px solid #e5e7eb;' : ''}">სტუმრები:</td>
              <td style="padding: 12px 0; font-weight: bold; color: #111827;${data.occasion ? ' border-bottom: 1px solid #e5e7eb;' : ''}">${data.guests}</td>
            </tr>
            ${data.occasion ? `
            <tr>
              <td style="padding: 12px 0; color: #6b7280;">ღონისძიება:</td>
              <td style="padding: 12px 0; font-weight: bold; color: #111827;">${data.occasion}</td>
            </tr>
            ` : ''}
          </table>
        </div>
        
        <div style="text-align: center; margin-top: 25px;">
          <a href="${bookingUrl}" style="display: inline-block; background: #059669; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
            📄 ჯავშნის ნახვა / დაბეჭდვა
          </a>
        </div>
        
        <div style="text-align: center; margin-top: 15px;">
          <a href="https://www.breweryhouse.ge/menu" style="color: #d97706; text-decoration: none; font-size: 14px;">📖 იხილეთ მენიუ</a>
        </div>
      </div>
      
      <div style="background: #1f2937; padding: 25px; text-align: center; color: #9ca3af; font-size: 13px; border-radius: 0 0 10px 10px;">
        <p style="margin: 0 0 8px 0; font-weight: bold; color: #ffffff; font-size: 15px;">გმადლობთ რომ აირჩიეთ Brewery House!</p>
        <p style="margin: 8px 0;">📍 ასპინძა, შორეთის ქ. 21, სამცხე-ჯავახეთი</p>
        <p style="margin: 8px 0;">📞 +995 599 946 500</p>
        <p style="margin: 15px 0 0 0;">
          <a href="https://www.breweryhouse.ge" style="color: #fbbf24; text-decoration: none;">www.breweryhouse.ge</a>
        </p>
      </div>
    </body>
    </html>
  `
}
