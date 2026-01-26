export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

// GET - Fetch system settings
export async function GET() {
  try {
    const { getTenantId, unauthorizedResponse } = await import('@/lib/tenant')
    const tenantId = await getTenantId()
    
    if (!tenantId) {
      return unauthorizedResponse()
    }
    
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()
    
    const settings = await prisma.hotelSystemSettings.findUnique({
      where: { organizationId: tenantId },
    })
    
    return NextResponse.json(settings?.settingsData || {})
  } catch (error: any) {
    console.error('Error loading system settings:', error)
    return NextResponse.json({ error: 'Failed to load system settings' }, { status: 500 })
  }
}

// POST/PUT - Save system settings (upsert)
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
    
    const settings = await prisma.hotelSystemSettings.upsert({
      where: { organizationId: tenantId },
      update: { settingsData: data },
      create: { organizationId: tenantId, settingsData: data },
    })
    
    return NextResponse.json(settings.settingsData)
  } catch (error: any) {
    console.error('Error saving system settings:', error)
    return NextResponse.json({ error: 'Failed to save system settings' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  return POST(request)
}