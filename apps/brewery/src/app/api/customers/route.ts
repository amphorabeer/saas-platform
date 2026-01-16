import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@saas-platform/database'
import { withTenant, RouteContext } from '@/lib/api-middleware'

// GET /api/customers - List all customers
export const GET = withTenant(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type')
    const isActive = searchParams.get('isActive')
    const search = searchParams.get('search')

    const where: any = { tenantId: ctx.tenantId }
    if (type && type !== 'all') {
      where.type = type.toUpperCase()
    }
    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === 'true'
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    const customers = await prisma.customer.findMany({
      where,
      include: {
        orders: {
          select: { id: true, totalAmount: true },
          take: 5,
        },
        _count: { select: { orders: true } },
      },
      orderBy: { name: 'asc' },
    })

    const transformed = customers.map(c => ({
      id: c.id,
      name: c.name,
      type: c.type,
      typeName: getCustomerTypeName(c.type),
      email: c.email,
      phone: c.phone,
      address: c.address,
      city: c.city,
      taxId: c.taxId,
      kegReturnDays: (c as any).kegReturnDays || 14,
      kegDepositRequired: (c as any).kegDepositRequired !== false, // default to true if not specified
      isActive: c.isActive,
      totalOrders: c._count.orders,
      totalRevenue: c.orders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0),
    }))

    return NextResponse.json({
      customers: transformed,
      stats: {
        total: customers.length,
        active: customers.filter(c => c.isActive).length,
      },
    })
  } catch (error) {
    console.error('[CUSTOMERS API] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 })
  }
})

// POST /api/customers
export const POST = withTenant(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const { name, type, email, phone, address, city, taxId } = await req.json()
    if (!name) {
      return NextResponse.json({ error: 'სახელი სავალდებულოა' }, { status: 400 })
    }

    const customer = await prisma.customer.create({
      data: {
        tenantId: ctx.tenantId,
        name,
        type: (type || 'RETAIL').toUpperCase(),
        email,
        phone,
        address,
        city,
        taxId,
        isActive: true,
      },
    })
    return NextResponse.json({ success: true, customer })
  } catch (error) {
    console.error('[CUSTOMERS API] POST Error:', error)
    return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 })
  }
})

// PATCH /api/customers
export const PATCH = withTenant(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const { id, ...updateData } = await req.json()
    if (!id) {
      return NextResponse.json({ error: 'id სავალდებულოა' }, { status: 400 })
    }

    const customer = await prisma.customer.update({
      where: { id },
      data: updateData,
    })
    return NextResponse.json({ success: true, customer })
  } catch (error) {
    console.error('[CUSTOMERS API] PATCH Error:', error)
    return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 })
  }
})

function getCustomerTypeName(type: string): string {
  const names: Record<string, string> = {
    RETAIL: 'საცალო',
    WHOLESALE: 'საბითუმო',
    DISTRIBUTOR: 'დისტრიბუტორი',
    RESTAURANT: 'რესტორანი',
    BAR: 'ბარი',
    EXPORT: 'ექსპორტი',
  }
  return names[type] || type
}
