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

const TENANT_PUT_ALLOWED = [
  'name',
  'legalName',
  'taxId',
  'phone',
  'email',
  'address',
  'website',
  'bankName',
  'bankAccount',
  'bankSwift',
  'logoUrl',
] as const

/** Only updatable Tenant scalars; never `code`, `slug`, `plan`, etc. */
function buildTenantUpdateData(body: Record<string, unknown>): Prisma.TenantUpdateInput {
  const validData: Prisma.TenantUpdateInput = {}

  for (const key of TENANT_PUT_ALLOWED) {
    if (body[key] === undefined) continue

    if (key === 'name') {
      const v = String(body.name ?? '').trim()
      if (v) validData.name = v
      continue
    }

    if (key === 'logoUrl') {
      if (body.logoUrl === null || body.logoUrl === '') validData.logoUrl = null
      else if (typeof body.logoUrl === 'string') validData.logoUrl = body.logoUrl
      continue
    }

    ;(validData as Record<string, unknown>)[key] = body[key]
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
    console.log('[Tenant PUT] body:', JSON.stringify(body))
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
