import { NextRequest, NextResponse } from 'next/server'
import { withTenantAuth, type RouteContext } from '../withTenantAuth'
import { prisma } from '@saas-platform/database'

// GET /api/haccp/suppliers
export const GET = withTenantAuth(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '200', 10) || 200, 500)
    const q = searchParams.get('q')?.trim()

    const suppliers = await prisma.haccpSupplier.findMany({
      where: {
        tenantId: ctx.tenantId,
        ...(q
          ? {
              name: { contains: q, mode: 'insensitive' },
            }
          : {}),
      },
      orderBy: { name: 'asc' },
      take: limit,
    })

    return NextResponse.json({ suppliers })
  } catch (error) {
    console.error('[GET /api/haccp/suppliers]', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to list suppliers' } },
      { status: 500 }
    )
  }
})

// POST /api/haccp/suppliers
export const POST = withTenantAuth(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const body = await req.json()
    const name = body.name != null ? String(body.name).trim() : ''
    if (!name) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'name is required' } },
        { status: 400 }
      )
    }

    let products: string[] = []
    if (Array.isArray(body.products)) {
      products = body.products.map((p: unknown) => String(p))
    } else if (body.products != null) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'products must be an array of strings' } },
        { status: 400 }
      )
    }

    const supplier = await prisma.haccpSupplier.create({
      data: {
        tenantId: ctx.tenantId,
        name,
        contactPerson:
          body.contactPerson != null ? String(body.contactPerson) : null,
        phone: body.phone != null ? String(body.phone) : null,
        email: body.email != null ? String(body.email) : null,
        address: body.address != null ? String(body.address) : null,
        products,
        notes: body.notes != null ? String(body.notes) : null,
      },
    })

    return NextResponse.json({ supplier }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/haccp/suppliers]', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to create supplier' } },
      { status: 500 }
    )
  }
})
