import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@saas-platform/database'
import { withPermission, RouteContext } from '@/lib/api-middleware'

// DELETE /api/inventory/[id]/movements/[movementId] - Delete a movement
export const DELETE = withPermission('inventory:update', async (
  req: NextRequest,
  ctx: RouteContext
) => {
  const url = new URL(req.url)
  const pathParts = url.pathname.split('/').filter(Boolean)
  const identifier = pathParts[pathParts.length - 3] // Get itemId from /api/inventory/[id]/movements/[movementId]
  const movementId = pathParts[pathParts.length - 1] // Get movementId from URL
  
  try {
    // First find the item by id or sku
    const item = await prisma.inventoryItem.findFirst({
      where: {
        tenantId: ctx.tenantId,
        OR: [
          { id: identifier },
          { sku: identifier },
        ],
      },
    })
    
    if (!item) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      )
    }
    
    const itemId = item.id // Use the real item.id
    
    // Find the ledger entry
    const ledgerEntry = await prisma.inventoryLedger.findFirst({
      where: {
        id: movementId,
        itemId: itemId,
        tenantId: ctx.tenantId,
      },
    })

    if (!ledgerEntry) {
      return NextResponse.json(
        { error: 'Movement not found' },
        { status: 404 }
      )
    }

    // Delete the ledger entry
    await prisma.inventoryLedger.delete({
      where: {
        id: movementId,
      },
    })

    // Recalculate cached balance for the item
    const allEntries = await prisma.inventoryLedger.findMany({
      where: {
        itemId: itemId,
        tenantId: ctx.tenantId,
      },
    })

    const newBalance = allEntries.reduce((sum, entry) => sum + Number(entry.quantity), 0)

    await prisma.inventoryItem.update({
      where: {
        id: itemId,
        tenantId: ctx.tenantId,
      },
      data: {
        cachedBalance: newBalance,
        balanceUpdatedAt: new Date(),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[DELETE /api/inventory/[id]/movements/[movementId]] Error:', error)
    return NextResponse.json(
      { error: 'Failed to delete movement', details: error.message || String(error) },
      { status: 500 }
    )
  }
})

// PUT /api/inventory/[id]/movements/[movementId] - Update a movement
export const PUT = withPermission('inventory:update', async (
  req: NextRequest,
  ctx: RouteContext
) => {
  const url = new URL(req.url)
  const pathParts = url.pathname.split('/').filter(Boolean)
  const identifier = pathParts[pathParts.length - 3] // Get itemId from /api/inventory/[id]/movements/[movementId]
  const movementId = pathParts[pathParts.length - 1] // Get movementId from URL
  const body = await req.json()
  
  console.log('[PUT /movements/[movementId]] Request:', { identifier, movementId, body })
  
  try {
    // First find the item by id or sku
    const item = await prisma.inventoryItem.findFirst({
      where: {
        tenantId: ctx.tenantId,
        OR: [
          { id: identifier },
          { sku: identifier },
        ],
      },
    })
    
    if (!item) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      )
    }
    
    const itemId = item.id // Use the real item.id
    
    // Find the ledger entry
    const ledgerEntry = await prisma.inventoryLedger.findFirst({
      where: {
        id: movementId,
        itemId: itemId,
        tenantId: ctx.tenantId,
      },
    })

    if (!ledgerEntry) {
      return NextResponse.json(
        { error: 'Movement not found' },
        { status: 404 }
      )
    }

    // Determine ledger entry type from movement type or body.type
    let ledgerType = ledgerEntry.type
    if (body.type === 'PURCHASE' || body.type === 'in') {
      ledgerType = 'PURCHASE'
    } else if (body.type === 'CONSUMPTION' || body.type === 'out') {
      ledgerType = 'CONSUMPTION'
    } else if (body.type === 'WASTE' || body.type === 'waste') {
      ledgerType = 'WASTE'
    } else if (body.type === 'ADJUSTMENT_ADD' || body.type === 'ADJUSTMENT_REMOVE' || body.type === 'adjustment') {
      ledgerType = Number(body.quantity) >= 0 ? 'ADJUSTMENT_ADD' : 'ADJUSTMENT_REMOVE'
    }

    // Validate quantity
    const quantity = Number(body.quantity)
    if (isNaN(quantity) || quantity === 0) {
      return NextResponse.json(
        { error: 'Invalid quantity' },
        { status: 400 }
      )
    }

    // Update the ledger entry
    await prisma.inventoryLedger.update({
      where: {
        id: movementId,
      },
      data: {
        quantity: quantity,
        type: ledgerType,
        notes: body.reason || body.notes || ledgerEntry.notes || '',
      },
    })

    // Recalculate cached balance for the item
    const allEntries = await prisma.inventoryLedger.findMany({
      where: {
        itemId: itemId,
        tenantId: ctx.tenantId,
      },
    })

    const newBalance = allEntries.reduce((sum, entry) => sum + Number(entry.quantity), 0)

    await prisma.inventoryItem.update({
      where: {
        id: itemId,
        tenantId: ctx.tenantId,
      },
      data: {
        cachedBalance: newBalance,
        balanceUpdatedAt: new Date(),
      },
    })

    return NextResponse.json({ 
      success: true,
      newBalance,
    })
  } catch (error: any) {
    console.error('[PUT /api/inventory/[id]/movements/[movementId]] Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to update movement', 
        details: error.message || String(error) 
      },
      { status: 500 }
    )
  }
})

