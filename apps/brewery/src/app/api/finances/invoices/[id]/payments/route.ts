import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@saas-platform/database'
import { withTenant, RouteContext } from '@/lib/api-middleware'

// Helper to extract invoice ID from URL
// URL format: /api/finances/invoices/[id]/payments
function extractInvoiceIdFromUrl(url: string): string | null {
  const urlObj = new URL(url)
  const pathParts = urlObj.pathname.split('/').filter(p => p)
  // Find 'invoices' index, next should be the ID, then 'payments'
  const invoicesIndex = pathParts.indexOf('invoices')
  if (invoicesIndex === -1 || invoicesIndex + 1 >= pathParts.length) return null
  const id = pathParts[invoicesIndex + 1]
  // Verify next part is 'payments' to ensure we have the right ID
  if (pathParts[invoicesIndex + 2] !== 'payments') return null
  return id || null
}

// POST /api/finances/invoices/[id]/payments - Register payment for invoice
export const POST = withTenant(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const invoiceId = extractInvoiceIdFromUrl(req.url)
    
    if (!invoiceId) {
      return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 })
    }

    const data = await req.json()
    const { amount, method, date, reference, notes } = data

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'თანხა სავალდებულოა' }, { status: 400 })
    }

    // Get invoice with relations
    const invoice = await (prisma as any).invoice.findFirst({
      where: { id: invoiceId, tenantId: ctx.tenantId },
      include: {
        customer: { select: { id: true } },
        supplier: { select: { id: true } },
      },
    })

    if (!invoice) {
      return NextResponse.json({ error: 'ინვოისი ვერ მოიძებნა' }, { status: 404 })
    }

    const remaining = Number(invoice.total) - Number(invoice.paidAmount)
    
    if (amount > remaining) {
      return NextResponse.json(
        { error: `მაქსიმალური თანხა: ${remaining.toFixed(2)} ₾` },
        { status: 400 }
      )
    }

    // Create payment and update invoice in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create payment
      const payment = await (tx as any).payment.create({
        data: {
          tenantId: ctx.tenantId,
          invoiceId,
          orderId: invoice.orderId,
          amount,
          method: (method?.toUpperCase() || 'BANK_TRANSFER') as any,
          date: date ? new Date(date) : new Date(),
          reference,
          notes,
          createdBy: ctx.userId,
        },
      })

      // Update invoice
      const newPaidAmount = Number(invoice.paidAmount) + amount
      const isPaid = newPaidAmount >= Number(invoice.total)
      
      await (tx as any).invoice.update({
        where: { id: invoiceId },
        data: {
          paidAmount: newPaidAmount,
          status: isPaid ? 'PAID' : 'PARTIAL',
          paidAt: isPaid ? new Date() : null,
        },
      })

      // Update order paidAmount if orderId exists
      if (invoice.orderId) {
        const order = await (tx as any).salesOrder.findUnique({
          where: { id: invoice.orderId },
        })
        if (order) {
          const newOrderPaidAmount = Number(order.paidAmount || 0) + amount
          await (tx as any).salesOrder.update({
            where: { id: invoice.orderId },
            data: {
              paidAmount: newOrderPaidAmount,
            },
          })
        }
      }

      // Create transaction record
      await (tx as any).transaction.create({
        data: {
          tenantId: ctx.tenantId,
          type: invoice.type === 'OUTGOING' ? 'INCOME' : 'EXPENSE',
          amount,
          date: date ? new Date(date) : new Date(),
          description: `ინვოისის გადახდა: ${invoice.invoiceNumber}`,
          incomeCategory: invoice.type === 'OUTGOING' ? 'SALE' : null,
          expenseCategory: invoice.type === 'INCOMING' ? 'OTHER' : null,
          customerId: invoice.customerId,
          supplierId: invoice.supplierId,
          orderId: invoice.orderId,
          invoiceId,
          paymentId: payment.id,
          paymentMethod: (method?.toUpperCase() || 'BANK_TRANSFER') as any,
          reference: reference || payment.id,
          notes: notes,
          createdBy: ctx.userId,
        },
      })

      return payment
    })

    return NextResponse.json({
      success: true,
      payment: {
        id: result.id,
        amount: Number(result.amount),
        method: result.method,
      },
    })
  } catch (error) {
    console.error('[INVOICE PAYMENTS API] POST Error:', error)
    return NextResponse.json({ error: 'Failed to register payment' }, { status: 500 })
  }
})

