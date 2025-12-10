export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getTenantId } from '@/lib/tenant'

import { prisma } from '@/lib/prisma'

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




