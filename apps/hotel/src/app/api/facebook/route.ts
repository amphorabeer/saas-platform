import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Simple encryption for API keys
function encryptApiKey(key: string): string {
  return Buffer.from(key).toString('base64')
}

function decryptApiKey(encrypted: string): string {
  try {
    return Buffer.from(encrypted, 'base64').toString('utf-8')
  } catch {
    return encrypted
  }
}

// GET - Get Facebook Integration settings
export async function GET(request: NextRequest) {
  try {
    const { getOrganizationId } = await import('@/lib/tenant')
    let organizationId = await getOrganizationId()
    
    if (!organizationId) {
      organizationId = request.headers.get('x-organization-id')
    }
    
    console.log('[Facebook API] GET - organizationId:', organizationId)
    
    if (!organizationId) {
      return NextResponse.json({ integration: null })
    }

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
        // AI Settings
        aiEnabled: true,
        aiProvider: true,
        aiApiKey: true,
        aiModel: true,
        aiPersonality: true,
        aiLanguages: true,
        createdAt: true,
        updatedAt: true,
      }
    })

    // Mask API key for security
    if (integration?.aiApiKey) {
      const key = integration.aiApiKey
      integration.aiApiKey = key.length > 15 
        ? key.substring(0, 10) + '...' + key.substring(key.length - 4)
        : '••••••••'
    }

    return NextResponse.json({ integration })
  } catch (error: any) {
    console.error('[Facebook API] GET error:', error?.message || error)
    return NextResponse.json({ integration: null, error: error?.message })
  }
}

// POST - Create/Update Facebook Integration
export async function POST(request: NextRequest) {
  try {
    const { getOrganizationId } = await import('@/lib/tenant')
    let organizationId = await getOrganizationId()
    
    if (!organizationId) {
      organizationId = request.headers.get('x-organization-id')
    }
    
    console.log('[Facebook API] POST - organizationId:', organizationId)
    
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 })
    }

    const body = await request.json()
    const { 
      pageId, 
      pageName, 
      pageAccessToken, 
      welcomeMessage, 
      botEnabled, 
      bookingEnabled,
      // AI Settings
      aiEnabled,
      aiProvider,
      aiApiKey,
      aiModel,
      aiPersonality,
      aiLanguages,
    } = body

    console.log('[Facebook API] POST - pageId:', pageId, 'aiEnabled:', aiEnabled)

    if (!pageId) {
      return NextResponse.json({ error: 'Page ID required' }, { status: 400 })
    }

    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()

    // Check if integration exists
    const existing = await prisma.facebookIntegration.findUnique({
      where: { organizationId }
    })

    // Prepare AI settings data
    const aiData: any = {}
    if (aiEnabled !== undefined) aiData.aiEnabled = aiEnabled
    if (aiProvider) aiData.aiProvider = aiProvider
    if (aiModel) aiData.aiModel = aiModel
    if (aiPersonality) aiData.aiPersonality = aiPersonality
    if (aiLanguages) aiData.aiLanguages = aiLanguages
    
    // Only update API key if it's a new one (not masked)
    if (aiApiKey && !aiApiKey.includes('...') && !aiApiKey.includes('••')) {
      aiData.aiApiKey = encryptApiKey(aiApiKey)
    }

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
          ...aiData,
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
          ...aiData,
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
        aiEnabled: integration.aiEnabled,
        aiProvider: integration.aiProvider,
        aiModel: integration.aiModel,
      },
      webhookUrl: `https://hotel.geobiz.app/api/messenger/webhook`,
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

// Helper function to get AI settings for webhook (internal use)
export async function getAISettings(organizationId: string) {
  try {
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()
    
    const integration = await prisma.facebookIntegration.findUnique({
      where: { organizationId },
      select: {
        aiEnabled: true,
        aiProvider: true,
        aiApiKey: true,
        aiModel: true,
        aiPersonality: true,
        aiLanguages: true,
        botEnabled: true,
        welcomeMessage: true,
      }
    })
    
    if (integration?.aiApiKey) {
      integration.aiApiKey = decryptApiKey(integration.aiApiKey)
    }
    
    return integration
  } catch (error) {
    console.error('Error getting AI settings:', error)
    return null
  }
}