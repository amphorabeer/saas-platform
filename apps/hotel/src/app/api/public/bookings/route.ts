export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

// CORS headers for public access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

// OPTIONS - CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, { 
    status: 200,
    headers: corsHeaders 
  })
}

// POST - Receive booking from website
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, name, phone, email, date, time, guests, service, serviceName, servicePrice, occasion, notes, source } = body

    console.log(`[Public Bookings] New ${type} booking received:`, { name, phone, date, time })

    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()

    // Find default tenant
    const tenant = await prisma.tenant.findFirst({
      where: {
        OR: [
          { slug: 'brewery-house' },
          { subdomain: 'brewery-house' }
        ]
      }
    })

    if (!tenant) {
      console.error('[Public Bookings] Tenant not found')
      return NextResponse.json(
        { error: 'Configuration error' },
        { status: 500, headers: corsHeaders }
      )
    }

    // Get organization for hotel name
    const organization = await prisma.organization.findFirst({
      where: { tenantId: tenant.id }
    })
    const orgName = organization?.name || 'Brewery House'

    // Generate confirmation code
    const confirmationCode = `${type === 'spa' ? 'SPA' : 'RST'}${Date.now().toString(36).toUpperCase()}`

    if (type === 'spa') {
      // Create spa booking
      const booking = await prisma.spaBooking.create({
        data: {
          tenantId: tenant.id,
          bookingNumber: confirmationCode,
          guestName: name,
          guestPhone: phone || null,
          guestEmail: email || null,
          date: new Date(date),
          startTime: time,
          endTime: calculateEndTime(time, 60),
          duration: 60,
          guests: guests || 2,
          status: 'confirmed',
          paymentStatus: 'pending',
          notes: notes || '',
          totalPrice: servicePrice || 0,
          services: { serviceId: service, serviceName: serviceName, source: source || 'website' }
        }
      })

      console.log('[Public Bookings] Spa booking created:', booking.id)

      // Send confirmation email
      if (email) {
        try {
          const emailHtml = generateSpaEmailHtml({
            orgName,
            confirmationCode,
            guestName: name,
            serviceName: serviceName || 'ლუდის სპა',
            servicePrice: servicePrice || 0,
            date,
            time,
            guests: guests || 2
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
          console.log(`[Public Bookings] Spa confirmation email sent to ${email}`)
        } catch (emailError) {
          console.error('[Public Bookings] Failed to send spa confirmation email:', emailError)
        }
      }

      return NextResponse.json(
        { success: true, bookingId: booking.id, confirmationCode },
        { headers: corsHeaders }
      )

    } else if (type === 'restaurant') {
      // Create restaurant reservation (using SpaBooking model with different type)
      const reservation = await prisma.spaBooking.create({
        data: {
          tenantId: tenant.id,
          bookingNumber: confirmationCode,
          guestName: name,
          guestPhone: phone || null,
          guestEmail: email || null,
          date: new Date(date),
          startTime: time,
          endTime: calculateEndTime(time, 120), // 2 hours for restaurant
          duration: 120,
          guests: guests || 2,
          status: 'confirmed',
          paymentStatus: 'pending',
          notes: notes || '',
          totalPrice: 0,
          services: { type: 'restaurant', occasion: occasion, source: source || 'website' }
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
          console.log(`[Public Bookings] Restaurant confirmation email sent to ${email}`)
        } catch (emailError) {
          console.error('[Public Bookings] Failed to send restaurant confirmation email:', emailError)
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

// GET - Get pending bookings (for admin)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const status = searchParams.get('status') || 'confirmed'

    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()

    const tenant = await prisma.tenant.findFirst({
      where: {
        OR: [
          { slug: 'brewery-house' },
          { subdomain: 'brewery-house' }
        ]
      }
    })

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404, headers: corsHeaders })
    }

    const results: Record<string, unknown> = {}

    if (type === 'spa' || type === 'all' || !type) {
      results.spaBookings = await prisma.spaBooking.findMany({
        where: {
          tenantId: tenant.id,
          status: status,
          date: { gte: new Date() },
          services: { path: ['type'], equals: undefined } // Spa bookings don't have type=restaurant
        },
        orderBy: { date: 'asc' },
        take: 50
      })
    }

    if (type === 'restaurant' || type === 'all' || !type) {
      results.restaurantReservations = await prisma.spaBooking.findMany({
        where: {
          tenantId: tenant.id,
          status: status,
          date: { gte: new Date() },
          services: { path: ['type'], equals: 'restaurant' }
        },
        orderBy: { date: 'asc' },
        take: 50
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

// Helper: Calculate end time
function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [hours, minutes] = startTime.split(':').map(Number)
  const totalMinutes = hours * 60 + minutes + durationMinutes
  const endHours = Math.floor(totalMinutes / 60) % 24
  const endMinutes = totalMinutes % 60
  return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`
}

// Generate Spa Email HTML
function generateSpaEmailHtml(data: {
  orgName: string
  confirmationCode: string
  guestName: string
  serviceName: string
  servicePrice: number
  date: string
  time: string
  guests: number
}): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
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
              <td style="padding: 8px 0; color: #666;">სერვისი:</td>
              <td style="padding: 8px 0; font-weight: bold;">${data.serviceName}</td>
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
          </table>
        </div>
        
        <div style="background: #d97706; color: white; padding: 20px; border-radius: 8px; text-align: center;">
          <p style="margin: 0; font-size: 14px;">სულ გადასახდელი</p>
          <p style="margin: 5px 0 0 0; font-size: 32px; font-weight: bold;">₾${data.servicePrice}</p>
        </div>
      </div>
      
      <div style="padding: 20px; text-align: center; color: #666; font-size: 12px;">
        <p>გმადლობთ რომ აირჩიეთ ${data.orgName}!</p>
        <p>📍 ასპინძა, სამცხე-ჯავახეთი</p>
        <p>📞 +995 599 50 05 05</p>
      </div>
    </div>
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
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
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
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
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
      
      <div style="padding: 20px; text-align: center; color: #666; font-size: 12px;">
        <p>გმადლობთ რომ აირჩიეთ ${data.orgName}!</p>
        <p>📍 ასპინძა, სამცხე-ჯავახეთი</p>
        <p>📞 +995 599 50 05 05</p>
        <p style="margin-top: 15px;"><a href="https://breweryhouse.ge/menu" style="color: #d97706;">📖 იხილეთ მენიუ</a></p>
      </div>
    </div>
  `
}
