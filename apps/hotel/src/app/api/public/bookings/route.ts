export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

// CORS headers for public access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
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

    // Generate confirmation code
    const confirmationCode = `${type === 'spa' ? 'SPA' : 'RST'}${Date.now().toString(36).toUpperCase()}`

    if (type === 'spa') {
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
          status: 'confirmed',
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

      console.log('[Public Bookings] Spa booking created:', booking.id)

      // Send confirmation email
      if (email) {
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

      return NextResponse.json(
        { 
          success: true, 
          bookingId: booking.id, 
          confirmationCode,
          price: calculatedPrice
        },
        { headers: corsHeaders }
      )

    } else if (type === 'restaurant') {
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
          status: 'confirmed',
          paymentStatus: 'pending',
          notes: notes || '',
          totalPrice: 0,
          services: { type: 'restaurant', occasion, source: source || 'website' }
        }
      })

      console.log('[Public Bookings] Restaurant reservation created:', reservation.id)

      // Send confirmation email
      if (email) {
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

      return NextResponse.json(
        { success: true, bookingId: reservation.id, confirmationCode },
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
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>სპა ჯავშანი - ${data.confirmationCode}</title>
      <style>
        @media print {
          .no-print { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      </style>
    </head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div class="no-print" style="text-align: center; margin-bottom: 20px;">
        <button onclick="window.print()" style="background: #d97706; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-size: 16px; cursor: pointer;">
          🖨️ დაბეჭდვა
        </button>
      </div>
      
      <div style="background: linear-gradient(135deg, #d97706 0%, #92400e 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">🍺 ${data.orgName}</h1>
        <p style="color: rgba(255,255,255,0.9); margin-top: 10px;">ლუდის სპა - ჯავშნის დადასტურება</p>
      </div>
      
      <div style="background: #f8f9fa; padding: 30px; border: 1px solid #e9ecef;">
        <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #333; margin-top: 0;">✅ ჯავშანი დადასტურებულია!</h2>
          <p style="font-size: 24px; color: #d97706; font-weight: bold; margin: 10px 0;">
            კოდი: ${data.confirmationCode}
          </p>
        </div>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #333; margin-top: 0;">📋 ჯავშნის დეტალები</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666;">სტუმარი:</td>
              <td style="padding: 8px 0; font-weight: bold;">${data.guestName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">პაკეტი:</td>
              <td style="padding: 8px 0; font-weight: bold;">${data.guests} სტუმარი - ${data.bathLabel}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">თარიღი:</td>
              <td style="padding: 8px 0; font-weight: bold;">${data.date}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">დრო:</td>
              <td style="padding: 8px 0; font-weight: bold;">${data.time}</td>
            </tr>
          </table>
        </div>
        
        <div style="background: #d97706; color: white; padding: 20px; border-radius: 8px; text-align: center;">
          <p style="margin: 0; font-size: 14px;">სულ გადასახდელი</p>
          <p style="margin: 5px 0 0 0; font-size: 32px; font-weight: bold;">₾${data.price}</p>
        </div>
      </div>
      
      <div style="padding: 20px; text-align: center; color: #666; font-size: 12px; border: 1px solid #e9ecef; border-top: none; background: white;">
        <p style="margin: 0 0 10px 0; font-weight: bold; color: #333;">გმადლობთ რომ აირჩიეთ ${data.orgName}!</p>
        <p style="margin: 5px 0;">📍 ასპინძა, შორეთის ქ. 21, სამცხე-ჯავახეთი</p>
        <p style="margin: 5px 0;">📞 +995 599 946 500</p>
        <p style="margin: 15px 0 0 0;">
          <a href="https://www.breweryhouse.ge" style="color: #d97706; text-decoration: none;">www.breweryhouse.ge</a>
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
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>მაგიდის ჯავშანი - ${data.confirmationCode}</title>
      <style>
        @media print {
          .no-print { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      </style>
    </head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div class="no-print" style="text-align: center; margin-bottom: 20px;">
        <button onclick="window.print()" style="background: #d97706; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-size: 16px; cursor: pointer;">
          🖨️ დაბეჭდვა
        </button>
      </div>
      
      <div style="background: linear-gradient(135deg, #d97706 0%, #92400e 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">🍽️ ${data.orgName}</h1>
        <p style="color: rgba(255,255,255,0.9); margin-top: 10px;">რესტორანი - მაგიდის ჯავშანი</p>
      </div>
      
      <div style="background: #f8f9fa; padding: 30px; border: 1px solid #e9ecef;">
        <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #333; margin-top: 0;">✅ მაგიდა დაჯავშნილია!</h2>
          <p style="font-size: 24px; color: #d97706; font-weight: bold; margin: 10px 0;">
            კოდი: ${data.confirmationCode}
          </p>
        </div>
        
        <div style="background: white; padding: 20px; border-radius: 8px;">
          <h3 style="color: #333; margin-top: 0;">📋 ჯავშნის დეტალები</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666;">სტუმარი:</td>
              <td style="padding: 8px 0; font-weight: bold;">${data.guestName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">თარიღი:</td>
              <td style="padding: 8px 0; font-weight: bold;">${data.date}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">დრო:</td>
              <td style="padding: 8px 0; font-weight: bold;">${data.time}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">სტუმრები:</td>
              <td style="padding: 8px 0; font-weight: bold;">${data.guests}</td>
            </tr>
            ${data.occasion ? `
            <tr>
              <td style="padding: 8px 0; color: #666;">ღონისძიება:</td>
              <td style="padding: 8px 0; font-weight: bold;">${data.occasion}</td>
            </tr>
            ` : ''}
          </table>
        </div>
      </div>
      
      <div style="padding: 20px; text-align: center; color: #666; font-size: 12px; border: 1px solid #e9ecef; border-top: none; background: white;">
        <p style="margin: 0 0 10px 0; font-weight: bold; color: #333;">გმადლობთ რომ აირჩიეთ ${data.orgName}!</p>
        <p style="margin: 5px 0;">📍 ასპინძა, შორეთის ქ. 21, სამცხე-ჯავახეთი</p>
        <p style="margin: 5px 0;">📞 +995 599 946 500</p>
        <p style="margin: 15px 0 0 0;">
          <a href="https://www.breweryhouse.ge/menu" style="color: #d97706; text-decoration: none;">📖 იხილეთ მენიუ</a>
          &nbsp;|&nbsp;
          <a href="https://www.breweryhouse.ge" style="color: #d97706; text-decoration: none;">www.breweryhouse.ge</a>
        </p>
      </div>
    </body>
    </html>
  `
}
