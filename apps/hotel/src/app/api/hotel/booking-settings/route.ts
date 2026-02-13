export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

// Default settings
const DEFAULT_SETTINGS = {
  autoConfirmSpa: true,
  autoConfirmRestaurant: true,
  autoConfirmHotel: true,
  sendEmailOnConfirm: true,
  sendTelegramNotification: true
}

// GET - Get booking settings
export async function GET(request: NextRequest) {
  try {
    const { getTenantId, unauthorizedResponse } = await import('@/lib/tenant')
    const tenantId = await getTenantId()
    
    if (!tenantId) {
      return unauthorizedResponse()
    }
    
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()
    
    // Get organization
    const org = await prisma.organization.findFirst({
      where: { tenantId },
      include: { hotelSettings: true }
    })

    if (!org?.hotelSettings) {
      return NextResponse.json(DEFAULT_SETTINGS)
    }

    // Get settings from settingsData JSON
    const settingsData = (org.hotelSettings.settingsData as any) || {}
    const bookingSettings = settingsData.booking || {}

    return NextResponse.json({
      ...DEFAULT_SETTINGS,
      ...bookingSettings
    })
  } catch (error: any) {
    console.error('[Booking Settings] GET Error:', error)
    return NextResponse.json({ error: 'Failed to fetch settings', details: error.message }, { status: 500 })
  }
}

// PUT - Update booking settings
export async function PUT(request: NextRequest) {
  try {
    const { getTenantId, unauthorizedResponse } = await import('@/lib/tenant')
    const tenantId = await getTenantId()
    
    if (!tenantId) {
      return unauthorizedResponse()
    }
    
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()
    
    const body = await request.json()
    const { autoConfirmSpa, autoConfirmRestaurant, autoConfirmHotel, sendEmailOnConfirm, sendTelegramNotification } = body

    // Get organization
    const org = await prisma.organization.findFirst({
      where: { tenantId },
      include: { hotelSettings: true }
    })

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const newBookingSettings = {
      autoConfirmSpa: autoConfirmSpa ?? true,
      autoConfirmRestaurant: autoConfirmRestaurant ?? true,
      autoConfirmHotel: autoConfirmHotel ?? true,
      sendEmailOnConfirm: sendEmailOnConfirm ?? true,
      sendTelegramNotification: sendTelegramNotification ?? true
    }

    if (org.hotelSettings) {
      // Update existing settings
      const existingData = (org.hotelSettings.settingsData as any) || {}
      
      await prisma.hotelSettings.update({
        where: { id: org.hotelSettings.id },
        data: {
          settingsData: {
            ...existingData,
            booking: newBookingSettings
          }
        }
      })
    } else {
      // Create new settings
      await prisma.hotelSettings.create({
        data: {
          organizationId: org.id,
          settingsData: {
            booking: newBookingSettings
          }
        }
      })
    }

    return NextResponse.json({ success: true, settings: newBookingSettings })
  } catch (error: any) {
    console.error('[Booking Settings] PUT Error:', error)
    return NextResponse.json({ error: 'Failed to update settings', details: error.message }, { status: 500 })
  }
}
