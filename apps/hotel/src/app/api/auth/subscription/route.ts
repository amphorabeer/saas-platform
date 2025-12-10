export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Lazy import to prevent build-time evaluation
    const { getTenantId } = await import('@/lib/tenant')
    const tenantId = await getTenantId()
    
    if (!tenantId) {
      return NextResponse.json({ status: 'trial' })
    }
    
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()
    const organization = await prisma.organization.findFirst({
      where: { tenantId },
      include: { subscription: true }
    })

    const status = organization?.subscription?.status?.toLowerCase() || 'trial'
    
    return NextResponse.json({ 
      status,
      plan: organization?.subscription?.plan || 'STARTER'
    })
  } catch (error) {
    return NextResponse.json({ status: 'trial' })
  }
}




