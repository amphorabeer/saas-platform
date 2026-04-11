import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@saas-platform/database'
import { withTenant, RouteContext } from '@/lib/api-middleware'

// Helper to extract ID from URL
function extractIdFromUrl(url: string): string | null {
  const urlObj = new URL(url)
  const pathParts = urlObj.pathname.split('/')
  const idIndex = pathParts.indexOf('orders') + 1
  return pathParts[idIndex] || null
}

// GET /api/orders/[id]
export const GET = withTenant(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const id = extractIdFromUrl(req.url)
    
    if (!id) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })
    }

    const order = await prisma.salesOrder.findFirst({
      where: { 
        OR: [
          { id, tenantId: ctx.tenantId },
          { orderNumber: id, tenantId: ctx.tenantId },
        ],
      },
      include: {
        items: true,
        customer: {
          select: { 
            id: true, 
            name: true, 
            phone: true,
            email: true,
            address: true,
            city: true,
            taxId: true,
          },
        },
        invoice: {
          include: {
            items: true,
            payments: { orderBy: { date: 'desc' } },
          },
        },
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'შეკვეთა ვერ მოიძებნა' }, { status: 404 })
    }

    return NextResponse.json({
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        customerId: order.customerId,
        customerName: order.customer.name,
        customerPhone: order.customer.phone,
        customerEmail: order.customer.email,
        customerAddress: order.customer.address,
        customerCity: order.customer.city,
        customerTaxId: order.customer.taxId,
        status: order.status.toLowerCase(),
        statusName: getOrderStatusName(order.status),
        paymentStatus: order.paymentStatus.toLowerCase(),
        paymentStatusName: getPaymentStatusName(order.paymentStatus),
        totalAmount: Number(order.totalAmount),
        paidAmount: Number((order as any).paidAmount || 0),
        orderedAt: order.orderedAt.toISOString(),
        shippedAt: order.shippedAt?.toISOString() || null,
        deliveredAt: order.deliveredAt?.toISOString() || null,
        items: order.items.map(item => ({
          id: item.id,
          productName: item.productName,
          packageType: item.packageType,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          totalPrice: Number(item.totalPrice),
          batchId: item.batchId || null,
        })),
        notes: order.notes || null,
        customer: {
          name: order.customer.name,
          address: order.customer.address || undefined,
          phone: order.customer.phone || undefined,
          email: order.customer.email || undefined,
          city: order.customer.city || undefined,
          taxId: order.customer.taxId || undefined,
        },
        invoice: order.invoice
          ? {
              id: order.invoice.id,
              invoiceNumber: order.invoice.invoiceNumber,
              type: order.invoice.type.toLowerCase(),
              status: order.invoice.status.toLowerCase(),
              statusName: getInvoiceStatusName(order.invoice.status),
              issueDate: order.invoice.issueDate.toISOString(),
              dueDate: order.invoice.dueDate?.toISOString() ?? null,
              customerId: order.invoice.customerId,
              customerName: order.customer.name,
              customerPhone: order.customer.phone,
              customerEmail: order.customer.email,
              customerAddress: order.customer.address
                ? `${order.customer.address}${order.customer.city ? `, ${order.customer.city}` : ''}`
                : null,
              customerTaxId: order.customer.taxId,
              supplierId: order.invoice.supplierId,
              supplierName: null,
              subtotal: Number(order.invoice.subtotal),
              discount: Number(order.invoice.discount),
              tax: Number(order.invoice.tax),
              total: Number(order.invoice.total),
              paidAmount: Number(order.invoice.paidAmount),
              remaining: Number(order.invoice.total) - Number(order.invoice.paidAmount),
              items: order.invoice.items.map((item) => ({
                id: item.id,
                description: item.description,
                quantity: Number(item.quantity),
                unit: item.unit ?? 'ცალი',
                unitPrice: Number(item.unitPrice),
                total: Number(item.total),
                productName: item.productName ?? undefined,
                packageType: item.packageType ?? undefined,
              })),
              payments: order.invoice.payments.map((p) => ({
                id: p.id,
                amount: Number(p.amount),
                method: p.method.toLowerCase(),
                date: p.date.toISOString(),
                reference: p.reference,
              })),
              notes: order.invoice.notes,
            }
          : null,
      },
    })
  } catch (error) {
    console.error('[ORDERS API] GET Error:', error)
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 })
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

function getInvoiceStatusName(status: string): string {
  const names: Record<string, string> = {
    DRAFT: 'დრაფტი',
    SENT: 'გაგზავნილი',
    PAID: 'გადახდილი',
    PARTIAL: 'ნაწილობრივ',
    OVERDUE: 'ვადაგასული',
    CANCELLED: 'გაუქმებული',
  }
  return names[status] || status
}

