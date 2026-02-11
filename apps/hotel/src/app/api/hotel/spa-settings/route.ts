export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

// GET - სპა პარამეტრების მიღება
export async function GET() {
  try {
    const { getTenantId, unauthorizedResponse } = await import('@/lib/tenant')
    const tenantId = await getTenantId()
    
    if (!tenantId) {
      return unauthorizedResponse()
    }
    
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()

    let settings = await prisma.spaSettings.findUnique({
      where: { tenantId }
    })

    // Return default if not exists
    if (!settings) {
      settings = {
        id: '',
        tenantId,
        enabled: true,
        name: 'ლუდის სპა',
        openTime: '10:00',
        closeTime: '22:00',
        slotDuration: 60,
        maxAdvanceBooking: 30,
        cancellationHours: 24,
        requireDeposit: false,
        depositPercent: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      } as any
    }

    return NextResponse.json(settings)
  } catch (error: any) {
    console.error('Error fetching spa settings:', error)
    return NextResponse.json({ error: 'Failed to fetch settings', details: error.message }, { status: 500 })
  }
}

// PUT - სპა პარამეტრების განახლება
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
      enabled, name, openTime, closeTime, slotDuration,
      maxAdvanceBooking, cancellationHours, requireDeposit, depositPercent
    } = body

    const settings = await prisma.spaSettings.upsert({
      where: { tenantId },
      update: {
        enabled: enabled ?? true,
        name: name || 'ლუდის სპა',
        openTime: openTime || '10:00',
        closeTime: closeTime || '22:00',
        slotDuration: slotDuration || 60,
        maxAdvanceBooking: maxAdvanceBooking || 30,
        cancellationHours: cancellationHours || 24,
        requireDeposit: requireDeposit ?? false,
        depositPercent: Number(depositPercent || 0)
      },
      create: {
        tenantId,
        enabled: enabled ?? true,
        name: name || 'ლუდის სპა',
        openTime: openTime || '10:00',
        closeTime: closeTime || '22:00',
        slotDuration: slotDuration || 60,
        maxAdvanceBooking: maxAdvanceBooking || 30,
        cancellationHours: cancellationHours || 24,
        requireDeposit: requireDeposit ?? false,
        depositPercent: Number(depositPercent || 0)
      }
    })

    return NextResponse.json(settings)
  } catch (error: any) {
    console.error('Error updating spa settings:', error)
    return NextResponse.json({ error: 'Failed to update settings', details: error.message }, { status: 500 })
  }
}
