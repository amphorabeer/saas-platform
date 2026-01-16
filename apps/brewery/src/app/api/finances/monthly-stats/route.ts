import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@saas-platform/database'
import { withTenant, RouteContext } from '@/lib/api-middleware'

// GET /api/finances/monthly-stats
export const GET = withTenant(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const { searchParams } = new URL(req.url)
    const months = parseInt(searchParams.get('months') || '12')
    
    const now = new Date()
    const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1)
    
    // Get monthly income from orders with items for income by source
    const orders = await (prisma as any).salesOrder.findMany({
      where: {
        tenantId: ctx.tenantId,
        status: { not: 'CANCELLED' },
        orderedAt: { gte: startDate },
      },
      select: {
        totalAmount: true,
        orderedAt: true,
        items: {
          select: {
            packageType: true,
            totalPrice: true,
          },
        },
      },
    })

    // Get monthly expenses
    const expenses = await (prisma as any).expense.findMany({
      where: {
        tenantId: ctx.tenantId,
        date: { gte: startDate },
      },
      select: {
        amount: true,
        date: true,
        category: true,
      },
    })

    // Get transaction count by month
    const transactions = await (prisma as any).transaction.findMany({
      where: {
        tenantId: ctx.tenantId,
        date: { gte: startDate },
      },
      select: {
        date: true,
      },
    })

    // Group by month
    const monthlyData: Record<string, {
      month: string
      year: number
      monthNum: number
      income: number
      expenses: number
      profit: number
      margin: number
      expensesByCategory: Record<string, number>
      incomeBySource: Record<string, number>
      transactionCount: number
    }> = {}

    // Initialize months (last N months including current)
    // Calculate the first month we need (N months ago from current month)
    const monthNames = ['იან', 'თებ', 'მარ', 'აპრ', 'მაი', 'ივნ', 'ივლ', 'აგვ', 'სექ', 'ოქტ', 'ნოე', 'დეკ']
    for (let i = 0; i < months; i++) {
      // i=0 is the oldest month, i=months-1 is the current month
      const monthsAgo = months - 1 - i
      const date = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      monthlyData[key] = {
        month: monthNames[date.getMonth()],
        year: date.getFullYear(),
        monthNum: date.getMonth() + 1,
        income: 0,
        expenses: 0,
        profit: 0,
        margin: 0,
        expensesByCategory: {},
        incomeBySource: {},
        transactionCount: 0,
      }
    }

    // Aggregate orders by month and by package type (income source)
    orders.forEach((order: any) => {
      const date = new Date(order.orderedAt)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      if (monthlyData[key]) {
        const orderTotal = Number(order.totalAmount)
        monthlyData[key].income += orderTotal
        
        // Aggregate by package type (income source)
        order.items.forEach((item: any) => {
          const packageType = item.packageType
          // Map package type to income source key
          let sourceKey = 'OTHER'
          if (packageType === 'KEG_50') sourceKey = 'KEG_50'
          else if (packageType === 'KEG_30') sourceKey = 'KEG_30'
          else if (packageType === 'KEG_20') sourceKey = 'KEG_20'
          else if (packageType === 'BOTTLE_750') sourceKey = 'BOTTLE_750'
          else if (packageType === 'BOTTLE_500') sourceKey = 'BOTTLE_500'
          else if (packageType === 'BOTTLE_330') sourceKey = 'BOTTLE_330'
          else if (packageType === 'CAN_500') sourceKey = 'CAN_500'
          else if (packageType === 'CAN_330') sourceKey = 'CAN_330'
          
          if (!monthlyData[key].incomeBySource[sourceKey]) {
            monthlyData[key].incomeBySource[sourceKey] = 0
          }
          monthlyData[key].incomeBySource[sourceKey] += Number(item.totalPrice)
        })
      }
    })

    // Aggregate expenses by month
    expenses.forEach((expense: any) => {
      const date = new Date(expense.date)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      if (monthlyData[key]) {
        monthlyData[key].expenses += Number(expense.amount)
        const category = expense.category
        if (!monthlyData[key].expensesByCategory[category]) {
          monthlyData[key].expensesByCategory[category] = 0
        }
        monthlyData[key].expensesByCategory[category] += Number(expense.amount)
      }
    })

    // Aggregate transactions by month
    transactions.forEach((transaction: any) => {
      const date = new Date(transaction.date)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      if (monthlyData[key]) {
        monthlyData[key].transactionCount += 1
      }
    })

    // Calculate profit and margin
    Object.values(monthlyData).forEach(data => {
      data.profit = data.income - data.expenses
      data.margin = data.income > 0 ? Math.round((data.profit / data.income) * 100 * 10) / 10 : 0
    })

    // Convert to array and sort by date
    const result = Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([_, data]) => data)

    return NextResponse.json({
      stats: result,
      monthlyStats: result, // Keep both for backward compatibility
      summary: {
        totalIncome: result.reduce((sum: number, m: any) => sum + m.income, 0),
        totalExpenses: result.reduce((sum: number, m: any) => sum + m.expenses, 0),
        totalProfit: result.reduce((sum: number, m: any) => sum + m.profit, 0),
        avgMonthlyIncome: result.length > 0 ? Math.round(result.reduce((sum: number, m: any) => sum + m.income, 0) / result.length) : 0,
        avgMonthlyExpenses: result.length > 0 ? Math.round(result.reduce((sum: number, m: any) => sum + m.expenses, 0) / result.length) : 0,
      },
    })
  } catch (error) {
    console.error('[MONTHLY STATS API] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch monthly stats' }, { status: 500 })
  }
})

