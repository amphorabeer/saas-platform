import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@saas-platform/database'
import { withTenant, RouteContext } from '@/lib/api-middleware'

// GET /api/finances/budgets
export const GET = withTenant(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const { searchParams } = new URL(req.url)
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString())
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : null

    const where: any = { tenantId: ctx.tenantId, year }
    if (month !== null) where.month = month

    const budgets = await (prisma as any).budget.findMany({
      where,
      orderBy: [{ category: 'asc' }, { month: 'asc' }],
    })

    // Get actual expenses for comparison
    const startDate = month 
      ? new Date(year, month - 1, 1)
      : new Date(year, 0, 1)
    const endDate = month
      ? new Date(year, month, 0)
      : new Date(year, 11, 31)

    const actualExpenses = await (prisma as any).expense.groupBy({
      by: ['category'],
      where: {
        tenantId: ctx.tenantId,
        date: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
    })

    const actualMap = actualExpenses.reduce((acc: Record<string, number>, e: any) => {
      acc[e.category] = Number(e._sum.amount || 0)
      return acc
    }, {} as Record<string, number>)

    return NextResponse.json({
      budgets: budgets.map((b: any) => ({
        id: b.id,
        category: b.category.toLowerCase(),
        year: b.year,
        month: b.month,
        amount: Number(b.amount),
        actual: actualMap[b.category] || 0,
        variance: (actualMap[b.category] || 0) - Number(b.amount),
        variancePercent: Number(b.amount) > 0 
          ? Math.round(((actualMap[b.category] || 0) - Number(b.amount)) / Number(b.amount) * 100)
          : 0,
      })),
    })
  } catch (error) {
    console.error('[BUDGETS API] GET Error:', error)
    return NextResponse.json({ error: 'Failed to fetch budgets' }, { status: 500 })
  }
})

// POST /api/finances/budgets
export const POST = withTenant(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const data = await req.json()
    const { category, year, month, amount } = data

    if (!category || !year || !amount) {
      return NextResponse.json(
        { error: 'კატეგორია, წელი და თანხა სავალდებულოა' },
        { status: 400 }
      )
    }

    // Check if budget exists
    const existing = await (prisma as any).budget.findFirst({
      where: {
        tenantId: ctx.tenantId,
        category: category.toUpperCase(),
        year,
        month: month || null,
      },
    })

    let budget
    if (existing) {
      // Update existing
      budget = await (prisma as any).budget.update({
        where: { id: existing.id },
        data: { amount },
      })
    } else {
      // Create new
      budget = await (prisma as any).budget.create({
        data: {
          tenantId: ctx.tenantId,
          category: category.toUpperCase(),
          year,
          month: month || null,
          amount,
        },
      })
    }

    return NextResponse.json({
      success: true,
      budget: { id: budget.id },
    })
  } catch (error) {
    console.error('[BUDGETS API] POST Error:', error)
    return NextResponse.json({ error: 'Failed to save budget' }, { status: 500 })
  }
})


