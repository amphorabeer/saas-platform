import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@saas-platform/database'
import { withPermission, RouteContext } from '@/lib/api-middleware'
import { z } from 'zod'

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(['OWNER', 'ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER']).optional(),
  isActive: z.boolean().optional(),
})

// GET /api/users/[id]
export const GET = withPermission('settings:read', async (
  req: NextRequest,
  ctx: RouteContext
) => {
  try {
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    const idIndex = pathParts.indexOf('users') + 1
    const id = pathParts[idIndex]
    
    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const user = await prisma.user.findFirst({
      where: { id, tenantId: ctx.tenantId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        firstName: user.name.split(' ')[0] || user.name,
        lastName: user.name.split(' ').slice(1).join(' ') || '',
        role: user.role.toLowerCase(),
        status: user.isActive ? 'active' : 'inactive',
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    })
  } catch (error) {
    console.error('User GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 })
  }
})

// PUT /api/users/[id]
export const PUT = withPermission('settings:update', async (
  req: NextRequest,
  ctx: RouteContext
) => {
  try {
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    const idIndex = pathParts.indexOf('users') + 1
    const id = pathParts[idIndex]
    
    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }
    
    const body = await req.json()
    const input = updateUserSchema.parse(body)

    const existing = await prisma.user.findFirst({
      where: { id, tenantId: ctx.tenantId },
    })

    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.role && { role: input.role }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      },
    })

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        firstName: user.name.split(' ')[0] || user.name,
        lastName: user.name.split(' ').slice(1).join(' ') || '',
        role: user.role.toLowerCase(),
        status: user.isActive ? 'active' : 'inactive',
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    })
  } catch (error) {
    console.error('User PUT error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
})

// DELETE /api/users/[id]
export const DELETE = withPermission('settings:delete', async (
  req: NextRequest,
  ctx: RouteContext
) => {
  try {
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    const idIndex = pathParts.indexOf('users') + 1
    const id = pathParts[idIndex]
    
    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const existing = await prisma.user.findFirst({
      where: { id, tenantId: ctx.tenantId },
    })

    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // არ წაშალო OWNER როლის მომხმარებელი
    if (existing.role === 'OWNER') {
      return NextResponse.json(
        { error: 'მფლობელის წაშლა შეუძლებელია' },
        { status: 400 }
      )
    }

    await prisma.user.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('User DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
  }
})

