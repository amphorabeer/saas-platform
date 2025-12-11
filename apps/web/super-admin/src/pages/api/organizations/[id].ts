import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'

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

      // Update organization
      const organization = await prisma.organization.update({
        where: { id },
        data: { name, email, slug }
      })

      // Update subscription
      if (plan || status) {
        const existingSubscription = await prisma.subscription.findFirst({
          where: { organizationId: id }
        })

        if (existingSubscription) {
          await prisma.subscription.update({
            where: { id: existingSubscription.id },
            data: {
              ...(plan && { plan }),
              ...(status && { status: status.toUpperCase() })
            }
          })
        }
      }

      // Update modules - use moduleAccess not organizationModule!
      if (modules && Array.isArray(modules)) {
        await prisma.moduleAccess.deleteMany({
          where: { organizationId: id }
        })

        for (const moduleType of modules) {
          await prisma.moduleAccess.create({
            data: {
              organizationId: id,
              moduleType,
              isActive: true
            }
          })
        }
      }

      return res.status(200).json({ success: true, organization })
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

