import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@saas-platform/database'
import { withTenant, RouteContext } from '@/lib/api-middleware'

// GET /api/finances/transactions
export const GET = withTenant(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') // income, expense
    const category = searchParams.get('category')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = parseInt(searchParams.get('limit') || '100')

    const where: any = { tenantId: ctx.tenantId }
    
    if (type) {
      where.type = type.toUpperCase()
    }
    if (category) {
      if (type === 'income') {
        where.incomeCategory = category.toUpperCase()
      } else if (type === 'expense') {
        where.expenseCategory = category.toUpperCase()
      }
    }
    if (startDate || endDate) {
      where.date = {}
      if (startDate) where.date.gte = new Date(startDate)
      if (endDate) where.date.lte = new Date(endDate)
    }

    const transactions = await (prisma as any).transaction.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true } },
        order: { select: { id: true, orderNumber: true } },
        invoice: { select: { id: true, invoiceNumber: true } },
      },
      orderBy: { date: 'desc' },
      take: limit,
    })

    const stats = {
      total: transactions.length,
      totalIncome: transactions
        .filter((t: any) => t.type === 'INCOME')
        .reduce((sum: number, t: any) => sum + Number(t.amount), 0),
      totalExpense: transactions
        .filter((t: any) => t.type === 'EXPENSE')
        .reduce((sum: number, t: any) => sum + Number(t.amount), 0),
    }

    return NextResponse.json({
      transactions: transactions.map((t: any) => ({
        id: t.id,
        type: t.type.toLowerCase(),
        date: t.date.toISOString(),
        amount: Number(t.amount),
        category: t.incomeCategory || t.expenseCategory,
        description: t.description,
        customerId: t.customerId,
        customerName: t.customer?.name,
        supplierId: t.supplierId,
        supplierName: t.supplier?.name,
        orderId: t.orderId,
        orderNumber: t.order?.orderNumber,
        invoiceId: t.invoiceId,
        invoiceNumber: t.invoice?.invoiceNumber,
        paymentMethod: t.paymentMethod?.toLowerCase(),
        reference: t.reference,
        notes: t.notes,
        createdAt: t.createdAt.toISOString(),
      })),
      stats,
    })
  } catch (error) {
    console.error('[TRANSACTIONS API] GET Error:', error)
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
  }
})

// POST /api/finances/transactions
export const POST = withTenant(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const data = await req.json()
    const {
      type,
      date,
      amount,
      incomeCategory,
      expenseCategory,
      description,
      customerId,
      supplierId,
      orderId,
      invoiceId,
      paymentMethod,
      reference,
      notes,
    } = data

    if (!type || !amount) {
      return NextResponse.json(
        { error: 'ტიპი და თანხა სავალდებულოა' },
        { status: 400 }
      )
    }

    const transaction = await (prisma as any).transaction.create({
      data: {
        tenantId: ctx.tenantId,
        type: type.toUpperCase(),
        date: date ? new Date(date) : new Date(),
        amount,
        incomeCategory: incomeCategory?.toUpperCase(),
        expenseCategory: expenseCategory?.toUpperCase(),
        description,
        customerId,
        supplierId,
        orderId,
        invoiceId,
        paymentMethod: paymentMethod?.toUpperCase(),
        reference,
        notes,
        createdBy: ctx.userId,
      },
    })

    return NextResponse.json({
      success: true,
      transaction: { id: transaction.id },
    })
  } catch (error) {
    console.error('[TRANSACTIONS API] POST Error:', error)
    return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 })
  }
})

