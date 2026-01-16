import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@saas-platform/database'
import { withTenant, RouteContext } from '@/lib/api-middleware'

// POST /api/inventory/purchase - Create purchase (updates inventory + creates expense)
export const POST = withTenant(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const data = await req.json()
    const {
      itemId,           // Existing inventory item ID
      quantity,         // რაოდენობა
      unitPrice,        // ერთეულის ფასი
      totalAmount,      // ჯამი (quantity * unitPrice)
      supplierId,       // მომწოდებელი
      date,             // თარიღი
      invoiceNumber,    // ინვოისის ნომერი
      notes,            // შენიშვნა
      createExpense,    // ხარჯის შექმნა (default: true)
      isPaid,           // გადახდილია?
      paymentMethod,    // გადახდის მეთოდი
    } = data

    if (!itemId || !quantity || quantity <= 0) {
      return NextResponse.json(
        { error: 'პროდუქტი და რაოდენობა სავალდებულოა' },
        { status: 400 }
      )
    }

    // Calculate total if not provided
    const calculatedTotal = totalAmount || (quantity * (unitPrice || 0))

    // Use transaction for atomic operations
    const result = await prisma.$transaction(async (tx) => {
      // 1. Get inventory item
      const item = await tx.inventoryItem.findFirst({
        where: { id: itemId, tenantId: ctx.tenantId },
      })

      if (!item) {
        throw new Error('პროდუქტი ვერ მოიძებნა')
      }

      // 2. Create inventory ledger entry (PURCHASE)
      const ledgerEntry = await tx.inventoryLedger.create({
        data: {
          tenantId: ctx.tenantId,
          itemId: itemId,
          quantity: quantity,
          type: 'PURCHASE',
          notes: notes || `შესყიდვა: ${quantity} ${item.unit}`,
          createdBy: ctx.userId || 'system',
        },
      })

      // 3. Update inventory item balance and cost
      const newBalance = Number(item.cachedBalance) + quantity
      const newCostPerUnit = unitPrice || item.costPerUnit

      await tx.inventoryItem.update({
        where: { id: itemId },
        data: {
          cachedBalance: newBalance,
          costPerUnit: newCostPerUnit,
          balanceUpdatedAt: new Date(),
        },
      })

      // 4. Create expense record (if enabled and has cost)
      let expense = null
      if (createExpense !== false && calculatedTotal > 0) {
        // Determine expense category based on inventory category
        let expenseCategory = 'OTHER'
        if (item.category === 'RAW_MATERIAL') {
          expenseCategory = 'INGREDIENTS'
        } else if (item.category === 'PACKAGING') {
          expenseCategory = 'PACKAGING'
        } else if (item.category === 'CONSUMABLE') {
          expenseCategory = 'MAINTENANCE'
        }

        expense = await (tx as any).expense.create({
          data: {
            tenantId: ctx.tenantId,
            category: expenseCategory,
            supplierId: supplierId || null,
            amount: calculatedTotal,
            date: date ? new Date(date) : new Date(),
            description: `შესყიდვა: ${item.name} - ${quantity} ${item.unit}`,
            invoiceNumber: invoiceNumber || null,
            isPaid: isPaid || false,
            paidAt: isPaid ? new Date() : null,
            paymentMethod: isPaid ? (paymentMethod?.toUpperCase() || 'BANK_TRANSFER') : null,
            notes: notes || null,
            createdBy: ctx.userId || 'system',
          },
        })

        // 5. Create transaction record
        await (tx as any).transaction.create({
          data: {
            tenantId: ctx.tenantId,
            type: 'EXPENSE',
            date: date ? new Date(date) : new Date(),
            amount: calculatedTotal,
            expenseCategory: expenseCategory,
            description: `შესყიდვა: ${item.name}`,
            supplierId: supplierId || null,
            expenseId: expense.id,
            paymentMethod: isPaid ? (paymentMethod?.toUpperCase() || null) : null,
            createdBy: ctx.userId || 'system',
          },
        })
      }

      return {
        ledgerEntry,
        expense,
        newBalance,
        item: {
          id: item.id,
          name: item.name,
          unit: item.unit,
        },
      }
    })

    return NextResponse.json({
      success: true,
      message: 'შესყიდვა წარმატებით დაფიქსირდა',
      purchase: {
        itemId: result.item.id,
        itemName: result.item.name,
        quantity: quantity,
        unit: result.item.unit,
        totalAmount: calculatedTotal,
        newBalance: result.newBalance,
        expenseId: result.expense?.id,
        ledgerEntryId: result.ledgerEntry.id,
      },
    })
  } catch (error: any) {
    console.error('[PURCHASE API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'შესყიდვის დაფიქსირება ვერ მოხერხდა' },
      { status: 500 }
    )
  }
})

// GET /api/inventory/purchase - Get purchase history
export const GET = withTenant(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const { searchParams } = new URL(req.url)
    const itemId = searchParams.get('itemId')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: any = {
      tenantId: ctx.tenantId,
      type: 'PURCHASE',
    }
    if (itemId) where.itemId = itemId

    const purchases = await prisma.inventoryLedger.findMany({
      where,
      include: {
        item: {
          select: { id: true, name: true, unit: true, category: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return NextResponse.json({
      purchases: purchases.map(p => ({
        id: p.id,
        itemId: p.itemId,
        itemName: p.item.name,
        itemUnit: p.item.unit,
        itemCategory: p.item.category,
        quantity: Number(p.quantity),
        notes: p.notes,
        createdAt: p.createdAt.toISOString(),
        createdBy: p.createdBy,
      })),
    })
  } catch (error) {
    console.error('[PURCHASE API] GET Error:', error)
    return NextResponse.json({ error: 'Failed to fetch purchases' }, { status: 500 })
  }
})


