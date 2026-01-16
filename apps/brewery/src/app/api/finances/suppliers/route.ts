import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@saas-platform/database'
import { withTenant, RouteContext } from '@/lib/api-middleware'

// GET /api/finances/suppliers
export const GET = withTenant(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')
    const isActive = searchParams.get('isActive')

    const where: any = { tenantId: ctx.tenantId }
    if (category) where.category = category
    if (isActive !== null) where.isActive = isActive !== 'false'

    const suppliers = await (prisma as any).supplier.findMany({
      where,
      include: {
        _count: {
          select: { invoices: true, expenses: true },
        },
      },
      orderBy: { name: 'asc' },
    })

    // Calculate stats for each supplier
    const suppliersWithStats = await Promise.all(
      suppliers.map(async (supplier: any) => {
        // Get expenses for this supplier
        const expenses = await (prisma as any).expense.aggregate({
          where: { supplierId: supplier.id, tenantId: ctx.tenantId },
          _sum: { amount: true },
          _max: { date: true },
        })

        // Get invoices for this supplier
        const invoices = await (prisma as any).invoice.aggregate({
          where: { supplierId: supplier.id, tenantId: ctx.tenantId },
          _sum: { total: true },
          _max: { issueDate: true },
        })

        const totalPurchases = Number(expenses._sum.amount || 0) + Number(invoices._sum.total || 0)
        const lastPurchaseDate = expenses._max.date || invoices._max.issueDate || null

        // Extract contactPerson from notes if available (format: "საკონტაქტო პირი: Name\n...")
        let contactPerson = null
        if (supplier.notes && supplier.notes.includes('საკონტაქტო პირი:')) {
          const match = supplier.notes.match(/საკონტაქტო პირი:\s*([^\n]+)/)
          if (match) {
            contactPerson = match[1].trim()
          }
        }

        return {
          id: supplier.id,
          name: supplier.name,
          category: supplier.category || 'other',
          categoryName: getCategoryName(supplier.category),
          contactPerson,
          phone: supplier.phone,
          email: supplier.email,
          address: supplier.address,
          city: supplier.city,
          taxId: supplier.taxId,
          bankAccount: supplier.bankAccount,
          notes: supplier.notes,
          isActive: supplier.isActive,
          totalPurchases,
          lastPurchaseDate: lastPurchaseDate?.toISOString() || null,
          createdAt: supplier.createdAt.toISOString(),
        }
      })
    )

    // Calculate overall stats
    const stats = {
      total: suppliers.length,
      active: suppliers.filter((s: any) => s.isActive).length,
      totalSpent: suppliersWithStats.reduce((sum: number, s: any) => sum + s.totalPurchases, 0),
      categories: suppliers.reduce((acc: Record<string, number>, s: any) => {
        const cat = s.category || 'other'
        acc[cat] = (acc[cat] || 0) + 1
        return acc
      }, {} as Record<string, number>),
    }

    return NextResponse.json({
      suppliers: suppliersWithStats,
      stats,
    })
  } catch (error) {
    console.error('[SUPPLIERS API] GET Error:', error)
    return NextResponse.json({ error: 'Failed to fetch suppliers' }, { status: 500 })
  }
})

// POST /api/finances/suppliers
export const POST = withTenant(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const data = await req.json()
    const { name, category, email, phone, address, city, taxId, bankAccount, notes } = data

    if (!name) {
      return NextResponse.json({ error: 'სახელი სავალდებულოა' }, { status: 400 })
    }

    // Extract city from address if city is not provided separately
    let finalCity = city
    if (!finalCity && address) {
      // Try to extract city from address (format: "address, city")
      const parts = address.split(',').map((p: string) => p.trim())
      if (parts.length > 1) {
        finalCity = parts[parts.length - 1]
      }
    }

    const supplier = await (prisma as any).supplier.create({
      data: {
        tenantId: ctx.tenantId,
        name,
        category: category || 'other',
        email,
        phone,
        address,
        city: finalCity,
        taxId,
        bankAccount,
        notes,
        isActive: true,
      },
    })

    return NextResponse.json({
      success: true,
      supplier: { id: supplier.id, name: supplier.name },
    })
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'მომწოდებელი ამ სახელით უკვე არსებობს' }, { status: 400 })
    }
    console.error('[SUPPLIERS API] POST Error:', error)
    return NextResponse.json({ error: 'Failed to create supplier' }, { status: 500 })
  }
})

function getCategoryName(category: string | null): string {
  const names: Record<string, string> = {
    ingredients: 'ინგრედიენტები',
    packaging: 'შეფუთვა',
    equipment: 'აღჭურვილობა',
    services: 'მომსახურება',
    utilities: 'კომუნალური',
    other: 'სხვა',
  }
  return names[category || 'other'] || 'სხვა'
}

