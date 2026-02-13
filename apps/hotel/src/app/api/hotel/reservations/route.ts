export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import moment from 'moment'

export async function GET() {
  try {
    const { getTenantId, unauthorizedResponse } = await import('@/lib/tenant')
    const tenantId = await getTenantId()
    
    if (!tenantId) {
      return unauthorizedResponse()
    }
    
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()
    const reservations = await prisma.hotelReservation.findMany({
      where: { tenantId },
      include: { room: true },
      orderBy: { checkIn: 'desc' },
    })
    
    const reservationsWithRoomNumber = reservations.map(res => ({
      ...res,
      roomNumber: res.room?.roomNumber || res.roomId,
      roomType: res.room?.roomType || null,
      roomPrice: res.room?.basePrice || null
    }))
    
    return NextResponse.json(reservationsWithRoomNumber)
  } catch (error: any) {
    console.error('Error loading reservations:', error)
    return NextResponse.json({ error: 'Failed to load reservations', details: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { getTenantId, unauthorizedResponse } = await import('@/lib/tenant')
    const tenantId = await getTenantId()
    
    if (!tenantId) {
      return unauthorizedResponse()
    }
    
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()
    const data = await request.json()
    
    const existingReservations = await prisma.hotelReservation.findMany({
      where: {
        tenantId,
        roomId: data.roomId,
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      },
    })
    
    const newCheckIn = new Date(data.checkIn)
    const newCheckOut = new Date(data.checkOut)
    
    const hasOverlap = existingReservations.some((res) => {
      const resCheckIn = new Date(res.checkIn)
      const resCheckOut = new Date(res.checkOut)
      return newCheckIn < resCheckOut && newCheckOut > resCheckIn
    })
    
    if (hasOverlap) {
      return NextResponse.json(
        { error: 'Room is already booked for these dates', code: 'OVERLAP' },
        { status: 409 }
      )
    }
    
    const room = await prisma.hotelRoom.findUnique({
      where: { id: data.roomId, tenantId },
    })
    
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }
    
    const nights = Math.ceil((newCheckOut.getTime() - newCheckIn.getTime()) / (1000 * 60 * 60 * 24))
    const totalAmount = data.totalAmount !== undefined 
      ? Number(data.totalAmount)
      : Number(room.basePrice) * nights
    
    const newReservation = await prisma.hotelReservation.create({
      data: {
        tenantId,
        roomId: data.roomId,
        guestName: data.guestName,
        guestEmail: data.guestEmail || '',
        guestPhone: data.guestPhone || '',
        guestCountry: data.guestCountry || '',
        checkIn: newCheckIn,
        checkOut: newCheckOut,
        adults: data.adults || 1,
        children: data.children || 0,
        totalAmount,
        paidAmount: data.paidAmount || 0,
        status: data.status || 'CONFIRMED',
        source: data.source || 'direct',
        notes: data.notes || '',
        companyName: data.companyName || '',
        companyTaxId: data.companyTaxId || '',
        companyAddress: data.companyAddress || '',
        companyBank: data.companyBank || '',
        companyBankAccount: data.companyBankAccount || '',
      },
      include: { room: true },
    })
    
    if (newReservation.status === 'CHECKED_IN') {
      await prisma.hotelRoom.update({
        where: { id: data.roomId },
        data: { status: 'OCCUPIED' },
      })
    }
    
    return NextResponse.json({
      ...newReservation,
      roomNumber: newReservation.room?.roomNumber || newReservation.roomId,
      roomType: newReservation.room?.roomType || null,
      roomPrice: newReservation.room?.basePrice || null
    })
  } catch (error: any) {
    console.error('Error creating reservation:', error)
    return NextResponse.json({ error: 'Failed to create reservation', details: error.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  let body: any = {}
  let updateData: any = {}
  try {
    const { getTenantId, unauthorizedResponse } = await import('@/lib/tenant')
    const tenantId = await getTenantId()
    
    if (!tenantId) {
      return unauthorizedResponse()
    }
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()
    
    // Check for ID in query params (for NotificationBell) or body
    const { searchParams } = new URL(request.url)
    const queryId = searchParams.get('id')
    
    body = await request.json()
    const id = queryId || body.id
    
    if (!id) {
      return NextResponse.json({ error: 'Reservation ID required' }, { status: 400 })
    }
    
    const existingReservation = await prisma.hotelReservation.findUnique({
      where: { id },
      include: { room: true },
    })
    
    if (!existingReservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }
    
    if (existingReservation.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    
    // Check if status is being changed to CONFIRMED (for email)
    const wasNotConfirmed = existingReservation.status !== 'CONFIRMED'
    const isBeingConfirmed = body.status === 'CONFIRMED'
    const shouldSendEmail = body.sendEmail || (wasNotConfirmed && isBeingConfirmed)
    
    const validFields = [
      'guestName', 'guestEmail', 'guestPhone', 'guestCountry',
      'checkIn', 'checkOut', 'adults', 'children',
      'totalAmount', 'paidAmount', 'status', 'source', 'notes',
      'companyName', 'companyTaxId', 'companyAddress', 'companyBank', 'companyBankAccount'
    ]
    
    updateData = {}
    
    for (const field of validFields) {
      if (body[field] !== undefined) {
        if (field === 'checkIn' || field === 'checkOut') {
          const dateVal = new Date(body[field])
          if (!isNaN(dateVal.getTime())) {
            updateData[field] = dateVal
          }
        } else if (field === 'totalAmount' || field === 'paidAmount') {
          let numVal: number
          if (typeof body[field] === 'object' && body[field] !== null && 'toNumber' in body[field]) {
            numVal = body[field].toNumber()
          } else {
            numVal = Number(body[field])
          }
          if (!isNaN(numVal) && numVal >= 0 && numVal <= 1000000) {
            updateData[field] = numVal
          }
        } else if (field === 'adults' || field === 'children') {
          const numVal = Number(body[field])
          if (!isNaN(numVal) && numVal >= 0) {
            updateData[field] = numVal
          }
        } else if (field === 'guestEmail' || field === 'guestPhone' || field === 'notes' || field === 'guestCountry') {
          updateData[field] = body[field] || ''
        } else if (field === 'source') {
          updateData[field] = body[field] || 'direct'
        } else if (field.startsWith('company')) {
          updateData[field] = body[field] || ''
        } else {
          updateData[field] = body[field]
        }
      }
    }
    
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(existingReservation)
    }
    
    if (body.roomId && body.roomId !== existingReservation.roomId) {
      const room = await prisma.hotelRoom.findUnique({
        where: { id: body.roomId, tenantId },
      })
      if (!room) {
        return NextResponse.json({ error: 'Room not found or access denied' }, { status: 404 })
      }
      updateData.roomId = body.roomId
    }
    
    if (updateData.checkIn || updateData.checkOut || updateData.roomId) {
      const checkIn = updateData.checkIn ? new Date(updateData.checkIn) : new Date(existingReservation.checkIn)
      const checkOut = updateData.checkOut ? new Date(updateData.checkOut) : new Date(existingReservation.checkOut)
      const roomId = updateData.roomId || existingReservation.roomId
      
      const overlappingReservations = await prisma.hotelReservation.findMany({
        where: {
          tenantId,
          roomId,
          id: { not: id },
          status: { notIn: ['CANCELLED', 'NO_SHOW'] },
        },
      })
      
      const hasOverlap = overlappingReservations.some((res) => {
        const resCheckIn = new Date(res.checkIn)
        const resCheckOut = new Date(res.checkOut)
        return checkIn < resCheckOut && checkOut > resCheckIn
      })
      
      if (hasOverlap) {
        return NextResponse.json(
          { error: 'Room is already booked for these dates', code: 'OVERLAP' },
          { status: 409 }
        )
      }
    }
    
    const updatedReservation = await prisma.hotelReservation.update({
      where: { id },
      data: updateData,
      include: { room: true },
    })
    
    const finalRoomId = updateData.roomId || existingReservation.roomId
    if (updateData.status === 'CHECKED_IN' && finalRoomId) {
      await prisma.hotelRoom.update({
        where: { id: finalRoomId },
        data: { status: 'OCCUPIED' },
      })
    } else if (updateData.status === 'CHECKED_OUT' && finalRoomId) {
      await prisma.hotelRoom.update({
        where: { id: finalRoomId },
        data: { status: 'DIRTY' },
      })
    }
    
    // Send confirmation email if status changed to CONFIRMED
    if (shouldSendEmail && updatedReservation.guestEmail) {
      try {
        const org = await prisma.organization.findFirst({ where: { tenantId } })
        const orgName = org?.name || 'Brewery House'
        const room = updatedReservation.room
        const checkIn = moment(updatedReservation.checkIn).format('DD/MM/YYYY')
        const checkOut = moment(updatedReservation.checkOut).format('DD/MM/YYYY')
        const nights = moment(updatedReservation.checkOut).diff(moment(updatedReservation.checkIn), 'days')
        const bookingUrl = `https://www.breweryhouse.ge/booking/${updatedReservation.confirmationNumber}`
        
        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head><meta charset="utf-8"><title>სასტუმროს ჯავშანი - ${updatedReservation.confirmationNumber}</title></head>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
            <div style="background: linear-gradient(135deg, #1e40af 0%, #7c3aed 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🏨 ${orgName}</h1>
              <p style="color: #e0e7ff; margin-top: 10px; font-size: 16px;">სასტუმრო - ჯავშნის დადასტურება</p>
            </div>
            
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb;">
              <div style="background: #ede9fe; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
                <h2 style="color: #5b21b6; margin-top: 0;">✅ ჯავშანი დადასტურებულია!</h2>
                <p style="font-size: 28px; color: #7c3aed; font-weight: bold; margin: 10px 0; letter-spacing: 2px;">
                  ${updatedReservation.confirmationNumber}
                </p>
              </div>
              
              <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="color: #374151; margin-top: 0; border-bottom: 2px solid #7c3aed; padding-bottom: 10px;">📋 ჯავშნის დეტალები</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 12px 0; color: #6b7280; border-bottom: 1px solid #e5e7eb;">სტუმარი:</td>
                    <td style="padding: 12px 0; font-weight: bold; color: #111827; border-bottom: 1px solid #e5e7eb;">${updatedReservation.guestName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0; color: #6b7280; border-bottom: 1px solid #e5e7eb;">ოთახი:</td>
                    <td style="padding: 12px 0; font-weight: bold; color: #111827; border-bottom: 1px solid #e5e7eb;">#${room?.roomNumber} (${room?.roomType})</td>
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
                    <td style="padding: 12px 0; font-weight: bold; color: #111827;">${updatedReservation.adults} მოზრდილი${updatedReservation.children > 0 ? `, ${updatedReservation.children} ბავშვი` : ''}</td>
                  </tr>
                </table>
              </div>
              
              <div style="background: linear-gradient(135deg, #7c3aed 0%, #1e40af 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
                <p style="margin: 0; font-size: 14px;">გადასახდელი თანხა</p>
                <p style="margin: 5px 0 0 0; font-size: 36px; font-weight: bold;">₾${Number(updatedReservation.totalAmount)}</p>
              </div>
              
              <div style="text-align: center;">
                <a href="${bookingUrl}" style="display: inline-block; background: #059669; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">📄 ჯავშნის ნახვა</a>
              </div>
            </div>
            
            <div style="background: #1f2937; padding: 20px; text-align: center; color: #9ca3af; font-size: 13px; border-radius: 0 0 10px 10px;">
              <p style="margin: 0;">📍 ასპინძა, შორეთის ქ. 21, სამცხე-ჯავახეთი</p>
              <p style="margin: 8px 0;">📞 +995 599 946 500</p>
            </div>
          </body>
          </html>
        `
        
        await fetch(new URL('/api/email/send', request.url).toString(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: [updatedReservation.guestEmail],
            subject: `✅ სასტუმროს ჯავშანი დადასტურებულია - ${updatedReservation.confirmationNumber} | ${orgName}`,
            body: emailHtml
          })
        })
        console.log(`[Reservations] Confirmation email sent to ${updatedReservation.guestEmail}`)
      } catch (emailError) {
        console.error('[Reservations] Failed to send confirmation email:', emailError)
      }
    }
    
    return NextResponse.json({
      ...updatedReservation,
      roomNumber: updatedReservation.room?.roomNumber || updatedReservation.roomId,
      roomType: updatedReservation.room?.roomType || null,
      roomPrice: updatedReservation.room?.basePrice || null,
      emailSent: shouldSendEmail && !!updatedReservation.guestEmail
    })
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }
    console.error('Error updating reservation:', error)
    return NextResponse.json({ 
      error: 'Failed to update reservation', 
      details: error.message,
      code: error.code,
      meta: error.meta
    }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const { getTenantId, unauthorizedResponse } = await import('@/lib/tenant')
    const tenantId = await getTenantId()
    
    if (!tenantId) {
      return unauthorizedResponse()
    }
    
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()
    const result = await prisma.hotelReservation.deleteMany({
      where: { tenantId },
    })
    
    return NextResponse.json({ message: 'All reservations deleted', count: result.count })
  } catch (error: any) {
    console.error('Error deleting reservations:', error)
    return NextResponse.json({ error: 'Failed to delete reservations', details: error.message }, { status: 500 })
  }
}
