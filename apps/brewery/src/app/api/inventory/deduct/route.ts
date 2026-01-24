// /api/inventory/deduct/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withPermission, RouteContext } from '@/lib/api-middleware'

export const POST = withPermission('inventory:write')(async (
  request: NextRequest,
  ctx: RouteContext
) => {
  try {
    const tenantId = ctx.tenantId
    const body = await request.json()
    
    const { category, type, quantity, itemId, batchId, notes } = body
    
    console.log('[INVENTORY DEDUCT] Request:', { category, type, quantity, itemId, batchId })
    
    let item = null
    
    // If itemId is provided, use it directly
    if (itemId) {
      item = await prisma.inventoryItem.findFirst({
        where: { id: itemId, tenantId }
      })
    }
    
    // Otherwise find by category and type using simple name-based queries
    if (!item) {
      // Handle BOTTLE category
      if (category === 'BOTTLE') {
        // First try to find by bottle size in type (e.g., bottle_500 -> 500)
        const sizeMatch = type?.match(/(\d+)/)
        const size = sizeMatch ? sizeMatch[1] : '500'
        
        // Try exact name match first, then fallback to contains
        item = await prisma.inventoryItem.findFirst({
          where: {
            tenantId,
            category: 'PACKAGING',
            name: size // e.g., "500"
          }
        })
        
        if (!item) {
          item = await prisma.inventoryItem.findFirst({
            where: {
              tenantId,
              category: 'PACKAGING',
              OR: [
                { name: { contains: size } },
                { name: { contains: 'ბოთლი' } },
                { name: { contains: 'bottle' } },
              ]
            }
          })
        }
      }
      // Handle LABEL category
      else if (category === 'LABEL') {
        item = await prisma.inventoryItem.findFirst({
          where: {
            tenantId,
            category: 'PACKAGING',
            OR: [
              { name: { contains: 'ეტიკეტ' } },
              { name: { contains: 'label' } },
              { name: { contains: 'პილსი' } },
            ]
          }
        })
      }
      // Handle CAP or generic PACKAGING
      else if (category === 'PACKAGING' && type === 'cap') {
        item = await prisma.inventoryItem.findFirst({
          where: {
            tenantId,
            category: 'PACKAGING',
            OR: [
              { name: { contains: 'თავსახური' } },
              { name: { contains: 'თავას' } },
              { name: { contains: 'cap' } },
            ]
          }
        })
      }
      // Generic fallback
      else {
        item = await prisma.inventoryItem.findFirst({
          where: {
            tenantId,
            category: category || 'PACKAGING',
          }
        })
      }
    }
    
    if (!item) {
      console.log('[INVENTORY DEDUCT] Item not found for:', { category, type, itemId })
      return NextResponse.json({ 
        success: false, 
        error: 'Item not found',
        details: { category, type, itemId }
      }, { status: 404 })
    }
    
    const currentBalance = Number(item.cachedBalance) || 0
    const deductAmount = Math.abs(Number(quantity))
    const newBalance = currentBalance - deductAmount
    
    if (newBalance < 0) {
      console.log('[INVENTORY DEDUCT] Insufficient stock:', { currentBalance, deductAmount })
      return NextResponse.json({
        success: false,
        error: 'Insufficient stock',
        details: { currentBalance, requested: deductAmount }
      }, { status: 400 })
    }
    
    // Create ledger entry AND update cachedBalance in a transaction
    const [ledgerEntry, updatedItem] = await prisma.$transaction([
      prisma.inventoryLedger.create({
        data: {
          tenantId,
          itemId: item.id,
          quantity: -deductAmount, // Negative for deduction
          type: 'CONSUMPTION',
          notes: notes || `დაფასოება${batchId ? ` - Batch: ${batchId}` : ''}`,
          createdBy: 'სისტემა',
          batchId: batchId || null,
        }
      }),
      prisma.inventoryItem.update({
        where: { id: item.id },
        data: {
          cachedBalance: newBalance,
          balanceUpdatedAt: new Date(),
        }
      })
    ])
    
    console.log(`[INVENTORY DEDUCT] ✅ Deducted ${deductAmount} from ${item.name} - new qty: ${newBalance}`)
    console.log(`[INVENTORY DEDUCT] ✅ Created ledger entry: ${ledgerEntry.id}`)
    
    return NextResponse.json({
      success: true,
      item: {
        id: item.id,
        name: item.name,
        previousBalance: currentBalance,
        newBalance: newBalance,
        deducted: deductAmount,
      },
      ledgerEntry: {
        id: ledgerEntry.id,
        type: ledgerEntry.type,
        quantity: deductAmount,
      }
    })
    
  } catch (error) {
    console.error('[INVENTORY DEDUCT] Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to deduct inventory',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
})