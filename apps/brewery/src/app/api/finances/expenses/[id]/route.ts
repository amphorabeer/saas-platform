import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@saas-platform/database'
import { withTenant, RouteContext } from '@/lib/api-middleware'

// Helper to extract ID from URL
function extractIdFromUrl(url: string): string | null {
  const urlObj = new URL(url)
  const pathParts = urlObj.pathname.split('/')
  const idIndex = pathParts.indexOf('expenses') + 1
  return pathParts[idIndex] || null
}

// GET /api/finances/expenses/[id]
export const GET = withTenant(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const id = extractIdFromUrl(req.url)
    
    if (!id) {
      return NextResponse.json({ error: 'Expense ID is required' }, { status: 400 })
    }

    const expense = await (prisma as any).expense.findFirst({
      where: { id, tenantId: ctx.tenantId },
      include: {
        supplier: true,
      },
    })

    if (!expense) {
      return NextResponse.json({ error: 'ხარჯი ვერ მოიძებნა' }, { status: 404 })
    }

    return NextResponse.json({ expense })
  } catch (error) {
    console.error('[EXPENSE API] GET Error:', error)
    return NextResponse.json({ error: 'Failed to fetch expense' }, { status: 500 })
  }
})

// PATCH /api/finances/expenses/[id]
export const PATCH = withTenant(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const id = extractIdFromUrl(req.url)
    
    if (!id) {
      return NextResponse.json({ error: 'Expense ID is required' }, { status: 400 })
    }

    const data = await req.json()

    const expense = await (prisma as any).expense.findFirst({
      where: { id, tenantId: ctx.tenantId },
    })

    if (!expense) {
      return NextResponse.json({ error: 'ხარჯი ვერ მოიძებნა' }, { status: 404 })
    }

    const updateData: any = {}
    if (data.category) updateData.category = data.category.toUpperCase()
    if (data.supplierId !== undefined) updateData.supplierId = data.supplierId
    if (data.amount) updateData.amount = data.amount
    if (data.date) updateData.date = new Date(data.date)
    if (data.description !== undefined) updateData.description = data.description
    if (data.invoiceNumber !== undefined) updateData.invoiceNumber = data.invoiceNumber
    if (data.isPaid !== undefined) {
      updateData.isPaid = data.isPaid
      updateData.paidAt = data.isPaid ? new Date() : null
    }
    if (data.paymentMethod) updateData.paymentMethod = data.paymentMethod.toUpperCase()
    if (data.notes !== undefined) updateData.notes = data.notes

    const updated = await (prisma as any).expense.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ success: true, expense: updated })
  } catch (error) {
    console.error('[EXPENSE API] PATCH Error:', error)
    return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 })
  }
})

// DELETE /api/finances/expenses/[id]
export const DELETE = withTenant(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const id = extractIdFromUrl(req.url)
    
    if (!id) {
      return NextResponse.json({ error: 'Expense ID is required' }, { status: 400 })
    }

    const expense = await (prisma as any).expense.findFirst({
      where: { id, tenantId: ctx.tenantId },
    })

    if (!expense) {
      return NextResponse.json({ error: 'ხარჯი ვერ მოიძებნა' }, { status: 404 })
    }

    // Delete related transactions
    await (prisma as any).transaction.deleteMany({
      where: { expenseId: id },
    })

    await (prisma as any).expense.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[EXPENSE API] DELETE Error:', error)
    return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 })
  }
})


