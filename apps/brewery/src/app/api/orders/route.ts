import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@saas-platform/database'
import { withTenant, RouteContext } from '@/lib/api-middleware'

// GET /api/orders
export const GET = withTenant(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const paymentStatus = searchParams.get('paymentStatus')
    const customerId = searchParams.get('customerId')
    const limit = parseInt(searchParams.get('limit') || '100')

    const where: any = { tenantId: ctx.tenantId }
    if (status && status !== 'all') {
      where.status = status.toUpperCase()
    }
    if (paymentStatus && paymentStatus !== 'all') {
      where.paymentStatus = paymentStatus.toUpperCase()
    }
    if (customerId) {
      where.customerId = customerId
    }

    const orders = await prisma.salesOrder.findMany({
      where,
      include: {
        customer: {
          select: { name: true, phone: true },
        },
        items: true,
      },
      orderBy: { orderedAt: 'desc' },
      take: limit,
    })

    const transformed = orders.map(o => ({
      id: o.id,
      orderNumber: o.orderNumber,
      customerId: o.customerId,
      customerName: o.customer.name,
      customerPhone: o.customer.phone,
      status: o.status.toLowerCase(),
      statusName: getOrderStatusName(o.status),
      paymentStatus: o.paymentStatus.toLowerCase(),
      paymentStatusName: getPaymentStatusName(o.paymentStatus),
      totalAmount: Number(o.totalAmount),
      paidAmount: Number((o as any).paidAmount || 0),
      orderedAt: o.orderedAt.toISOString(),
      shippedAt: o.shippedAt?.toISOString() || null,
      deliveredAt: o.deliveredAt?.toISOString() || null,
      items: o.items.map(item => ({
        id: item.id,
        productName: item.productName,
        packageType: item.packageType,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
      })),
      itemCount: o.items.length,
      notes: o.notes || null,
    }))

    const stats = {
      total: orders.length,
      totalRevenue: orders
        .filter(o => o.status !== 'CANCELLED')
        .reduce((s, o) => s + Number(o.totalAmount), 0),
      pending: orders.filter(o => o.status === 'PENDING').length,
      paid: orders.filter(o => o.paymentStatus === 'PAID').length,
    }

    return NextResponse.json({ orders: transformed, stats })
  } catch (error) {
    console.error('[ORDERS API] GET Error:', error)
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
})

// POST /api/orders
export const POST = withTenant(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const { customerId, items, notes } = await req.json()
    if (!customerId || !items?.length) {
      return NextResponse.json(
        { error: 'კლიენტი და პროდუქტები სავალდებულოა' },
        { status: 400 }
      )
    }

    const orderCount = await prisma.salesOrder.count({
      where: { tenantId: ctx.tenantId },
    })
    const orderNumber = `ORD-${new Date().getFullYear()}-${String(orderCount + 1).padStart(4, '0')}`
    const totalAmount = items.reduce(
      (sum: number, item: any) => sum + item.unitPrice * item.quantity,
      0
    )

    const order = await prisma.salesOrder.create({
      data: {
        tenantId: ctx.tenantId,
        orderNumber,
        customerId,
        status: 'PENDING',
        paymentStatus: 'PENDING',
        totalAmount,
        notes,
        createdBy: ctx.userId,
        items: {
          create: items.map((item: any) => ({
            productName: item.productName,
            packageType: item.packageType,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.unitPrice * item.quantity,
            batchId: item.batchId || null,
          })),
        },
      },
      include: {
        items: true,
      },
    })

    // Auto-generate invoice for the order
    try {
      // Generate invoice number
      const invoiceCount = await (prisma as any).invoice.count({
        where: { tenantId: ctx.tenantId, type: 'OUTGOING' },
      })
      const invoiceNumber = `INV-S-${String(invoiceCount + 1).padStart(4, '0')}`

      // Calculate totals from order items
      const subtotal = order.items.reduce((sum: number, item: any) => 
        sum + (Number(item.quantity) * Number(item.unitPrice)), 0
      )

      // Create invoice linked to order
      await (prisma as any).invoice.create({
        data: {
          tenantId: ctx.tenantId,
          invoiceNumber,
          type: 'OUTGOING',
          status: 'DRAFT',
          issueDate: new Date(),
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
          customerId: order.customerId,
          orderId: order.id,
          subtotal,
          discount: 0,
          tax: 0,
          total: subtotal,
          paidAmount: 0,
          createdBy: ctx.userId,
          items: {
            create: order.items.map((item: any, index: number) => ({
              description: item.productName || 'პროდუქტი',
              quantity: Number(item.quantity),
              unit: item.packageType || 'ცალი',
              unitPrice: Number(item.unitPrice),
              total: Number(item.quantity) * Number(item.unitPrice),
              productName: item.productName,
              packageType: item.packageType,
              batchId: item.batchId || null,
              sortOrder: index,
            })),
          },
        },
      })

      console.log(`[ORDERS API] Auto-created invoice ${invoiceNumber} for order ${order.orderNumber}`)
    } catch (invoiceError) {
      // Don't fail order creation if invoice fails
      console.error('[ORDERS API] Failed to auto-create invoice:', invoiceError)
    }

    return NextResponse.json({
      success: true,
      order: { id: order.id, orderNumber },
    })
  } catch (error) {
    console.error('[ORDERS API] POST Error:', error)
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }
})

// PATCH /api/orders
export const PATCH = withTenant(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const { id, status, paymentStatus } = await req.json()
    if (!id) {
      return NextResponse.json({ error: 'id სავალდებულოა' }, { status: 400 })
    }

    const data: any = {}
    if (status) {
      data.status = status.toUpperCase()
      if (status === 'SHIPPED') {
        data.shippedAt = new Date()
      }
      if (status === 'DELIVERED') {
        data.deliveredAt = new Date()
      }
    }
    if (paymentStatus) {
      data.paymentStatus = paymentStatus.toUpperCase()
    }

    const order = await prisma.salesOrder.update({
      where: { id },
      data,
    })
    return NextResponse.json({ success: true, order })
  } catch (error) {
    console.error('[ORDERS API] PATCH Error:', error)
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
  }
})

function getOrderStatusName(s: string): string {
  const names: Record<string, string> = {
    PENDING: 'მოლოდინში',
    CONFIRMED: 'დადასტურებული',
    PROCESSING: 'მუშავდება',
    READY: 'მზადაა',
    SHIPPED: 'გაგზავნილი',
    DELIVERED: 'მიტანილი',
    CANCELLED: 'გაუქმებული',
  }
  return names[s] || s
}

function getPaymentStatusName(s: string): string {
  const names: Record<string, string> = {
    PENDING: 'გადაუხდელი',
    PARTIAL: 'ნაწილობრივ',
    PAID: 'გადახდილი',
    OVERDUE: 'ვადაგასული',
    REFUNDED: 'დაბრუნებული',
  }
  return names[s] || s
}
