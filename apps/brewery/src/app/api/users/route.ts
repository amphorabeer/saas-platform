import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@saas-platform/database'
import { withPermission, RouteContext } from '@/lib/api-middleware'
import { z } from 'zod'

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(['OWNER', 'ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER']).default('OPERATOR'),
  isActive: z.boolean().default(true),
  password: z.string().optional(),
})

// GET /api/users - სია
export const GET = withPermission('settings:read', async (req: NextRequest, ctx: RouteContext) => {
  try {
    const users = await prisma.user.findMany({
      where: { tenantId: ctx.tenantId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({
      users: users.map(user => ({
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
      })),
    })
  } catch (error) {
    console.error('Users GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
})

// POST /api/users - ახალი მომხმარებელი
export const POST = withPermission('settings:create', async (req: NextRequest, ctx: RouteContext) => {
  try {
    const body = await req.json()
    const input = createUserSchema.parse(body)

    // შევამოწმოთ email უნიკალურობა tenant-ში
    const existing = await prisma.user.findUnique({
      where: {
        tenantId_email: {
          tenantId: ctx.tenantId,
          email: input.email,
        },
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'ამ ელ-ფოსტით მომხმარებელი უკვე არსებობს' },
        { status: 400 }
      )
    }

    const user = await prisma.user.create({
      data: {
        tenantId: ctx.tenantId,
        email: input.email,
        name: input.name,
        role: input.role,
        isActive: input.isActive,
        password: input.password || null,
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
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Users POST error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
})


