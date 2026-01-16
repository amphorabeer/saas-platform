import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@saas-platform/database'
import { withTenant, RouteContext } from '@/lib/api-middleware'

// Helper to extract ID from URL
function extractIdFromUrl(url: string): string | null {
  const urlObj = new URL(url)
  const pathParts = urlObj.pathname.split('/')
  const idIndex = pathParts.indexOf('invoices') + 1
  return pathParts[idIndex] || null
}

// GET /api/finances/invoices/[id]
export const GET = withTenant(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const id = extractIdFromUrl(req.url)
    
    if (!id) {
      return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 })
    }

    const invoice = await (prisma as any).invoice.findFirst({
      where: { id, tenantId: ctx.tenantId },
      include: {
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
        supplier: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
        order: { include: { items: true } },
        items: { orderBy: { sortOrder: 'asc' } },
        payments: { orderBy: { date: 'desc' } },
      },
    })

    if (!invoice) {
      return NextResponse.json({ error: 'ინვოისი ვერ მოიძებნა' }, { status: 404 })
    }

    return NextResponse.json({
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        type: invoice.type.toLowerCase(),
        status: invoice.status.toLowerCase(),
        statusName: getInvoiceStatusName(invoice.status),
        issueDate: invoice.issueDate.toISOString(),
        dueDate: invoice.dueDate?.toISOString() || null,
        paidAt: invoice.paidAt?.toISOString() || null,
        customerId: invoice.customerId,
        customerName: invoice.customer?.name || null,
        customerPhone: invoice.customer?.phone || null,
        customerEmail: invoice.customer?.email || null,
        customerAddress: invoice.customer?.address ? 
          `${invoice.customer.address}${invoice.customer.city ? `, ${invoice.customer.city}` : ''}` : null,
        customerTaxId: invoice.customer?.taxId || null,
        supplierId: invoice.supplierId,
        supplierName: invoice.supplier?.name || null,
        orderId: invoice.orderId,
        subtotal: Number(invoice.subtotal),
        discount: Number(invoice.discount),
        tax: Number(invoice.tax),
        total: Number(invoice.total),
        paidAmount: Number(invoice.paidAmount),
        remaining: Number(invoice.total) - Number(invoice.paidAmount),
        items: invoice.items.map((item: any) => ({
          id: item.id,
          description: item.description,
          quantity: Number(item.quantity),
          unit: item.unit,
          unitPrice: Number(item.unitPrice),
          total: Number(item.total),
          productName: item.productName,
          packageType: item.packageType,
        })),
        payments: invoice.payments.map((p: any) => ({
          id: p.id,
          amount: Number(p.amount),
          method: p.method.toLowerCase(),
          date: p.date.toISOString(),
          reference: p.reference || null,
        })),
        notes: invoice.notes || null,
      },
    })
  } catch (error) {
    console.error('[INVOICE API] GET Error:', error)
    return NextResponse.json({ error: 'Failed to fetch invoice' }, { status: 500 })
  }
})

// PATCH /api/finances/invoices/[id]
export const PATCH = withTenant(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const id = extractIdFromUrl(req.url)
    
    if (!id) {
      return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 })
    }

    const data = await req.json()
    const { status, dueDate, notes, terms } = data

    const invoice = await (prisma as any).invoice.findFirst({
      where: { id, tenantId: ctx.tenantId },
    })

    if (!invoice) {
      return NextResponse.json({ error: 'ინვოისი ვერ მოიძებნა' }, { status: 404 })
    }

    const updateData: any = {}
    if (status) updateData.status = status.toUpperCase()
    if (dueDate) updateData.dueDate = new Date(dueDate)
    if (notes !== undefined) updateData.notes = notes
    if (terms !== undefined) updateData.terms = terms

    // Auto-update status based on payments
    if (status === 'PAID') {
      updateData.paidAt = new Date()
    }

    const updated = await (prisma as any).invoice.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ success: true, invoice: updated })
  } catch (error) {
    console.error('[INVOICE API] PATCH Error:', error)
    return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 })
  }
})

// DELETE /api/finances/invoices/[id]
export const DELETE = withTenant(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const id = extractIdFromUrl(req.url)
    
    if (!id) {
      return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 })
    }

    const invoice = await (prisma as any).invoice.findFirst({
      where: { id, tenantId: ctx.tenantId },
    })

    if (!invoice) {
      return NextResponse.json({ error: 'ინვოისი ვერ მოიძებნა' }, { status: 404 })
    }

    if (invoice.status === 'PAID') {
      return NextResponse.json(
        { error: 'გადახდილი ინვოისი ვერ წაიშლება' },
        { status: 400 }
      )
    }

    await (prisma as any).invoice.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[INVOICE API] DELETE Error:', error)
    return NextResponse.json({ error: 'Failed to delete invoice' }, { status: 500 })
  }
})

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

