import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@saas-platform/database'

// Generate unique 4-digit hotel code
async function generateHotelCode(): Promise<string> {
  let code: string
  let exists = true
  
  while (exists) {
    code = Math.floor(1000 + Math.random() * 9000).toString()
    const existing = await prisma.organization.findFirst({
      where: { hotelCode: code }
    })
    exists = !!existing
  }
  
  return code!
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '100')
    const skip = (page - 1) * limit

    const [organizations, total] = await Promise.all([
      prisma.organization.findMany({
        skip,
        take: limit,
        include: {
          subscription: true,
          modules: true,
          _count: {
            select: { users: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.organization.count()
    ])

    // Transform data for frontend
    const transformed = organizations.map(org => ({
      id: org.id,
      name: org.name,
      email: org.email,
      slug: org.slug,
      hotelCode: org.hotelCode || '',
      status: org.subscription?.status?.toLowerCase() || 'trial',
      plan: org.subscription?.plan || 'STARTER',
      users: org._count.users,
      modules: org.modules.map(m => m.moduleType),
      revenue: org.subscription ? Number(org.subscription.price) * 12 : 0,
      createdAt: org.createdAt.toISOString().split('T')[0]
    }))

    return NextResponse.json({
      organizations: transformed,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    })
  } catch (error: any) {
    console.error('Failed to fetch organizations:', error)
    return NextResponse.json({
      organizations: [],
      total: 0,
      page: 1,
      totalPages: 0,
      error: error.message
    })
  }
}

// CREATE new organization
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, slug, plan, status, modules } = body

    if (!name || !email || !slug) {
      return NextResponse.json({ error: 'Name, email, and slug are required' }, { status: 400 })
    }

    const existingOrg = await prisma.organization.findFirst({ where: { slug } })
    if (existingOrg) {
      return NextResponse.json({ error: 'Slug already exists' }, { status: 409 })
    }

    const hotelCode = await generateHotelCode()

    const organization = await prisma.organization.create({
      data: { name, email, slug, hotelCode }
    })

    await prisma.subscription.create({
      data: {
        organizationId: organization.id,
        plan: plan || 'STARTER',
        status: (status || 'trial').toUpperCase(),
        price: 0,
        startDate: new Date(),
      }
    })

    if (modules && Array.isArray(modules)) {
      for (const moduleType of modules) {
        await prisma.moduleAccess.create({
          data: { organizationId: organization.id, moduleType, isActive: true }
        })
      }
    }

    return NextResponse.json({ success: true, organization: { ...organization, hotelCode } })
  } catch (error: any) {
    console.error('Failed to create organization:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
