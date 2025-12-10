import { NextResponse } from 'next/server'
import { prisma } from '@saas-platform/database'
import { getTenantId } from '@/lib/tenant'

export async function GET() {
  try {
    const tenantId = await getTenantId()
    
    if (!tenantId) {
      return NextResponse.json({ status: 'trial' })
    }

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




