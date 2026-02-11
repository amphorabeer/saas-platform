export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

// GET - რესტორანის პარამეტრების მიღება
export async function GET() {
  try {
    const { getTenantId, unauthorizedResponse } = await import('@/lib/tenant')
    const tenantId = await getTenantId()
    
    if (!tenantId) {
      return unauthorizedResponse()
    }
    
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()

    let settings = await prisma.restaurantSettings.findUnique({
      where: { tenantId }
    })

    // Return default if not exists
    if (!settings) {
      settings = {
        id: '',
        tenantId,
        enabled: true,
        name: 'რესტორანი',
        openTime: '08:00',
        closeTime: '23:00',
        breakfastStart: '08:00',
        breakfastEnd: '11:00',
        lunchStart: '12:00',
        lunchEnd: '15:00',
        dinnerStart: '18:00',
        dinnerEnd: '22:00',
        taxRate: 0,
        serviceCharge: 0,
        allowRoomCharge: true,
        requireTableNumber: false,
        createdAt: new Date(),
        updatedAt: new Date()
      } as any
    }

    return NextResponse.json(settings)
  } catch (error: any) {
    console.error('Error fetching restaurant settings:', error)
    return NextResponse.json({ error: 'Failed to fetch settings', details: error.message }, { status: 500 })
  }
}

// PUT - რესტორანის პარამეტრების განახლება
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
    const {
      enabled, name, openTime, closeTime,
      breakfastStart, breakfastEnd, lunchStart, lunchEnd,
      dinnerStart, dinnerEnd, taxRate, serviceCharge,
      allowRoomCharge, requireTableNumber
    } = body

    const settings = await prisma.restaurantSettings.upsert({
      where: { tenantId },
      update: {
        enabled: enabled ?? true,
        name: name || 'რესტორანი',
        openTime: openTime || '08:00',
        closeTime: closeTime || '23:00',
        breakfastStart: breakfastStart || '08:00',
        breakfastEnd: breakfastEnd || '11:00',
        lunchStart: lunchStart || '12:00',
        lunchEnd: lunchEnd || '15:00',
        dinnerStart: dinnerStart || '18:00',
        dinnerEnd: dinnerEnd || '22:00',
        taxRate: Number(taxRate || 0),
        serviceCharge: Number(serviceCharge || 0),
        allowRoomCharge: allowRoomCharge ?? true,
        requireTableNumber: requireTableNumber ?? false
      },
      create: {
        tenantId,
        enabled: enabled ?? true,
        name: name || 'რესტორანი',
        openTime: openTime || '08:00',
        closeTime: closeTime || '23:00',
        breakfastStart: breakfastStart || '08:00',
        breakfastEnd: breakfastEnd || '11:00',
        lunchStart: lunchStart || '12:00',
        lunchEnd: lunchEnd || '15:00',
        dinnerStart: dinnerStart || '18:00',
        dinnerEnd: dinnerEnd || '22:00',
        taxRate: Number(taxRate || 0),
        serviceCharge: Number(serviceCharge || 0),
        allowRoomCharge: allowRoomCharge ?? true,
        requireTableNumber: requireTableNumber ?? false
      }
    })

    return NextResponse.json(settings)
  } catch (error: any) {
    console.error('Error updating restaurant settings:', error)
    return NextResponse.json({ error: 'Failed to update settings', details: error.message }, { status: 500 })
  }
}
