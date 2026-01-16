import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@saas-platform/database'
import { withTenant, RouteContext } from '@/lib/api-middleware'

// GET /api/finances/dashboard
export const GET = withTenant(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const { searchParams } = new URL(req.url)
    const period = searchParams.get('period') || 'month' // month, quarter, year
    const month = searchParams.get('month') // 1-12
    const year = searchParams.get('year') // e.g., 2025
    
    // Calculate date range
    const now = new Date()
    let startDate: Date
    let endDate: Date | undefined
    
    // If month and year are provided, use them
    if (month && year) {
      const monthNum = parseInt(month)
      const yearNum = parseInt(year)
      startDate = new Date(yearNum, monthNum - 1, 1)
      endDate = new Date(yearNum, monthNum, 0, 23, 59, 59)
    } else {
      // Otherwise use period
      switch (period) {
        case 'quarter':
          startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
          break
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1)
          break
        default: // month
          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
      }
    }

    // Build date filter
    const dateFilter: any = { gte: startDate }
    if (endDate) {
      dateFilter.lte = endDate
    }

    // Get income from paid orders
    const ordersIncome = await (prisma as any).salesOrder.aggregate({
      where: {
        tenantId: ctx.tenantId,
        status: { not: 'CANCELLED' },
        orderedAt: dateFilter,
      },
      _sum: { totalAmount: true },
      _count: true,
    })

    // Get expenses
    const expenses = await (prisma as any).expense.aggregate({
      where: {
        tenantId: ctx.tenantId,
        date: dateFilter,
      },
      _sum: { amount: true },
      _count: true,
    })

    // Get expenses by category
    const expensesByCategory = await (prisma as any).expense.groupBy({
      by: ['category'],
      where: {
        tenantId: ctx.tenantId,
        date: dateFilter,
      },
      _sum: { amount: true },
    })

    // Get pending invoices (outgoing)
    const pendingOutgoingInvoices = await (prisma as any).invoice.aggregate({
      where: {
        tenantId: ctx.tenantId,
        type: 'OUTGOING',
        status: { in: ['SENT', 'PARTIAL', 'OVERDUE'] },
      },
      _sum: { total: true },
      _count: true,
    })

    // Get pending invoices (incoming)
    const pendingIncomingInvoices = await (prisma as any).invoice.aggregate({
      where: {
        tenantId: ctx.tenantId,
        type: 'INCOMING',
        status: { in: ['SENT', 'PARTIAL', 'OVERDUE'] },
      },
      _sum: { total: true },
      _count: true,
    })

    // Get overdue invoices (always current date-based, not filtered by selected month)
    const currentDate = new Date()
    const overdueInvoices = await (prisma as any).invoice.findMany({
      where: {
        tenantId: ctx.tenantId,
        status: 'OVERDUE',
        dueDate: { lt: currentDate },
      },
      select: {
        id: true,
        invoiceNumber: true,
        type: true,
        total: true,
        paidAmount: true,
        dueDate: true,
        customer: { select: { name: true } },
        supplier: { select: { name: true } },
      },
      orderBy: { dueDate: 'asc' },
      take: 10,
    })

    // Get recent transactions (limit to selected month if specified, otherwise last 10)
    const transactionsWhere: any = { tenantId: ctx.tenantId }
    if (endDate) {
      transactionsWhere.date = dateFilter
    }
    
    const recentTransactions = await (prisma as any).transaction.findMany({
      where: transactionsWhere,
      include: {
        customer: { select: { name: true } },
        supplier: { select: { name: true } },
      },
      orderBy: { date: 'desc' },
      take: endDate ? 100 : 10, // More transactions if filtering by month
    })

    const totalIncome = Number(ordersIncome._sum.totalAmount || 0)
    const paidIncome = Number(ordersIncome._sum.paidAmount || 0)
    const totalExpenses = Number(expenses._sum.amount || 0)
    const profit = totalIncome - totalExpenses

    const pendingReceivables = Number(pendingOutgoingInvoices._sum.total || 0)
    const pendingPayables = Number(pendingIncomingInvoices._sum.total || 0)

    return NextResponse.json({
      period,
      startDate: startDate.toISOString(),
      summary: {
        totalIncome,
        paidIncome,
        pendingIncome: totalIncome - paidIncome,
        totalExpenses,
        profit,
        profitMargin: totalIncome > 0 ? Math.round((profit / totalIncome) * 100) : 0,
        ordersCount: ordersIncome._count,
        expensesCount: expenses._count,
      },
      receivables: {
        pending: pendingReceivables,
        count: pendingOutgoingInvoices._count,
      },
      payables: {
        pending: pendingPayables,
        count: pendingIncomingInvoices._count,
      },
      expensesByCategory: expensesByCategory.map((e: any) => ({
        category: e.category,
        amount: Number(e._sum.amount || 0),
      })),
      overdueInvoices: overdueInvoices.map((inv: any) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        type: inv.type,
        total: Number(inv.total),
        paidAmount: Number(inv.paidAmount),
        remaining: Number(inv.total) - Number(inv.paidAmount),
        dueDate: inv.dueDate?.toISOString(),
        partyName: inv.customer?.name || inv.supplier?.name,
      })),
      recentTransactions: recentTransactions.map((t: any) => ({
        id: t.id,
        type: t.type,
        amount: Number(t.amount),
        date: t.date.toISOString(),
        description: t.description,
        category: t.incomeCategory || t.expenseCategory || 'OTHER',
        paymentMethod: t.paymentMethod,
        partyName: t.customer?.name || t.supplier?.name,
      })),
    })
  } catch (error) {
    console.error('[FINANCES DASHBOARD] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard' }, { status: 500 })
  }
})

