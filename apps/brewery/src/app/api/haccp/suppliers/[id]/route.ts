import { NextRequest, NextResponse } from 'next/server'
import { withTenantAuth, type RouteContext } from '../../withTenantAuth'
import { prisma } from '@saas-platform/database'

function extractId(url: string): string {
  const pathParts = new URL(url).pathname.split('/').filter(Boolean)
  return pathParts[pathParts.length - 1] || ''
}

export const GET = withTenantAuth(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const id = extractId(req.url)
    if (!id) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Supplier ID required' } },
        { status: 400 }
      )
    }

    const supplier = await prisma.haccpSupplier.findFirst({
      where: { id, tenantId: ctx.tenantId },
    })

    if (!supplier) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Supplier not found' } },
        { status: 404 }
      )
    }

    return NextResponse.json({ supplier })
  } catch (error) {
    console.error('[GET /api/haccp/suppliers/[id]]', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch supplier' } },
      { status: 500 }
    )
  }
})

export const PUT = withTenantAuth(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const id = extractId(req.url)
    if (!id) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Supplier ID required' } },
        { status: 400 }
      )
    }

    const existing = await prisma.haccpSupplier.findFirst({
      where: { id, tenantId: ctx.tenantId },
    })
    if (!existing) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Supplier not found' } },
        { status: 404 }
      )
    }

    const body = await req.json()
    const data: Record<string, unknown> = {}

    if (body.name !== undefined) {
      const name = String(body.name).trim()
      if (!name) {
        return NextResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: 'name cannot be empty' } },
          { status: 400 }
        )
      }
      data.name = name
    }
    if (body.contactPerson !== undefined) {
      data.contactPerson = body.contactPerson == null ? null : String(body.contactPerson)
    }
    if (body.phone !== undefined) {
      data.phone = body.phone == null ? null : String(body.phone)
    }
    if (body.email !== undefined) {
      data.email = body.email == null ? null : String(body.email)
    }
    if (body.address !== undefined) {
      data.address = body.address == null ? null : String(body.address)
    }
    if (body.products !== undefined) {
      if (!Array.isArray(body.products)) {
        return NextResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: 'products must be an array' } },
          { status: 400 }
        )
      }
      data.products = body.products.map((p: unknown) => String(p))
    }
    if (body.notes !== undefined) {
      data.notes = body.notes == null ? null : String(body.notes)
    }

    const supplier = await prisma.haccpSupplier.update({
      where: { id },
      data: data as any,
    })

    return NextResponse.json({ supplier })
  } catch (error) {
    console.error('[PUT /api/haccp/suppliers/[id]]', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to update supplier' } },
      { status: 500 }
    )
  }
})

export const DELETE = withTenantAuth(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const id = extractId(req.url)
    if (!id) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Supplier ID required' } },
        { status: 400 }
      )
    }

    const existing = await prisma.haccpSupplier.findFirst({
      where: { id, tenantId: ctx.tenantId },
    })
    if (!existing) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Supplier not found' } },
        { status: 404 }
      )
    }

    await prisma.haccpSupplier.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/haccp/suppliers/[id]]', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to delete supplier' } },
      { status: 500 }
    )
  }
})
