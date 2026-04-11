import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import type { Prisma } from '@prisma/client'
import { authOptions } from '@/lib/auth'
import { prisma } from '@saas-platform/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET - Tenant მონაცემების წამოღება
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = (session.user as { tenantId?: string }).tenantId

    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 404 })
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        code: true,
        slug: true,
        plan: true,
        legalName: true,
        taxId: true,
        phone: true,
        email: true,
        address: true,
        website: true,
        bankName: true,
        bankAccount: true,
        bankSwift: true,
        logoUrl: true,
        createdAt: true,
      },
    })

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    return NextResponse.json({ tenant })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Tenant GET] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch tenant', details: message }, { status: 500 })
  }
}

/** Whitelist PUT body → Prisma `Tenant` scalar fields only (no unknown keys). */
function buildTenantUpdateData(body: Record<string, unknown>): Prisma.TenantUpdateInput {
  const validData: Prisma.TenantUpdateInput = {}

  if (body.name !== undefined) validData.name = body.name as string
  if (body.legalName !== undefined) validData.legalName = body.legalName as string | null
  if (body.taxId !== undefined) validData.taxId = body.taxId as string | null
  if (body.phone !== undefined) validData.phone = body.phone as string | null
  if (body.email !== undefined) validData.email = body.email as string | null
  if (body.address !== undefined) validData.address = body.address as string | null
  if (body.website !== undefined) validData.website = body.website as string | null
  if (body.bankName !== undefined) validData.bankName = body.bankName as string | null
  if (body.bankAccount !== undefined) validData.bankAccount = body.bankAccount as string | null
  if (body.bankSwift !== undefined) validData.bankSwift = body.bankSwift as string | null
  if (body.logoUrl !== undefined) {
    if (body.logoUrl === null || body.logoUrl === '') {
      validData.logoUrl = null
    } else if (typeof body.logoUrl === 'string') {
      validData.logoUrl = body.logoUrl
    }
  }

  return validData
}

// PUT - Tenant მონაცემების განახლება
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = (session.user as { tenantId?: string }).tenantId
    const userRole = (session.user as { role?: string }).role

    if (!['OWNER', 'ADMIN'].includes(userRole || '')) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 404 })
    }

    const body = (await req.json()) as Record<string, unknown>
    const validData = buildTenantUpdateData(body)

    if (Object.keys(validData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const tenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: validData,
    })

    return NextResponse.json({ success: true, tenant })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Tenant PUT] Error:', error)
    return NextResponse.json({ error: 'Failed to update tenant', details: message }, { status: 500 })
  }
}
