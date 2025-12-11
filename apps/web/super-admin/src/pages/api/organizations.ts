import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../lib/prisma'

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { searchParams } = new URL(req.url || '', `http://${req.headers.host}`)
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

      return res.status(200).json({
        organizations: transformed,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      })
    } catch (error: any) {
      console.error('Failed to fetch organizations:', error)
      return res.status(500).json({
        organizations: [],
        total: 0,
        page: 1,
        totalPages: 0,
        error: error.message
      })
    }
  }

  if (req.method === 'POST') {
    try {
      const body = req.body
      const { name, email, slug, plan, status, modules } = body

      if (!name || !email || !slug) {
        return res.status(400).json({ error: 'Name, email, and slug are required' })
      }

      const existingOrg = await prisma.organization.findFirst({ where: { slug } })
      if (existingOrg) {
        return res.status(409).json({ error: 'Slug already exists' })
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

      return res.status(200).json({ success: true, organization: { ...organization, hotelCode } })
    } catch (error: any) {
      console.error('Failed to create organization:', error)
      return res.status(500).json({ error: error.message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

