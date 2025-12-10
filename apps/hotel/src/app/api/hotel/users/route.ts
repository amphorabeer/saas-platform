export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getTenantId, unauthorizedResponse } from '@/lib/tenant'
import { getServerSession } from 'next-auth'
import bcrypt from 'bcryptjs'

export async function GET() {
  try {
    const tenantId = await getTenantId()
    
    if (!tenantId) {
      return unauthorizedResponse()
    }
    
    // Lazy import to prevent build-time evaluation
    const { getAuthOptions } = await import('@/lib/auth')
    const authOptions = await getAuthOptions()
    const session = await getServerSession(authOptions)
    if (!session?.user?.organizationId) {
      return unauthorizedResponse()
    }
    
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()
    const users = await prisma.user.findMany({
      where: { organizationId: session.user.organizationId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        lastLoginAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })
    
    return NextResponse.json(users)
  } catch (error: any) {
    console.error('Error loading users:', error)
    return NextResponse.json({ error: 'Failed to load users', details: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const tenantId = await getTenantId()
    
    if (!tenantId) {
      return unauthorizedResponse()
    }
    
    // Lazy import to prevent build-time evaluation
    const { getAuthOptions } = await import('@/lib/auth')
    const authOptions = await getAuthOptions()
    const session = await getServerSession(authOptions)
    if (!session?.user?.organizationId) {
      return unauthorizedResponse()
    }
    
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()
    const body = await request.json()
    console.log('📥 POST /api/hotel/users - Body:', JSON.stringify(body, null, 2))
    
    const { name, email, password, role } = body
    
    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email and password are required' }, { status: 400 })
    }
    
    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })
    
    if (existingUser) {
      return NextResponse.json({ error: 'ელ-ფოსტა უკვე გამოყენებულია' }, { status: 400 })
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)
    
    // Map frontend role to database role (using valid enum values)
    const roleMap: Record<string, string> = {
      'admin': 'MODULE_ADMIN',
      'manager': 'MANAGER',
      'receptionist': 'USER',
      'staff': 'USER',
    }
    
    const dbRole = roleMap[role] || 'USER'
    console.log('📥 Mapped role:', role, '->', dbRole)
    
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: dbRole as any,
        organizationId: session.user.organizationId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    })
    
    console.log('✅ User created:', newUser.email)
    return NextResponse.json(newUser)
  } catch (error: any) {
    console.error('❌ Error creating user:', error.message)
    return NextResponse.json({ error: 'Failed to create user', details: error.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const tenantId = await getTenantId()
    
    if (!tenantId) {
      return unauthorizedResponse()
    }
    
    // Lazy import to prevent build-time evaluation
    const { getAuthOptions } = await import('@/lib/auth')
    const authOptions = await getAuthOptions()
    const session = await getServerSession(authOptions)
    if (!session?.user?.organizationId) {
      return unauthorizedResponse()
    }
    
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()
    const body = await request.json()
    const { id, password, role, ...updates } = body
    
    if (!id) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }
    
    // Verify user belongs to same organization
    const user = await prisma.user.findFirst({
      where: { id, organizationId: session.user.organizationId },
    })
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    // Prepare update data
    const updateData: any = { ...updates }
    
    // Hash new password if provided
    if (password) {
      updateData.password = await bcrypt.hash(password, 10)
    }
    
    // Map role if provided
    if (role) {
      const roleMap: Record<string, string> = {
        'admin': 'MODULE_ADMIN',
        'manager': 'MANAGER',
        'receptionist': 'USER',
        'staff': 'USER',
      }
      updateData.role = roleMap[role] || role
    }
    
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    })
    
    return NextResponse.json({ success: true, user: updatedUser })
  } catch (error: any) {
    console.error('Error updating user:', error)
    return NextResponse.json({ error: 'Failed to update user', details: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const tenantId = await getTenantId()
    
    if (!tenantId) {
      return unauthorizedResponse()
    }
    
    // Lazy import to prevent build-time evaluation
    const { getAuthOptions } = await import('@/lib/auth')
    const authOptions = await getAuthOptions()
    const session = await getServerSession(authOptions)
    if (!session?.user?.organizationId) {
      return unauthorizedResponse()
    }
    
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()
    const url = new URL(request.url)
    const id = url.searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }
    
    // Don't allow deleting yourself
    if (id === session.user.id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
    }
    
    // Verify user belongs to same organization
    const user = await prisma.user.findFirst({
      where: { id, organizationId: session.user.organizationId },
    })
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    await prisma.user.delete({
      where: { id },
    })
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting user:', error)
    return NextResponse.json({ error: 'Failed to delete user', details: error.message }, { status: 500 })
  }
}
