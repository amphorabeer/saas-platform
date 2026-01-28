export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

// Proxy to /api/channels/connections
export async function GET(request: NextRequest) {
  try {
    const { getTenantId, unauthorizedResponse } = await import('@/lib/tenant')
    const tenantId = await getTenantId()
    
    if (!tenantId) {
      return unauthorizedResponse()
    }
    
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()
    
    const connections = await prisma.channelConnection.findMany({
      where: { tenantId },
      include: {
        channel: true
      },
      orderBy: { createdAt: 'desc' }
    })
    
    return NextResponse.json(connections)
  } catch (error: any) {
    console.error('[Channel Connections] Error:', error)
    return NextResponse.json({ error: 'Failed to load connections', details: error.message }, { status: 500 })
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
    const body = await request.json()
    
    const connection = await prisma.channelConnection.create({
      data: {
        tenantId,
        channelId: body.channelId,
        name: body.name || 'New Connection',
        isActive: body.isActive ?? true,
        settings: body.settings || {},
        credentials: body.credentials || {}
      },
      include: { channel: true }
    })
    
    return NextResponse.json(connection, { status: 201 })
  } catch (error: any) {
    console.error('[Channel Connections] Create error:', error)
    return NextResponse.json({ error: 'Failed to create connection', details: error.message }, { status: 500 })
  }
}