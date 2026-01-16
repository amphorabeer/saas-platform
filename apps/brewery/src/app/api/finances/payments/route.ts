import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@saas-platform/database'
import { withTenant, RouteContext } from '@/lib/api-middleware'

// GET /api/finances/payments
export const GET = withTenant(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const { searchParams } = new URL(req.url)
    const invoiceId = searchParams.get('invoiceId')
    const orderId = searchParams.get('orderId')
    const limit = parseInt(searchParams.get('limit') || '100')

    const where: any = { tenantId: ctx.tenantId }
    if (invoiceId) where.invoiceId = invoiceId
    if (orderId) where.orderId = orderId

    const payments = await (prisma as any).payment.findMany({
      where,
      include: {
        invoice: { select: { id: true, invoiceNumber: true, type: true } },
        order: { select: { id: true, orderNumber: true } },
      },
      orderBy: { date: 'desc' },
      take: limit,
    })

    return NextResponse.json({
      payments: payments.map((p: any) => ({
        id: p.id,
        invoiceId: p.invoiceId,
        invoiceNumber: p.invoice?.invoiceNumber,
        invoiceType: p.invoice?.type?.toLowerCase(),
        orderId: p.orderId,
        orderNumber: p.order?.orderNumber,
        amount: Number(p.amount),
        method: p.method.toLowerCase(),
        methodName: getPaymentMethodName(p.method),
        date: p.date.toISOString(),
        reference: p.reference,
        notes: p.notes,
        createdAt: p.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error('[PAYMENTS API] GET Error:', error)
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 })
  }
})

// POST /api/finances/payments
export const POST = withTenant(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const data = await req.json()
    const { invoiceId, orderId, amount, method, date, reference, notes } = data

    if (!amount || (!invoiceId && !orderId)) {
      return NextResponse.json(
        { error: 'თანხა და ინვოისი/შეკვეთა სავალდებულოა' },
        { status: 400 }
      )
    }

    // Create payment
    const payment = await (prisma as any).payment.create({
      data: {
        tenantId: ctx.tenantId,
        invoiceId,
        orderId,
        amount,
        method: (method || 'BANK_TRANSFER').toUpperCase(),
        date: date ? new Date(date) : new Date(),
        reference,
        notes,
        createdBy: ctx.userId,
      },
    })

    // Update invoice paidAmount if linked
    if (invoiceId) {
      const invoice = await (prisma as any).invoice.findUnique({
        where: { id: invoiceId },
      })

      if (invoice) {
        const newPaidAmount = Number(invoice.paidAmount) + amount
        const newStatus = newPaidAmount >= Number(invoice.total) ? 'PAID' : 'PARTIAL'

        await (prisma as any).invoice.update({
          where: { id: invoiceId },
          data: {
            paidAmount: newPaidAmount,
            status: newStatus,
            paidAt: newStatus === 'PAID' ? new Date() : null,
          },
        })
      }
    }

    // Update order paidAmount if linked
    if (orderId) {
      const order = await (prisma as any).salesOrder.findUnique({
        where: { id: orderId },
      })

      if (order) {
        const newPaidAmount = Number(order.paidAmount) + amount
        const newStatus = newPaidAmount >= Number(order.totalAmount) ? 'PAID' : 'PARTIAL'

        await (prisma as any).salesOrder.update({
          where: { id: orderId },
          data: {
            paidAmount: newPaidAmount,
            paymentStatus: newStatus,
          },
        })
      }
    }

    // Create transaction record
    await (prisma as any).transaction.create({
      data: {
        tenantId: ctx.tenantId,
        type: 'INCOME',
        date: date ? new Date(date) : new Date(),
        amount,
        incomeCategory: 'SALE',
        description: `გადახდა ${invoiceId ? 'ინვოისი' : 'შეკვეთა'}`,
        invoiceId,
        orderId,
        paymentId: payment.id,
        paymentMethod: (method || 'BANK_TRANSFER').toUpperCase(),
        reference,
        createdBy: ctx.userId,
      },
    })

    return NextResponse.json({
      success: true,
      payment: { id: payment.id },
    })
  } catch (error) {
    console.error('[PAYMENTS API] POST Error:', error)
    return NextResponse.json({ error: 'Failed to create payment' }, { status: 500 })
  }
})

function getPaymentMethodName(method: string): string {
  const names: Record<string, string> = {
    CASH: 'ნაღდი',
    BANK_TRANSFER: 'გადარიცხვა',
    CARD: 'ბარათი',
    CHECK: 'ჩეკი',
  }
  return names[method] || method
}


