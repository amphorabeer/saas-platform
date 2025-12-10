import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'

// GET single organization
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const organization = await prisma.organization.findUnique({
      where: { id: params.id },
      include: {
        subscription: true,
        modules: true,
        _count: { select: { users: true } }
      }
    })

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    return NextResponse.json({
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
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// UPDATE organization
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { name, email, slug, plan, status, modules } = body

    // Update organization
    const organization = await prisma.organization.update({
      where: { id: params.id },
      data: { name, email, slug }
    })

    // Update subscription
    if (plan || status) {
      const existingSubscription = await prisma.subscription.findFirst({
        where: { organizationId: params.id }
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
        where: { organizationId: params.id }
      })

      for (const moduleType of modules) {
        await prisma.moduleAccess.create({
          data: {
            organizationId: params.id,
            moduleType,
            isActive: true
          }
        })
      }
    }

    return NextResponse.json({ success: true, organization })
  } catch (error: any) {
    console.error('Failed to update organization:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE organization
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.moduleAccess.deleteMany({
      where: { organizationId: params.id }
    })

    await prisma.subscription.deleteMany({
      where: { organizationId: params.id }
    })

    await prisma.organization.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Failed to delete organization:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

