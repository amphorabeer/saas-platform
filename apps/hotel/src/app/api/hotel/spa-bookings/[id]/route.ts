export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import moment from 'moment'

// GET - ერთი ჯავშანი
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { getTenantId, unauthorizedResponse } = await import('@/lib/tenant')
    const tenantId = await getTenantId()
    
    if (!tenantId) {
      return unauthorizedResponse()
    }
    
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()
    
    const booking = await prisma.spaBooking.findFirst({
      where: { id: params.id, tenantId }
    })

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    return NextResponse.json({
      id: booking.id,
      bookingNumber: booking.bookingNumber,
      bathId: booking.bathId,
      guestName: booking.guestName,
      guestPhone: booking.guestPhone,
      guestEmail: booking.guestEmail,
      guests: booking.guests,
      date: booking.date,
      startTime: booking.startTime,
      endTime: booking.endTime,
      duration: booking.duration,
      totalPrice: Number(booking.totalPrice),
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      paymentMethod: booking.paymentMethod,
      notes: booking.notes,
      roomNumber: booking.roomNumber,
      services: booking.services,
      createdAt: booking.createdAt
    })
  } catch (error: any) {
    console.error('Error fetching spa booking:', error)
    return NextResponse.json({ error: 'Failed to fetch booking', details: error.message }, { status: 500 })
  }
}

// PUT - ჯავშნის განახლება (path param)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { getTenantId, unauthorizedResponse } = await import('@/lib/tenant')
    const tenantId = await getTenantId()
    
    if (!tenantId) {
      return unauthorizedResponse()
    }
    
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()

    // Verify booking belongs to tenant
    const existing = await prisma.spaBooking.findFirst({
      where: { id: params.id, tenantId }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    const body = await request.json()
    const sendEmail = body.sendEmail // Flag to send confirmation email
    
    // Check if status is being changed to confirmed
    const wasNotConfirmed = existing.status !== 'confirmed'
    const isBeingConfirmed = body.status === 'confirmed'
    const shouldSendEmail = sendEmail || (wasNotConfirmed && isBeingConfirmed)
    
    // Build update data dynamically
    const updateData: any = {}
    
    if (body.status !== undefined) updateData.status = body.status
    if (body.paymentStatus !== undefined) updateData.paymentStatus = body.paymentStatus
    if (body.paymentMethod !== undefined) updateData.paymentMethod = body.paymentMethod
    if (body.guestName !== undefined) updateData.guestName = body.guestName
    if (body.guestPhone !== undefined) updateData.guestPhone = body.guestPhone
    if (body.guestEmail !== undefined) updateData.guestEmail = body.guestEmail
    if (body.guestCount !== undefined) updateData.guests = body.guestCount
    if (body.guests !== undefined) updateData.guests = body.guests
    if (body.roomNumber !== undefined) updateData.roomNumber = body.roomNumber
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.price !== undefined) updateData.totalPrice = body.price
    if (body.totalPrice !== undefined) updateData.totalPrice = body.totalPrice
    if (body.startTime !== undefined) updateData.startTime = body.startTime
    if (body.endTime !== undefined) updateData.endTime = body.endTime
    if (body.date !== undefined) updateData.date = new Date(body.date)
    if (body.services !== undefined) updateData.services = body.services

    const booking = await prisma.spaBooking.update({
      where: { id: params.id },
      data: updateData
    })

    // Send confirmation email if status changed to confirmed
    if (shouldSendEmail && booking.guestEmail) {
      try {
        const org = await prisma.organization.findFirst({ where: { tenantId } })
        const orgName = org?.name || 'Brewery House'
        const services = booking.services as any || {}
        const isRestaurant = booking.bookingNumber?.startsWith('RST') || services.type === 'restaurant'
        
        const bookingUrl = `https://www.breweryhouse.ge/booking/${booking.bookingNumber}`
        const dateStr = moment(booking.date).format('DD/MM/YYYY')
        
        let emailHtml: string
        let subject: string
        
        if (isRestaurant) {
          // Restaurant email
          subject = `✅ მაგიდა დაჯავშნილია - ${booking.bookingNumber} | ${orgName}`
          emailHtml = `
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"><title>რესტორნის ჯავშანი</title></head>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
              <div style="background: linear-gradient(135deg, #d97706 0%, #92400e 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🍽️ ${orgName}</h1>
                <p style="color: #fef3c7; margin-top: 10px;">რესტორანი - მაგიდის ჯავშანი</p>
              </div>
              <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb;">
                <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
                  <h2 style="color: #92400e; margin-top: 0;">✅ ჯავშანი დადასტურებულია!</h2>
                  <p style="font-size: 28px; color: #d97706; font-weight: bold; letter-spacing: 2px;">${booking.bookingNumber}</p>
                </div>
                <div style="background: #f9fafb; padding: 20px; border-radius: 8px;">
                  <h3 style="color: #374151; border-bottom: 2px solid #d97706; padding-bottom: 10px;">📋 დეტალები</h3>
                  <table style="width: 100%;">
                    <tr><td style="padding: 10px 0; color: #6b7280;">სტუმარი:</td><td style="font-weight: bold;">${booking.guestName}</td></tr>
                    <tr><td style="padding: 10px 0; color: #6b7280;">თარიღი:</td><td style="font-weight: bold;">${dateStr}</td></tr>
                    <tr><td style="padding: 10px 0; color: #6b7280;">დრო:</td><td style="font-weight: bold;">${booking.startTime}</td></tr>
                    <tr><td style="padding: 10px 0; color: #6b7280;">სტუმრები:</td><td style="font-weight: bold;">${booking.guests}</td></tr>
                    ${services.occasion ? `<tr><td style="padding: 10px 0; color: #6b7280;">ღონისძიება:</td><td style="font-weight: bold;">${services.occasion}</td></tr>` : ''}
                  </table>
                </div>
                <div style="text-align: center; margin-top: 20px;">
                  <a href="${bookingUrl}" style="display: inline-block; background: #059669; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold;">📄 ჯავშნის ნახვა</a>
                </div>
              </div>
              <div style="background: #1f2937; padding: 20px; text-align: center; color: #9ca3af; font-size: 13px; border-radius: 0 0 10px 10px;">
                <p style="margin: 0;">📍 ასპინძა, შორეთის ქ. 21</p>
                <p style="margin: 8px 0;">📞 +995 599 946 500</p>
              </div>
            </body>
            </html>
          `
        } else {
          // Spa email
          const bathCount = services.baths || 1
          const bathLabel = bathCount === 1 ? '1 აბაზანა' : '2 აბაზანა'
          subject = `✅ სპა ჯავშანი დადასტურებულია - ${booking.bookingNumber} | ${orgName}`
          emailHtml = `
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"><title>სპა ჯავშანი</title></head>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
              <div style="background: linear-gradient(135deg, #d97706 0%, #92400e 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🍺 ${orgName}</h1>
                <p style="color: #fef3c7; margin-top: 10px;">ლუდის სპა - ჯავშნის დადასტურება</p>
              </div>
              <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb;">
                <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
                  <h2 style="color: #92400e; margin-top: 0;">✅ ჯავშანი დადასტურებულია!</h2>
                  <p style="font-size: 28px; color: #d97706; font-weight: bold; letter-spacing: 2px;">${booking.bookingNumber}</p>
                </div>
                <div style="background: #f9fafb; padding: 20px; border-radius: 8px;">
                  <h3 style="color: #374151; border-bottom: 2px solid #d97706; padding-bottom: 10px;">📋 დეტალები</h3>
                  <table style="width: 100%;">
                    <tr><td style="padding: 10px 0; color: #6b7280;">სტუმარი:</td><td style="font-weight: bold;">${booking.guestName}</td></tr>
                    <tr><td style="padding: 10px 0; color: #6b7280;">პაკეტი:</td><td style="font-weight: bold;">${booking.guests} სტუმარი, ${bathLabel}</td></tr>
                    <tr><td style="padding: 10px 0; color: #6b7280;">თარიღი:</td><td style="font-weight: bold;">${dateStr}</td></tr>
                    <tr><td style="padding: 10px 0; color: #6b7280;">დრო:</td><td style="font-weight: bold;">${booking.startTime}</td></tr>
                  </table>
                </div>
                <div style="background: linear-gradient(135deg, #d97706 0%, #92400e 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; margin-top: 20px;">
                  <p style="margin: 0; font-size: 14px;">გადასახდელი თანხა</p>
                  <p style="margin: 5px 0 0 0; font-size: 36px; font-weight: bold;">₾${Number(booking.totalPrice)}</p>
                </div>
                <div style="text-align: center; margin-top: 20px;">
                  <a href="${bookingUrl}" style="display: inline-block; background: #059669; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold;">📄 ჯავშნის ნახვა / დაბეჭდვა</a>
                </div>
              </div>
              <div style="background: #1f2937; padding: 20px; text-align: center; color: #9ca3af; font-size: 13px; border-radius: 0 0 10px 10px;">
                <p style="margin: 0;">📍 ასპინძა, შორეთის ქ. 21, სამცხე-ჯავახეთი</p>
                <p style="margin: 8px 0;">📞 +995 599 946 500</p>
              </div>
            </body>
            </html>
          `
        }
        
        // Send email
        await fetch(new URL('/api/email/send', request.url).toString(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: [booking.guestEmail],
            subject,
            body: emailHtml
          })
        })
        console.log(`[SpaBooking] Confirmation email sent to ${booking.guestEmail}`)
      } catch (emailError) {
        console.error('[SpaBooking] Failed to send confirmation email:', emailError)
      }
    }

    return NextResponse.json({
      id: booking.id,
      bookingNumber: booking.bookingNumber,
      guestName: booking.guestName,
      guestPhone: booking.guestPhone,
      guestEmail: booking.guestEmail,
      guests: booking.guests,
      date: booking.date,
      startTime: booking.startTime,
      endTime: booking.endTime,
      price: Number(booking.totalPrice),
      totalPrice: Number(booking.totalPrice),
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      paymentMethod: booking.paymentMethod,
      roomNumber: booking.roomNumber,
      notes: booking.notes,
      services: booking.services,
      emailSent: shouldSendEmail && !!booking.guestEmail
    })
  } catch (error: any) {
    console.error('Error updating spa booking:', error)
    return NextResponse.json({ error: 'Failed to update booking', details: error.message }, { status: 500 })
  }
}

// DELETE - ჯავშნის გაუქმება
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { getTenantId, unauthorizedResponse } = await import('@/lib/tenant')
    const tenantId = await getTenantId()
    
    if (!tenantId) {
      return unauthorizedResponse()
    }
    
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()

    // Verify booking belongs to tenant
    const existing = await prisma.spaBooking.findFirst({
      where: { id: params.id, tenantId }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Mark as cancelled instead of deleting
    await prisma.spaBooking.update({
      where: { id: params.id },
      data: { status: 'cancelled' }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error cancelling spa booking:', error)
    return NextResponse.json({ error: 'Failed to cancel booking', details: error.message }, { status: 500 })
  }
}
