import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@saas-platform/database'
import { withTenant, RouteContext } from '@/lib/api-middleware'

// Helper to extract ID from URL
function extractIdFromUrl(url: string): string | null {
  const urlObj = new URL(url)
  const pathParts = urlObj.pathname.split('/')
  const idIndex = pathParts.indexOf('suppliers') + 1
  return pathParts[idIndex] || null
}

// GET /api/finances/suppliers/[id]
export const GET = withTenant(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const id = extractIdFromUrl(req.url)
    
    if (!id) {
      return NextResponse.json({ error: 'Supplier ID is required' }, { status: 400 })
    }

    const supplier = await (prisma as any).supplier.findFirst({
      where: { id, tenantId: ctx.tenantId },
      include: {
        invoices: {
          orderBy: { issueDate: 'desc' },
          take: 10,
        },
        expenses: {
          orderBy: { date: 'desc' },
          take: 10,
        },
      },
    })

    if (!supplier) {
      return NextResponse.json({ error: 'მომწოდებელი ვერ მოიძებნა' }, { status: 404 })
    }

    return NextResponse.json({ supplier })
  } catch (error) {
    console.error('[SUPPLIER API] GET Error:', error)
    return NextResponse.json({ error: 'Failed to fetch supplier' }, { status: 500 })
  }
})

// PATCH /api/finances/suppliers/[id]
export const PATCH = withTenant(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const id = extractIdFromUrl(req.url)
    
    if (!id) {
      return NextResponse.json({ error: 'Supplier ID is required' }, { status: 400 })
    }

    const data = await req.json()

    const supplier = await (prisma as any).supplier.findFirst({
      where: { id, tenantId: ctx.tenantId },
    })

    if (!supplier) {
      return NextResponse.json({ error: 'მომწოდებელი ვერ მოიძებნა' }, { status: 404 })
    }

    const updateData: any = {
      name: data.name,
      category: data.category,
      email: data.email,
      phone: data.phone,
      address: data.address,
      city: data.city,
      taxId: data.taxId,
      bankAccount: data.bankAccount,
      notes: data.notes,
    }
    
    // Only update isActive if it's provided
    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive
    }

    const updated = await (prisma as any).supplier.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ success: true, supplier: updated })
  } catch (error) {
    console.error('[SUPPLIER API] PATCH Error:', error)
    return NextResponse.json({ error: 'Failed to update supplier' }, { status: 500 })
  }
})

// DELETE /api/finances/suppliers/[id]
export const DELETE = withTenant(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const id = extractIdFromUrl(req.url)
    
    if (!id) {
      return NextResponse.json({ error: 'Supplier ID is required' }, { status: 400 })
    }

    const supplier = await (prisma as any).supplier.findFirst({
      where: { id, tenantId: ctx.tenantId },
      include: { _count: { select: { invoices: true, expenses: true } } },
    })

    if (!supplier) {
      return NextResponse.json({ error: 'მომწოდებელი ვერ მოიძებნა' }, { status: 404 })
    }

    if (supplier._count.invoices > 0 || supplier._count.expenses > 0) {
      // Soft delete
      await (prisma as any).supplier.update({
        where: { id },
        data: { isActive: false },
      })
      return NextResponse.json({ success: true, softDeleted: true })
    }

    await (prisma as any).supplier.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[SUPPLIER API] DELETE Error:', error)
    return NextResponse.json({ error: 'Failed to delete supplier' }, { status: 500 })
  }
})

