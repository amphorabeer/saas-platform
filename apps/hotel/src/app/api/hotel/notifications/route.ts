export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

// GET - Fetch notifications
export async function GET(request: NextRequest) {
  try {
    const { getOrganizationId, unauthorizedResponse } = await import('@/lib/tenant')
    const organizationId = await getOrganizationId()
    
    if (!organizationId) {
      return unauthorizedResponse()
    }
    
    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get('unread') === 'true'
    const type = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '50')
    
    // Get from localStorage simulation (or could use DB)
    // For now, return from memory/localStorage pattern
    // In production, this would query a Notification table
    
    return NextResponse.json({ 
      notifications: [],
      unreadCount: 0 
    })
  } catch (error: any) {
    console.error('Error loading notifications:', error)
    return NextResponse.json({ error: 'Failed to load notifications' }, { status: 500 })
  }
}

// POST - Create notification
export async function POST(request: NextRequest) {
  try {
    const { getOrganizationId, unauthorizedResponse } = await import('@/lib/tenant')
    const organizationId = await getOrganizationId()
    
    if (!organizationId) {
      return unauthorizedResponse()
    }
    
    const data = await request.json()
    
    console.log('🔔 Notification created:', data.type, data.title)
    
    // Create notification object
    const notification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      organizationId,
      type: data.type, // 'lost_found', 'minibar', 'task_completed', etc.
      title: data.title,
      message: data.message,
      data: data.data || {},
      read: false,
      createdAt: new Date().toISOString(),
      // Recipients
      recipientRole: data.recipientRole || 'manager', // 'manager', 'reception', 'all'
      recipientUserId: data.recipientUserId
    }
    
    // In production: Save to database
    // For now: Could emit to WebSocket, send email, etc.
    
    // Optional: Send email notification
    if (data.sendEmail && data.email) {
      // await sendEmailNotification(data.email, notification)
      console.log('📧 Would send email to:', data.email)
    }
    
    // Optional: Send Telegram notification
    if (data.sendTelegram && data.telegramChatId) {
      // await sendTelegramNotification(data.telegramChatId, notification)
      console.log('📱 Would send Telegram to:', data.telegramChatId)
    }
    
    return NextResponse.json({ 
      success: true, 
      notification 
    })
  } catch (error: any) {
    console.error('Error creating notification:', error)
    return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 })
  }
}

// PUT - Mark as read
export async function PUT(request: NextRequest) {
  try {
    const { getOrganizationId, unauthorizedResponse } = await import('@/lib/tenant')
    const organizationId = await getOrganizationId()
    
    if (!organizationId) {
      return unauthorizedResponse()
    }
    
    const data = await request.json()
    
    if (data.markAllRead) {
      // Mark all as read
      return NextResponse.json({ success: true, updated: 0 })
    }
    
    if (data.id) {
      // Mark specific notification as read
      return NextResponse.json({ success: true })
    }
    
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  } catch (error: any) {
    console.error('Error updating notification:', error)
    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 })
  }
}