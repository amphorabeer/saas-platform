import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const [
        totalOrganizations,
        totalUsers,
        activeSubscriptions,
        trialSubscriptions
      ] = await Promise.all([
        prisma.organization.count(),
        prisma.user.count(),
        prisma.subscription.count({ where: { status: 'ACTIVE' } }),
        prisma.subscription.count({ where: { status: 'TRIAL' } })
      ])

      return res.status(200).json({
        totalOrganizations,
        totalUsers,
        activeSubscriptions,
        trialSubscriptions
      })
    } catch (error: any) {
      console.error('Failed to fetch stats:', error)
      return res.status(500).json({ error: error.message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

