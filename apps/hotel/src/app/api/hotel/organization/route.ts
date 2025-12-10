export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    // Lazy import to prevent build-time evaluation
    const { getTenantId, unauthorizedResponse } = await import('@/lib/tenant')
    const tenantId = await getTenantId()
    
    if (!tenantId) {
      return unauthorizedResponse()
    }
    
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()
    // Get organization by tenantId
    const organization = await prisma.organization.findUnique({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        logo: true,
        company: true,
        taxId: true,
        city: true,
        country: true,
        website: true,
        bankName: true,
        bankAccount: true,
        hotelCode: true,
        slug: true,
      },
    })
    
    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(organization)
  } catch (error: any) {
    console.error('Error fetching organization:', error)
    return NextResponse.json(
      { error: 'Failed to fetch organization' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Lazy import to prevent build-time evaluation
    const { getTenantId, unauthorizedResponse } = await import('@/lib/tenant')
    const tenantId = await getTenantId()
    
    if (!tenantId) {
      return unauthorizedResponse()
    }
    
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()
    const body = await request.json()
    
    // Update organization
    const organization = await prisma.organization.update({
      where: { tenantId },
      data: {
        name: body.name,
        email: body.email,
        phone: body.phone,
        address: body.address,
        logo: body.logo,
        company: body.company,
        taxId: body.taxId,
        city: body.city,
        country: body.country,
        website: body.website,
        bankName: body.bankName,
        bankAccount: body.bankAccount,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        logo: true,
        company: true,
        taxId: true,
        city: true,
        country: true,
        website: true,
        bankName: true,
        bankAccount: true,
        hotelCode: true,
        slug: true,
      },
    })
    
    return NextResponse.json(organization)
  } catch (error: any) {
    console.error('Error updating organization:', error)
    return NextResponse.json(
      { error: 'Failed to update organization' },
      { status: 500 }
    )
  }
}





