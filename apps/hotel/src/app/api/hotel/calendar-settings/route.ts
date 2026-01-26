export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

// GET - Fetch calendar settings
export async function GET() {
  try {
    const { getTenantId, unauthorizedResponse } = await import('@/lib/tenant')
    const tenantId = await getTenantId()
    
    if (!tenantId) {
      return unauthorizedResponse()
    }
    
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()
    
    const settings = await prisma.hotelCalendarSettings.findUnique({
      where: { organizationId: tenantId },
    })
    
    return NextResponse.json(settings?.settingsData || {})
  } catch (error: any) {
    console.error('Error loading calendar settings:', error)
    return NextResponse.json({ error: 'Failed to load calendar settings' }, { status: 500 })
  }
}

// POST/PUT - Save calendar settings (upsert)
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
    
    const settings = await prisma.hotelCalendarSettings.upsert({
      where: { organizationId: tenantId },
      update: { settingsData: data },
      create: { organizationId: tenantId, settingsData: data },
    })
    
    return NextResponse.json(settings.settingsData)
  } catch (error: any) {
    console.error('Error saving calendar settings:', error)
    return NextResponse.json({ error: 'Failed to save calendar settings' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  return POST(request)
}