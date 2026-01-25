import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Get Facebook Integration settings
export async function GET(request: NextRequest) {
  try {
    // Get organizationId from header (sent from client)
    const organizationId = request.headers.get('x-organization-id')
    
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 })
    }

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
  } catch (error) {
    console.error('[Facebook API] GET error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// POST - Create/Update Facebook Integration
export async function POST(request: NextRequest) {
  try {
    const organizationId = request.headers.get('x-organization-id')
    
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 })
    }

    const body = await request.json()
    const { pageId, pageName, pageAccessToken, welcomeMessage, botEnabled, bookingEnabled } = body

    if (!pageId) {
      return NextResponse.json({ error: 'Page ID required' }, { status: 400 })
    }

    // If new token provided, verify it works
    if (pageAccessToken) {
      const verifyResponse = await fetch(
        `https://graph.facebook.com/v18.0/${pageId}?access_token=${pageAccessToken}&fields=name,id`
      )
      const verifyData = await verifyResponse.json()

      if (verifyData.error) {
        return NextResponse.json({ 
          error: 'Invalid Page ID or Access Token', 
          details: verifyData.error.message 
        }, { status: 400 })
      }
    }

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
  } catch (error) {
    console.error('[Facebook API] POST error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// DELETE - Remove Facebook Integration
export async function DELETE(request: NextRequest) {
  try {
    const organizationId = request.headers.get('x-organization-id')
    
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 })
    }

    await prisma.facebookIntegration.delete({
      where: { organizationId }
    })

    return NextResponse.json({ success: true, message: 'Facebook integration removed' })
  } catch (error) {
    console.error('[Facebook API] DELETE error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}