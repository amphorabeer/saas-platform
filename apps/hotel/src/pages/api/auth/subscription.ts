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
    const odooOrganizationId = user.odooOrganizationId
    
    if (!tenantId && !odooOrganizationId) {
      return res.json({ status: 'trial' })
    }
    
    // Try to find organization by tenantId first, then by odooOrganizationId (which is hotelCode)
    let organization = null
    
    if (tenantId) {
      organization = await prisma.organization.findFirst({
        where: { tenantId },
        include: { subscription: true }
      })
    }
    
    // If not found by tenantId, try by hotelCode (odooOrganizationId)
    if (!organization && odooOrganizationId) {
      organization = await prisma.organization.findFirst({
        where: { hotelCode: odooOrganizationId },
        include: { subscription: true }
      })
    }
    
    const status = organization?.subscription?.status?.toLowerCase() || 'trial'
    
    console.log(`[Subscription API] tenantId=${tenantId}, odooOrgId=${odooOrganizationId}, found=${!!organization}, status=${status}`)
    
    return res.json({ 
      status,
      plan: organization?.subscription?.plan || 'STARTER'
    })
  } catch (error) {
    console.error('[Subscription API] Error:', error)
    return res.json({ status: 'trial' })
  }
}