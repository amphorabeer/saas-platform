import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from './[...nextauth]'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  
  try {
    const session = await getServerSession(req, res, authOptions)
    
    if (!session?.user) {
      return res.json({ status: 'trial' })
    }
    
    const user = session.user as any
    const tenantId = user.tenantId
    const hotelCode = user.hotelCode
    
    console.log(`[Subscription API] Checking: tenantId=${tenantId}, hotelCode=${hotelCode}`)
    
    if (!tenantId && !hotelCode) {
      return res.json({ status: 'trial' })
    }
    
    // Try to find organization by tenantId first, then by hotelCode
    let organization = null
    
    if (tenantId) {
      organization = await prisma.organization.findFirst({
        where: { tenantId },
        include: { subscription: true }
      })
    }
    
    // If not found by tenantId, try by hotelCode
    if (!organization && hotelCode) {
      organization = await prisma.organization.findFirst({
        where: { hotelCode },
        include: { subscription: true }
      })
    }
    
    const status = organization?.subscription?.status?.toLowerCase() || 'trial'
    const plan = organization?.subscription?.plan || 'STARTER'
    
    console.log(`[Subscription API] Found org: ${!!organization}, status=${status}, plan=${plan}`)
    
    return res.json({ status, plan })
  } catch (error) {
    console.error('[Subscription API] Error:', error)
    return res.json({ status: 'trial' })
  }
}