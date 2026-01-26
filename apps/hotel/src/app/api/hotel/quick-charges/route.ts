export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

// GET - Fetch quick charge buttons
export async function GET() {
  try {
    const { getTenantId, unauthorizedResponse } = await import('@/lib/tenant')
    const tenantId = await getTenantId()
    
    if (!tenantId) {
      return unauthorizedResponse()
    }
    
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()
    
    const buttons = await prisma.hotelQuickChargeButton.findMany({
      where: { organizationId: tenantId, isActive: true },
      orderBy: { position: 'asc' },
    })
    
    // Return just the itemIds for compatibility
    return NextResponse.json(buttons.map(b => b.itemId))
  } catch (error: any) {
    console.error('Error loading quick charges:', error)
    return NextResponse.json({ error: 'Failed to load quick charges' }, { status: 500 })
  }
}

// POST - Save quick charge buttons (replace all)
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
    
    // Delete existing
    await prisma.hotelQuickChargeButton.deleteMany({
      where: { organizationId: tenantId }
    })
    
    // Create new
    if (Array.isArray(data) && data.length > 0) {
      await prisma.hotelQuickChargeButton.createMany({
        data: data.map((itemId: string, index: number) => ({
          organizationId: tenantId,
          itemId,
          position: index,
          isActive: true,
        }))
      })
    }
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error saving quick charges:', error)
    return NextResponse.json({ error: 'Failed to save quick charges' }, { status: 500 })
  }
}