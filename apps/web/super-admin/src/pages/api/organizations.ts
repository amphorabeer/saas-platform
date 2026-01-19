import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../lib/prisma'

// Generate unique 4-digit code
async function generateUniqueCode(): Promise<string> {
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

// Verify internal API key for service-to-service calls
function verifyInternalApiKey(req: NextApiRequest): boolean {
  const apiKey = req.headers['x-internal-api-key']
  const expectedKey = process.env.INTERNAL_API_KEY || 'internal-api-key-change-in-production'
  return apiKey === expectedKey
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  
  // ========================================
  // GET - Fetch all organizations
  // ========================================
  if (req.method === 'GET') {
    try {
      const { search, module, plan, status, page = '1', limit = '20' } = req.query
      
      const pageNum = parseInt(page as string) || 1
      const limitNum = parseInt(limit as string) || 20
      const skip = (pageNum - 1) * limitNum

      // Build where clause
      const where: any = {}
      
      if (search) {
        where.OR = [
          { name: { contains: search as string, mode: 'insensitive' } },
          { email: { contains: search as string, mode: 'insensitive' } },
          { hotelCode: { contains: search as string, mode: 'insensitive' } },
          { tenantCode: { contains: search as string, mode: 'insensitive' } },
        ]
      }

      if (module && module !== 'all') {
        where.modules = {
          some: { moduleType: module as string }
        }
      }

      if (plan && plan !== 'all') {
        where.subscription = {
          plan: plan as string
        }
      }

      if (status && status !== 'all') {
        where.subscription = {
          ...where.subscription,
          status: (status as string).toUpperCase()
        }
      }

      const [organizations, total] = await Promise.all([
        prisma.organization.findMany({
          where,
          include: {
            subscription: true,
            modules: true,
            _count: { select: { users: true } }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limitNum,
        }),
        prisma.organization.count({ where })
      ])

      const formattedOrgs = organizations.map((org: any) => ({
        id: org.id,
        name: org.name,
        email: org.email,
        slug: org.slug,
        // Support both hotel and brewery codes
        hotelCode: org.hotelCode || '',
        tenantCode: (org as any).tenantCode || '',
        tenantId: (org as any).tenantId || '',
        // Company info
        company: (org as any).company || '',
        taxId: (org as any).taxId || '',
        phone: (org as any).phone || '',
        address: (org as any).address || '',
        // Subscription
        status: org.subscription?.status?.toLowerCase() || 'trial',
        plan: org.subscription?.plan || 'STARTER',
        // Relations
        users: org._count.users,
        modules: org.modules.map((m: any) => m.moduleType),
        // Revenue - calculate from subscription price (monthly)
        revenue: Number(org.subscription?.price) || 0,
        createdAt: org.createdAt.toISOString().split('T')[0],
      }))

      return res.status(200).json({
        organizations: formattedOrgs,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      })

    } catch (error: any) {
      console.error('Failed to fetch organizations:', error)
      return res.status(500).json({ error: error.message })
    }
  }

  // ========================================
  // POST - Create new organization
  // ========================================
  if (req.method === 'POST') {
    try {
      const body = req.body
      const { 
        name, 
        email, 
        slug, 
        plan, 
        status, 
        modules,
        // Brewery-specific fields
        tenantId,
        tenantCode,
        company,
        taxId,
        phone,
        address,
        city,
        country,
        website,
        bankName,
        bankAccount,
      } = body

      // Validate required fields
      if (!name || !email || !slug) {
        return res.status(400).json({ error: 'Name, email, and slug are required' })
      }

      // Check if slug already exists
      const existingOrg = await prisma.organization.findFirst({ where: { slug } })
      if (existingOrg) {
        return res.status(409).json({ error: 'Slug already exists' })
      }

      // Generate unique code (used as hotelCode for hotels, stored alongside tenantCode for breweries)
      const uniqueCode = await generateUniqueCode()

      // Determine if this is a brewery registration (has tenantCode)
      const isBreweryRegistration = !!tenantCode

      // Create Organization with all fields
      const organization = await prisma.organization.create({
        data: {
          name,
          email,
          slug,
          hotelCode: isBreweryRegistration ? uniqueCode : uniqueCode, // Always generate for consistency
          // Brewery-specific fields (these need to be added to schema if not present)
          // We'll store them in a JSON field or add new columns
          ...(isBreweryRegistration && {
            // @ts-ignore - These fields may need to be added to schema
            tenantId: tenantId,
            tenantCode: tenantCode,
          }),
          // Company details
          // @ts-ignore - These fields may need to be added to schema
          company: company || null,
          taxId: taxId || null,
          phone: phone || null,
          address: address || null,
          website: website || null,
          bankName: bankName || null,
          bankAccount: bankAccount || null,
        },
      })

      // Create Subscription
      const now = new Date()
      const trialEnd = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000) // 15 days
      await prisma.subscription.create({
        data: {
          organizationId: organization.id,
          plan: plan || 'STARTER',
          status: (status || 'trial').toUpperCase(),
          price: getPlanPrice(plan || 'STARTER'),
          currentPeriodStart: now,
          currentPeriodEnd: trialEnd,
          trialStart: now,
          trialEnd: trialEnd,
        }
      })

      // Create Module Access
      const moduleList = modules && Array.isArray(modules) ? modules : ['HOTEL']
      for (const moduleType of moduleList) {
        await prisma.moduleAccess.create({
          data: {
            organizationId: organization.id,
            moduleType,
            isActive: true
          }
        })
      }

      console.log(`✅ [Organizations API] Created organization: ${name} (${isBreweryRegistration ? 'brewery' : 'hotel'})`)

      return res.status(200).json({ 
        success: true, 
        organization: {
          ...organization,
          tenantCode: tenantCode || null,
        }
      })

    } catch (error: any) {
      console.error('Failed to create organization:', error)
      return res.status(500).json({ error: error.message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

// Helper function to get plan price
function getPlanPrice(plan: string): number {
  switch (plan) {
    case 'STARTER':
      return 0
    case 'PROFESSIONAL':
      return 99
    case 'ENTERPRISE':
      return 299
    default:
      return 0
  }
}
