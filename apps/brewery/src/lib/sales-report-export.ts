import { prisma } from '@saas-platform/database'

export function salesPeriodStart(period: string): Date {
  const now = new Date()
  if (period === '30') return new Date(now.getTime() - 30 * 86400000)
  if (period === '90') return new Date(now.getTime() - 90 * 86400000)
  return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
}

export function salesPeriodLabelKa(period: string): string {
  if (period === '30') return 'ბოლო 30 დღე'
  if (period === '90') return 'ბოლო 3 თვე'
  return 'ბოლო 12 თვე'
}

export type SalesOrderRow = {
  orderNumber: string
  customerName: string
  city: string | null
  orderedAt: Date
  totalAmount: number
  status: string
  items: { productName: string; quantity: number; unitPrice: number; totalPrice: number }[]
}

export async function loadSalesOrdersForReport(
  tenantId: string,
  period: string
): Promise<SalesOrderRow[]> {
  const start = salesPeriodStart(period)
  const orders = await prisma.salesOrder.findMany({
    where: {
      tenantId,
      orderedAt: { gte: start },
      status: { not: 'CANCELLED' },
    },
    take: 500,
    orderBy: { orderedAt: 'desc' },
    include: {
      customer: { select: { name: true, city: true } },
      items: true,
    },
  })

  return orders.map((o) => ({
    orderNumber: o.orderNumber,
    customerName: o.customer.name,
    city: o.customer.city,
    orderedAt: o.orderedAt,
    totalAmount: Number(o.totalAmount),
    status: o.status,
    items: o.items.map((it) => ({
      productName: it.productName,
      quantity: it.quantity,
      unitPrice: Number(it.unitPrice),
      totalPrice: Number(it.totalPrice),
    })),
  }))
}
