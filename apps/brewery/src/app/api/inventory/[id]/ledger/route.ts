// /api/inventory/[id]/ledger/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenantId = request.headers.get('x-tenant-id') || 'tenant1'
    const itemId = params.id
    
    console.log('[INVENTORY LEDGER] Fetching ledger for item:', itemId)
    
    // Get the inventory item
    const item = await prisma.inventoryItem.findFirst({
      where: {
        id: itemId,
        tenantId,
      },
    })
    
    if (!item) {
      console.log('[INVENTORY LEDGER] Item not found:', itemId)
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }
    
    // Get ledger entries for this item
    const ledgerEntries = await prisma.inventoryLedger.findMany({
      where: {
        itemId,
        tenantId,
      },
      include: {
        batch: {
          select: {
            id: true,
            batchNumber: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100, // Last 100 entries
    })
    
    console.log('[INVENTORY LEDGER] Found entries:', ledgerEntries.length)
    
    // Transform entries for frontend
    const history = ledgerEntries.map(entry => ({
      id: entry.id,
      date: entry.createdAt.toISOString(),
      type: entry.type,
      quantity: Math.abs(Number(entry.quantity)),
      notes: entry.notes,
      createdBy: entry.createdBy,
      batchNumber: entry.batch?.batchNumber || null,
      batchId: entry.batchId,
    }))
    
    return NextResponse.json({
      item: {
        id: item.id,
        name: item.name,
        sku: item.sku,
        category: item.category,
        unit: item.unit,
        quantity: Number(item.cachedBalance), // This is the actual current balance!
        reorderPoint: item.reorderPoint ? Number(item.reorderPoint) : null,
      },
      history, // For new code
      ledger: history, // For legacy compatibility
    })
  } catch (error) {
    console.error('[INVENTORY LEDGER] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch ledger' }, { status: 500 })
  }
}

// POST - Add manual ledger entry
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenantId = request.headers.get('x-tenant-id') || 'tenant1'
    const itemId = params.id
    const body = await request.json()
    
    const { quantity, type, notes, createdBy = 'სისტემა' } = body
    
    console.log('[INVENTORY LEDGER] Adding entry:', { itemId, quantity, type, notes })
    
    // Get current item
    const item = await prisma.inventoryItem.findFirst({
      where: { id: itemId, tenantId },
    })
    
    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }
    
    // Determine quantity sign based on type
    const isPositive = ['PURCHASE', 'ADJUSTMENT_ADD', 'RETURN', 'PRODUCTION'].includes(type)
    const ledgerQuantity = isPositive ? Math.abs(quantity) : -Math.abs(quantity)
    
    // Calculate new balance
    const currentBalance = Number(item.cachedBalance)
    const newBalance = currentBalance + ledgerQuantity
    
    // Create ledger entry and update balance in transaction
    const [ledgerEntry, updatedItem] = await prisma.$transaction([
      prisma.inventoryLedger.create({
        data: {
          tenantId,
          itemId,
          quantity: ledgerQuantity,
          type,
          notes,
          createdBy,
        },
      }),
      prisma.inventoryItem.update({
        where: { id: itemId },
        data: {
          cachedBalance: newBalance,
          balanceUpdatedAt: new Date(),
        },
      }),
    ])
    
    console.log('[INVENTORY LEDGER] Entry created, new balance:', newBalance)
    
    return NextResponse.json({
      success: true,
      ledgerEntry: {
        id: ledgerEntry.id,
        date: ledgerEntry.createdAt.toISOString(),
        type: ledgerEntry.type,
        quantity: Math.abs(Number(ledgerEntry.quantity)),
        notes: ledgerEntry.notes,
        createdBy: ledgerEntry.createdBy,
      },
      newBalance,
    })
  } catch (error) {
    console.error('[INVENTORY LEDGER] Error creating entry:', error)
    return NextResponse.json({ error: 'Failed to create ledger entry' }, { status: 500 })
  }
}
