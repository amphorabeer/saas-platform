import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@saas-platform/database'
import { withTenant, RouteContext } from '@/lib/api-middleware'

// GET - კონკრეტული კლიენტის მიღება
export const GET = withTenant(async (
  request: NextRequest,
  ctx: RouteContext
) => {
  try {
    // Extract id from URL: /api/customers/[id]
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const idIndex = pathParts.indexOf('customers') + 1
    const id = pathParts[idIndex]
    
    if (!id) {
      return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 })
    }

    const customer = await prisma.customer.findFirst({
      where: { 
        id,
        tenantId: ctx.tenantId
      },
      include: {
        _count: {
          select: { orders: true }
        },
        orders: {
          select: {
            totalAmount: true
          }
        }
      }
    })

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Calculate totals
    const totalRevenue = customer.orders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0)

    const formattedCustomer = {
      id: customer.id,
      name: customer.name,
      type: customer.type,
      typeName: getTypeName(customer.type),
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      city: customer.city,
      taxId: customer.taxId,
      kegReturnDays: (customer as any).kegReturnDays || 14,
      kegDepositRequired: (customer as any).kegDepositRequired !== false, // default to true if not specified
      isActive: customer.isActive,
      totalOrders: customer._count.orders,
      totalRevenue,
      createdAt: customer.createdAt.toISOString(),
    }

    return NextResponse.json({ customer: formattedCustomer })
  } catch (error) {
    console.error('[Customer API] GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch customer' }, { status: 500 })
  }
})

// PATCH - კლიენტის განახლება
export const PATCH = withTenant(async (
  request: NextRequest,
  ctx: RouteContext
) => {
  try {
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const idIndex = pathParts.indexOf('customers') + 1
    const id = pathParts[idIndex]
    
    if (!id) {
      return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 })
    }

    const body = await request.json()
    const { name, type, email, phone, address, city, taxId, isActive, kegReturnDays, kegDepositRequired } = body

    // Check if customer exists
    const existingCustomer = await prisma.customer.findFirst({
      where: { id, tenantId: ctx.tenantId },
    })

    if (!existingCustomer) {
      return NextResponse.json({ error: 'კლიენტი ვერ მოიძებნა' }, { status: 404 })
    }

    // Update customer
    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(type !== undefined && { type }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(address !== undefined && { address }),
        ...(city !== undefined && { city }),
        ...(taxId !== undefined && { taxId }),
        ...(isActive !== undefined && { isActive }),
        ...(kegReturnDays !== undefined && { kegReturnDays }),
        ...(kegDepositRequired !== undefined && { kegDepositRequired }),
      },
    })

    return NextResponse.json({
      customer: {
        id: updatedCustomer.id,
        name: updatedCustomer.name,
        type: updatedCustomer.type,
        typeName: getTypeName(updatedCustomer.type),
        email: updatedCustomer.email,
        phone: updatedCustomer.phone,
        address: updatedCustomer.address,
        city: updatedCustomer.city,
        taxId: updatedCustomer.taxId,
        isActive: updatedCustomer.isActive,
        kegReturnDays: (updatedCustomer as any).kegReturnDays,
        kegDepositRequired: (updatedCustomer as any).kegDepositRequired,
      },
    })
  } catch (error: any) {
    console.error('[Customer API] PATCH error:', error)
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'კლიენტი ამ სახელით უკვე არსებობს' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 })
  }
})

// DELETE - კლიენტის წაშლა
export const DELETE = withTenant(async (
  request: NextRequest,
  ctx: RouteContext
) => {
  try {
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const idIndex = pathParts.indexOf('customers') + 1
    const id = pathParts[idIndex]
    
    if (!id) {
      return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 })
    }

    // Check if customer has orders
    const ordersCount = await prisma.salesOrder.count({
      where: { customerId: id, tenantId: ctx.tenantId },
    })

    if (ordersCount > 0) {
      return NextResponse.json(
        { error: `კლიენტს აქვს ${ordersCount} შეკვეთა. წაშლა შეუძლებელია.` },
        { status: 400 }
      )
    }

    // Check if customer has invoices
    const invoicesCount = await (prisma as any).invoice.count({
      where: { customerId: id, tenantId: ctx.tenantId },
    })

    if (invoicesCount > 0) {
      return NextResponse.json(
        { error: `კლიენტს აქვს ${invoicesCount} ინვოისი. წაშლა შეუძლებელია.` },
        { status: 400 }
      )
    }

    await prisma.customer.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Customer API] DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete customer' }, { status: 500 })
  }
})

function getTypeName(type: string): string {
  const names: Record<string, string> = {
    RESTAURANT: 'რესტორანი',
    BAR: 'ბარი',
    RETAIL: 'საცალო',
    WHOLESALE: 'საბითუმო',
    DISTRIBUTOR: 'დისტრიბუტორი',
    EXPORT: 'ექსპორტი',
  }
  return names[type] || type
}

