import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@saas-platform/database'
import { withTenant, RouteContext } from '@/lib/api-middleware'

// GET /api/finances/expenses
export const GET = withTenant(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')
    const supplierId = searchParams.get('supplierId')
    const isPaid = searchParams.get('isPaid')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = parseInt(searchParams.get('limit') || '100')

    const where: any = { tenantId: ctx.tenantId }
    
    if (category) where.category = category.toUpperCase()
    if (supplierId) where.supplierId = supplierId
    if (isPaid !== null && isPaid !== undefined) {
      where.isPaid = isPaid === 'true'
    }
    if (startDate || endDate) {
      where.date = {}
      if (startDate) where.date.gte = new Date(startDate)
      if (endDate) where.date.lte = new Date(endDate)
    }

    const expenses = await (prisma as any).expense.findMany({
      where,
      include: {
        supplier: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
      take: limit,
    })

    const stats = {
      total: expenses.length,
      totalAmount: expenses.reduce((sum: number, e: any) => sum + Number(e.amount), 0),
      paidAmount: expenses.filter((e: any) => e.isPaid).reduce((sum: number, e: any) => sum + Number(e.amount), 0),
      pendingAmount: expenses.filter((e: any) => !e.isPaid).reduce((sum: number, e: any) => sum + Number(e.amount), 0),
    }

    return NextResponse.json({
      expenses: expenses.map((e: any) => ({
        id: e.id,
        category: e.category.toLowerCase(),
        categoryName: getExpenseCategoryName(e.category),
        supplierId: e.supplierId,
        supplierName: e.supplier?.name,
        amount: Number(e.amount),
        date: e.date.toISOString(),
        description: e.description,
        invoiceNumber: e.invoiceNumber,
        isPaid: e.isPaid,
        paidAt: e.paidAt?.toISOString(),
        paymentMethod: e.paymentMethod?.toLowerCase(),
        notes: e.notes,
        createdAt: e.createdAt.toISOString(),
      })),
      stats,
    })
  } catch (error) {
    console.error('[EXPENSES API] GET Error:', error)
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 })
  }
})

// POST /api/finances/expenses
export const POST = withTenant(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const data = await req.json()
    const {
      category,
      supplierId,
      amount,
      date,
      description,
      invoiceNumber,
      isPaid = false,
      paymentMethod,
      notes,
    } = data

    if (!category || !amount) {
      return NextResponse.json(
        { error: 'კატეგორია და თანხა სავალდებულოა' },
        { status: 400 }
      )
    }

    const expense = await (prisma as any).expense.create({
      data: {
        tenantId: ctx.tenantId,
        category: category.toUpperCase(),
        supplierId,
        amount,
        date: date ? new Date(date) : new Date(),
        description,
        invoiceNumber,
        isPaid,
        paidAt: isPaid ? new Date() : null,
        paymentMethod: paymentMethod?.toUpperCase(),
        notes,
        createdBy: ctx.userId,
      },
    })

    // Create transaction record
    await (prisma as any).transaction.create({
      data: {
        tenantId: ctx.tenantId,
        type: 'EXPENSE',
        date: date ? new Date(date) : new Date(),
        amount,
        expenseCategory: category.toUpperCase(),
        description,
        supplierId,
        expenseId: expense.id,
        paymentMethod: isPaid ? paymentMethod?.toUpperCase() : null,
        createdBy: ctx.userId,
      },
    })

    return NextResponse.json({
      success: true,
      expense: { id: expense.id },
    })
  } catch (error) {
    console.error('[EXPENSES API] POST Error:', error)
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 })
  }
})

function getExpenseCategoryName(category: string): string {
  const names: Record<string, string> = {
    INGREDIENTS: 'ინგრედიენტები',
    PACKAGING: 'შეფუთვა',
    EQUIPMENT: 'აღჭურვილობა',
    UTILITIES: 'კომუნალური',
    SALARY: 'ხელფასი',
    RENT: 'იჯარა',
    MARKETING: 'მარკეტინგი',
    MAINTENANCE: 'მოვლა-შენახვა',
    TRANSPORT: 'ტრანსპორტი',
    OTHER: 'სხვა',
  }
  return names[category] || category
}

