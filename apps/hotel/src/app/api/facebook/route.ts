import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Get Facebook Integration settings
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const integration = await prisma.facebookIntegration.findUnique({
      where: { organizationId: session.user.organizationId },
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
        // Don't return pageAccessToken for security
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
    const session = await getServerSession(authOptions)
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { pageId, pageName, pageAccessToken, welcomeMessage, botEnabled, bookingEnabled } = body

    if (!pageId || !pageAccessToken) {
      return NextResponse.json({ error: 'Page ID and Access Token required' }, { status: 400 })
    }

    // Verify the token works by calling Facebook API
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

    // Create or update integration
    const integration = await prisma.facebookIntegration.upsert({
      where: { organizationId: session.user.organizationId },
      create: {
        organizationId: session.user.organizationId,
        pageId,
        pageName: verifyData.name || pageName,
        pageAccessToken,
        welcomeMessage,
        botEnabled: botEnabled ?? true,
        bookingEnabled: bookingEnabled ?? true,
      },
      update: {
        pageId,
        pageName: verifyData.name || pageName,
        pageAccessToken,
        welcomeMessage,
        botEnabled,
        bookingEnabled,
      }
    })

    return NextResponse.json({ 
      success: true, 
      integration: {
        id: integration.id,
        pageId: integration.pageId,
        pageName: integration.pageName,
        verifyToken: integration.verifyToken,
        isActive: integration.isActive,
      },
      webhookUrl: `${process.env.NEXTAUTH_URL || 'https://saas-hotel.vercel.app'}/api/messenger/webhook`,
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
    const session = await getServerSession(authOptions)
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await prisma.facebookIntegration.delete({
      where: { organizationId: session.user.organizationId }
    })

    return NextResponse.json({ success: true, message: 'Facebook integration removed' })
  } catch (error) {
    console.error('[Facebook API] DELETE error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}