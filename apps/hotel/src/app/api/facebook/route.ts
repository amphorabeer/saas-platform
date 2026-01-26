import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET - Get Facebook Integration settings
export async function GET(request: NextRequest) {
  try {
    // Get organizationId from tenant helper
    const { getOrganizationId } = await import('@/lib/tenant')
    let organizationId = await getOrganizationId()
    
    // Fallback to header if tenant helper returns null
    if (!organizationId) {
      organizationId = request.headers.get('x-organization-id')
    }
    
    console.log('[Facebook API] GET - organizationId:', organizationId)
    
    if (!organizationId) {
      return NextResponse.json({ integration: null })
    }

    // Try to import prisma dynamically
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()

    const integration = await prisma.facebookIntegration.findUnique({
      where: { organizationId },
      select: {
        id: true,
        pageId: true,
        pageName: true,
        verifyToken: true,
        isActive: true,
        autoReply: true,
        welcomeMessage: true,
        botEnabled: true,
        bookingEnabled: true,
        messagesReceived: true,
        messagesSent: true,
        bookingsCreated: true,
        createdAt: true,
        updatedAt: true,
      }
    })

    return NextResponse.json({ integration })
  } catch (error: any) {
    console.error('[Facebook API] GET error:', error?.message || error)
    return NextResponse.json({ integration: null, error: error?.message })
  }
}

// POST - Create/Update Facebook Integration
export async function POST(request: NextRequest) {
  try {
    // Get organizationId from tenant helper
    const { getOrganizationId } = await import('@/lib/tenant')
    let organizationId = await getOrganizationId()
    
    // Fallback to header if tenant helper returns null
    if (!organizationId) {
      organizationId = request.headers.get('x-organization-id')
    }
    
    console.log('[Facebook API] POST - organizationId:', organizationId)
    
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 })
    }

    const body = await request.json()
    const { pageId, pageName, pageAccessToken, welcomeMessage, botEnabled, bookingEnabled } = body

    console.log('[Facebook API] POST - pageId:', pageId)

    if (!pageId) {
      return NextResponse.json({ error: 'Page ID required' }, { status: 400 })
    }

    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()

    // Check if integration exists
    const existing = await prisma.facebookIntegration.findUnique({
      where: { organizationId }
    })

    let integration
    if (existing) {
      // Update
      integration = await prisma.facebookIntegration.update({
        where: { organizationId },
        data: {
          pageId,
          pageName: pageName || existing.pageName,
          ...(pageAccessToken && { pageAccessToken }),
          welcomeMessage,
          botEnabled: botEnabled ?? true,
          bookingEnabled: bookingEnabled ?? true,
        }
      })
    } else {
      // Create - token required for new integration
      if (!pageAccessToken) {
        return NextResponse.json({ error: 'Access Token required for new integration' }, { status: 400 })
      }
      
      integration = await prisma.facebookIntegration.create({
        data: {
          organizationId,
          pageId,
          pageName,
          pageAccessToken,
          welcomeMessage,
          botEnabled: botEnabled ?? true,
          bookingEnabled: bookingEnabled ?? true,
        }
      })
    }

    return NextResponse.json({ 
      success: true, 
      integration: {
        id: integration.id,
        pageId: integration.pageId,
        pageName: integration.pageName,
        verifyToken: integration.verifyToken,
        isActive: integration.isActive,
      },
      webhookUrl: `https://saas-hotel.vercel.app/api/messenger/webhook`,
      message: 'Facebook integration saved successfully'
    })
  } catch (error: any) {
    console.error('[Facebook API] POST error:', error?.message || error)
    return NextResponse.json({ error: error?.message || 'Internal error' }, { status: 500 })
  }
}

// DELETE - Remove Facebook Integration
export async function DELETE(request: NextRequest) {
  try {
    const { getOrganizationId } = await import('@/lib/tenant')
    let organizationId = await getOrganizationId()
    
    if (!organizationId) {
      organizationId = request.headers.get('x-organization-id')
    }
    
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 })
    }

    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()

    await prisma.facebookIntegration.delete({
      where: { organizationId }
    })

    return NextResponse.json({ success: true, message: 'Facebook integration removed' })
  } catch (error: any) {
    console.error('[Facebook API] DELETE error:', error?.message || error)
    return NextResponse.json({ error: error?.message || 'Internal error' }, { status: 500 })
  }
}