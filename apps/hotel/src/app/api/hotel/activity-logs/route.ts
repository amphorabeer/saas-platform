export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

// GET - Fetch activity logs
export async function GET(request: NextRequest) {
  try {
    const { getOrganizationId, unauthorizedResponse } = await import('@/lib/tenant')
    const organizationId = await getOrganizationId()
    
    if (!organizationId) {
      return unauthorizedResponse()
    }
    
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()
    
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '100')
    const action = searchParams.get('action')
    const userId = searchParams.get('userId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    
    // Build where clause
    const where: any = {}
    
    // Get users from this organization
    const orgUsers = await prisma.user.findMany({
      where: { organizationId },
      select: { id: true }
    })
    const userIds = orgUsers.map(u => u.id)
    
    if (userIds.length > 0) {
      where.userId = { in: userIds }
    }
    
    if (action) {
      where.action = action
    }
    
    if (userId) {
      where.userId = userId
    }
    
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = new Date(startDate)
      if (endDate) where.createdAt.lte = new Date(endDate)
    }
    
    const logs = await prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: { name: true, email: true, role: true }
        }
      }
    })
    
    const mapped = logs.map(log => ({
      id: log.id,
      user: log.user?.name || 'Unknown',
      role: log.user?.role || 'user',
      action: log.action,
      details: log.details,
      timestamp: log.createdAt.toISOString(),
      ipAddress: log.ipAddress,
      userAgent: log.userAgent
    }))
    
    return NextResponse.json(mapped)
  } catch (error: any) {
    console.error('Error loading activity logs:', error)
    return NextResponse.json({ error: 'Failed to load logs', details: error.message }, { status: 500 })
  }
}

// POST - Create activity log
export async function POST(request: NextRequest) {
  try {
    const { getOrganizationId, unauthorizedResponse } = await import('@/lib/tenant')
    const { getServerSession } = await import('next-auth')
    const { authOptions } = await import('@/pages/api/auth/[...nextauth]')
    
    const organizationId = await getOrganizationId()
    
    if (!organizationId) {
      return unauthorizedResponse()
    }
    
    const session = await getServerSession(authOptions)
    const userId = (session?.user as any)?.id
    
    if (!userId) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 })
    }
    
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()
    const data = await request.json()
    
    // Get IP and User Agent from headers
    const ipAddress = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'
    
    const log = await prisma.activityLog.create({
      data: {
        userId,
        action: data.action,
        details: data.details || {},
        ipAddress,
        userAgent
      }
    })
    
    return NextResponse.json({
      id: log.id,
      action: log.action,
      timestamp: log.createdAt.toISOString()
    })
  } catch (error: any) {
    console.error('Error creating activity log:', error)
    return NextResponse.json({ error: 'Failed to create log', details: error.message }, { status: 500 })
  }
}

// DELETE - Clear logs (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const { getOrganizationId, unauthorizedResponse } = await import('@/lib/tenant')
    const { getServerSession } = await import('next-auth')
    const { authOptions } = await import('@/pages/api/auth/[...nextauth]')
    
    const organizationId = await getOrganizationId()
    
    if (!organizationId) {
      return unauthorizedResponse()
    }
    
    const session = await getServerSession(authOptions)
    const userRole = (session?.user as any)?.role
    
    // Only admin can clear logs
    if (userRole !== 'admin' && userRole !== 'ORGANIZATION_OWNER') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }
    
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()
    
    const { searchParams } = new URL(request.url)
    const olderThanDays = parseInt(searchParams.get('olderThanDays') || '30')
    
    // Get users from this organization
    const orgUsers = await prisma.user.findMany({
      where: { organizationId },
      select: { id: true }
    })
    const userIds = orgUsers.map(u => u.id)
    
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)
    
    const deleted = await prisma.activityLog.deleteMany({
      where: {
        userId: { in: userIds },
        createdAt: { lt: cutoffDate }
      }
    })
    
    return NextResponse.json({ deleted: deleted.count })
  } catch (error: any) {
    console.error('Error deleting activity logs:', error)
    return NextResponse.json({ error: 'Failed to delete logs', details: error.message }, { status: 500 })
  }
}