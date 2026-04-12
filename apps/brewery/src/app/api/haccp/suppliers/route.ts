import { NextRequest, NextResponse } from 'next/server'
import { withTenantAuth, type RouteContext } from '../withTenantAuth'
import { prisma } from '@saas-platform/database'

// GET /api/haccp/suppliers — reads from Supplier (finances) model
export const GET = withTenantAuth(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '200', 10), 500)
    const q = searchParams.get('q')?.trim()

    const suppliers = await (prisma as any).supplier.findMany({
      where: {
        tenantId: ctx.tenantId,
        isActive: true,
        ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
      },
      orderBy: { name: 'asc' },
      take: limit,
      select: {
        id: true,
        name: true,
        category: true,
        phone: true,
        email: true,
        address: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    // Map to HACCP format — extract contactPerson from notes if present
    const mapped = suppliers.map((s: any) => {
      let contactPerson: string | null = null
      if (s.notes?.includes('საკონტაქტო პირი:')) {
        const m = s.notes.match(/საკონტაქტო პირი:\s*([^\n]+)/)
        if (m) contactPerson = m[1].trim()
      }
      // products from category
      const products = s.category ? [s.category] : []

      return {
        id: s.id,
        name: s.name,
        contactPerson,
        phone: s.phone,
        email: s.email,
        address: s.address,
        products,
        notes: s.notes,
        updatedAt: s.updatedAt,
      }
    })

    return NextResponse.json({ suppliers: mapped })
  } catch (error) {
    console.error('[GET /api/haccp/suppliers]', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to list suppliers' } },
      { status: 500 }
    )
  }
})

// POST — redirect to finances supplier creation
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

    const supplier = await (prisma as any).supplier.create({
      data: {
        tenantId: ctx.tenantId,
        name,
        category: body.category || 'other',
        phone: body.phone || null,
        email: body.email || null,
        address: body.address || null,
        notes: body.contactPerson
          ? `საკონტაქტო პირი: ${body.contactPerson}\n${body.notes || ''}`
          : body.notes || null,
        isActive: true,
      },
    })

    return NextResponse.json(
      {
        supplier: {
          id: supplier.id,
          name: supplier.name,
          contactPerson: body.contactPerson || null,
          phone: supplier.phone,
          email: supplier.email,
          products: [],
          notes: supplier.notes,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[POST /api/haccp/suppliers]', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to create supplier' } },
      { status: 500 }
    )
  }
})
