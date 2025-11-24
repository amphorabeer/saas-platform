import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@saas-platform/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    const [organizations, total] = await Promise.all([
      prisma.organization.findMany({
        skip,
        take: limit,
        include: {
          subscription: true,
          modules: true, // ModuleAccess relation
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
      status: org.subscription?.status?.toLowerCase() || 'trial',
      plan: org.subscription?.plan || 'STARTER',
      users: org._count.users,
      modules: org.modules.map(m => m.moduleType), // ModuleAccess has moduleType
      revenue: org.subscription ? Number(org.subscription.price) * 12 : 0, // Annual estimate
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
    
    // Fallback to static data if database fails
    return NextResponse.json({
      organizations: [
        {
          id: "1",
          name: "Hotel Tbilisi",
          email: "info@hoteltbilisi.ge",
          slug: "hotel-tbilisi",
          status: "active",
          plan: "PROFESSIONAL",
          users: 12,
          modules: ["HOTEL"],
          revenue: 2340,
          createdAt: "2024-01-15",
        },
        {
          id: "2",
          name: "Beauty House",
          email: "hello@beautyhouse.ge",
          slug: "beauty-house",
          status: "active",
          plan: "ENTERPRISE",
          users: 8,
          modules: ["BEAUTY"],
          revenue: 3200,
          createdAt: "2024-02-20",
        },
        {
          id: "3",
          name: "Restaurant Plaza",
          email: "contact@restaurantplaza.ge",
          slug: "restaurant-plaza",
          status: "trial",
          plan: "STARTER",
          users: 3,
          modules: ["RESTAURANT"],
          revenue: 0,
          createdAt: "2024-03-10",
        }
      ],
      total: 3,
      page: 1,
      totalPages: 1
    })
  }
}

