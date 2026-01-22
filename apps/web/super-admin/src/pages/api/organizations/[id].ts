import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'

const VALID_STATUS = ['TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED'] as const
function getPlanPrice(plan: string): number {
  switch (plan) {
    case 'STARTER': return 0
    case 'PROFESSIONAL': return 99
    case 'ENTERPRISE': return 299
    default: return 0
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Organization ID is required' })
  }

  if (req.method === 'GET') {
    try {
      const organization = await prisma.organization.findUnique({
        where: { id },
        include: {
          subscription: true,
          modules: true,
          _count: { select: { users: true } }
        }
      })

      if (!organization) {
        return res.status(404).json({ error: 'Organization not found' })
      }

      return res.status(200).json({
        id: organization.id,
        name: organization.name,
        email: organization.email,
        slug: organization.slug,
        hotelCode: organization.hotelCode || '',
        status: organization.subscription?.status?.toLowerCase() || 'trial',
        plan: organization.subscription?.plan || 'STARTER',
        users: organization._count.users,
        modules: organization.modules.map(m => m.moduleType),
        createdAt: organization.createdAt.toISOString().split('T')[0]
      })
    } catch (error: any) {
      console.error('Failed to fetch organization:', error)
      return res.status(500).json({ error: error.message })
    }
  }

  if (req.method === 'PUT') {
    try {
      const body = req.body
      const { name, email, slug, plan, status, modules } = body
      console.log('[Organizations API] PUT /api/organizations/' + id, { body, status, plan })

      let organization: Awaited<ReturnType<typeof prisma.organization.update>> | null = null
      await prisma.$transaction(async (tx) => {
        // 1. Update organization
        organization = await tx.organization.update({
          where: { id },
          data: { name, email, slug }
        })

        // 2. Update or create Subscription (shared Hotel DB – Hotel app reads Subscription.status)
        if (plan != null || status != null) {
          const existingSubscription = await tx.subscription.findFirst({
            where: { organizationId: id }
          })

          const newStatus = status != null && String(status).trim() !== ''
            ? String(status).toUpperCase()
            : null
          const validStatus = newStatus && VALID_STATUS.includes(newStatus as any)
            ? newStatus
            : null
          const newPlan = plan != null && String(plan).trim() !== ''
            ? String(plan).toUpperCase()
            : null

          if (existingSubscription) {
            const data: { plan?: string; status?: string } = {}
            if (newPlan) data.plan = newPlan
            if (validStatus) data.status = validStatus
            if (Object.keys(data).length > 0) {
              await tx.subscription.update({
                where: { id: existingSubscription.id },
                data: data as any
              })
              console.log(`[Organizations API] Updated Subscription for org ${id}: ${JSON.stringify(data)}`)
            }
          } else {
            const now = new Date()
            const trialEnd = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000)
            const subPlan = newPlan || 'STARTER'
            const subStatus = validStatus || 'TRIAL'
            await tx.subscription.create({
              data: {
                organizationId: id,
                plan: subPlan as any,
                status: subStatus as any,
                price: getPlanPrice(subPlan),
                currentPeriodStart: now,
                currentPeriodEnd: trialEnd,
                trialStart: now,
                trialEnd: trialEnd
              }
            })
            console.log(`[Organizations API] Created Subscription for org ${id}: plan=${subPlan}, status=${subStatus}`)
          }
        }

        // 3. Update modules
        if (modules && Array.isArray(modules)) {
          await tx.moduleAccess.deleteMany({
            where: { organizationId: id }
          })
          for (const moduleType of modules) {
            await tx.moduleAccess.create({
              data: {
                organizationId: id,
                moduleType,
                isActive: true
              }
            })
          }
        }
      })

      return res.status(200).json({ success: true, organization: organization! })
    } catch (error: any) {
      console.error('Failed to update organization:', error)
      return res.status(500).json({ error: error.message })
    }
  }

  if (req.method === 'DELETE') {
    try {
      await prisma.moduleAccess.deleteMany({
        where: { organizationId: id }
      })

      await prisma.subscription.deleteMany({
        where: { organizationId: id }
      })

      await prisma.organization.delete({
        where: { id }
      })

      return res.status(200).json({ success: true })
    } catch (error: any) {
      console.error('Failed to delete organization:', error)
      return res.status(500).json({ error: error.message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

