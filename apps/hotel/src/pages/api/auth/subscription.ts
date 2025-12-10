import type { NextApiRequest, NextApiResponse } from 'next'

import { getServerSession } from 'next-auth'

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
    
    const tenantId = (session.user as any).tenantId
    
    if (!tenantId) {
      return res.json({ status: 'trial' })
    }
    
    const { PrismaClient } = require('@prisma/client')
    const prisma = new PrismaClient()
    
    const organization = await prisma.organization.findFirst({
      where: { tenantId },
      include: { subscription: true }
    })
    
    await prisma.$disconnect()
    
    const status = organization?.subscription?.status?.toLowerCase() || 'trial'
    
    return res.json({ 
      status,
      plan: organization?.subscription?.plan || 'STARTER'
    })
  } catch (error) {
    return res.json({ status: 'trial' })
  }
}

