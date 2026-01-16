import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@saas-platform/database'
import { withTenant, RouteContext } from '@/lib/api-middleware'

// GET /api/finances/invoices
export const GET = withTenant(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') // outgoing, incoming
    const status = searchParams.get('status')
    const customerId = searchParams.get('customerId')
    const supplierId = searchParams.get('supplierId')
    const limit = parseInt(searchParams.get('limit') || '100')

    const where: any = { tenantId: ctx.tenantId }
    
    if (type) where.type = type.toUpperCase()
    if (status) where.status = status.toUpperCase()
    if (customerId) where.customerId = customerId
    if (supplierId) where.supplierId = supplierId

    const invoices = await (prisma as any).invoice.findMany({
      where,
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
          } 
        },
        supplier: { select: { id: true, name: true, phone: true } },
        order: { select: { id: true, orderNumber: true } },
        items: true,
        payments: {
          orderBy: { date: 'desc' },
        },
      },
      orderBy: { issueDate: 'desc' },
      take: limit,
    })

    const stats = {
      total: invoices.length,
      totalAmount: invoices.reduce((sum: number, inv: any) => sum + Number(inv.total), 0),
      paidAmount: invoices.reduce((sum: number, inv: any) => sum + Number(inv.paidAmount), 0),
      pending: invoices.filter((inv: any) => ['SENT', 'PARTIAL'].includes(inv.status)).length,
      overdue: invoices.filter((inv: any) => inv.status === 'OVERDUE').length,
    }

    return NextResponse.json({
      invoices: invoices.map((inv: any) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        type: inv.type.toLowerCase(),
        status: inv.status.toLowerCase(),
        statusName: getInvoiceStatusName(inv.status),
        issueDate: inv.issueDate.toISOString(),
        dueDate: inv.dueDate?.toISOString(),
        paidAt: inv.paidAt?.toISOString(),
        customerId: inv.customerId,
        customerName: inv.customer?.name,
        customerPhone: inv.customer?.phone,
        customerEmail: inv.customer?.email,
        customerAddress: inv.customer?.address ? 
          `${inv.customer.address}${inv.customer.city ? `, ${inv.customer.city}` : ''}` : null,
        customerTaxId: inv.customer?.taxId,
        supplierId: inv.supplierId,
        supplierName: inv.supplier?.name,
        orderId: inv.orderId,
        orderNumber: inv.order?.orderNumber,
        subtotal: Number(inv.subtotal),
        discount: Number(inv.discount),
        tax: Number(inv.tax),
        total: Number(inv.total),
        paidAmount: Number(inv.paidAmount),
        remaining: Number(inv.total) - Number(inv.paidAmount),
        items: inv.items.map((item: any) => ({
          id: item.id,
          description: item.description,
          quantity: Number(item.quantity),
          unit: item.unit,
          unitPrice: Number(item.unitPrice),
          total: Number(item.total),
        })),
        payments: inv.payments.map((p: any) => ({
          id: p.id,
          amount: Number(p.amount),
          method: p.method.toLowerCase(),
          date: p.date.toISOString(),
          reference: p.reference,
        })),
        notes: inv.notes,
      })),
      stats,
    })
  } catch (error) {
    console.error('[INVOICES API] GET Error:', error)
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 })
  }
})

// POST /api/finances/invoices
export const POST = withTenant(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const data = await req.json()
    const {
      type,
      customerId,
      supplierId,
      orderId,
      issueDate,
      dueDate,
      items,
      discount = 0,
      tax = 0,
      notes,
      terms,
    } = data

    if (!type || !items?.length) {
      return NextResponse.json(
        { error: 'ტიპი და პროდუქტები სავალდებულოა' },
        { status: 400 }
      )
    }

    // Generate invoice number
    const prefix = type.toUpperCase() === 'OUTGOING' ? 'INV-S' : 'INV-P'
    const count = await (prisma as any).invoice.count({
      where: { tenantId: ctx.tenantId, type: type.toUpperCase() },
    })
    const invoiceNumber = `${prefix}-${String(count + 1).padStart(4, '0')}`

    // Calculate totals
    const subtotal = items.reduce((sum: number, item: any) => 
      sum + (item.quantity * item.unitPrice), 0)
    const total = subtotal - discount + tax

    const invoice = await (prisma as any).invoice.create({
      data: {
        tenantId: ctx.tenantId,
        invoiceNumber,
        type: type.toUpperCase(),
        status: 'DRAFT',
        issueDate: issueDate ? new Date(issueDate) : new Date(),
        dueDate: dueDate ? new Date(dueDate) : null,
        customerId: type.toUpperCase() === 'OUTGOING' ? customerId : null,
        supplierId: type.toUpperCase() === 'INCOMING' ? supplierId : null,
        orderId,
        subtotal,
        discount,
        tax,
        total,
        paidAmount: 0,
        notes,
        terms,
        createdBy: ctx.userId,
        items: {
          create: items.map((item: any, index: number) => ({
            description: item.description,
            quantity: item.quantity,
            unit: item.unit || 'ცალი',
            unitPrice: item.unitPrice,
            total: item.quantity * item.unitPrice,
            productName: item.productName,
            packageType: item.packageType,
            batchId: item.batchId,
            sortOrder: index,
          })),
        },
      },
    })

    return NextResponse.json({
      success: true,
      invoice: { id: invoice.id, invoiceNumber },
    })
  } catch (error) {
    console.error('[INVOICES API] POST Error:', error)
    return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 })
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

