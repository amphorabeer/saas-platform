import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@saas-platform/database'
import { withPermission, RouteContext } from '@/lib/api-middleware'
import { randomUUID } from 'crypto'

// GET /api/inventory/:id - Get item details with ledger (requires inventory:read)
export const GET = withPermission('inventory:read', async (
  req: NextRequest,
  ctx: RouteContext
) => {
  const url = new URL(req.url)
  const pathParts = url.pathname.split('/').filter(Boolean)
  const identifier = pathParts[pathParts.length - 1] // Could be id or sku
  
  if (!identifier) {
    return NextResponse.json({ error: 'Item ID or SKU is required' }, { status: 400 })
  }
  
  try {
    // Look up by EITHER id OR sku
    const item = await prisma.inventoryItem.findFirst({
      where: {
        tenantId: ctx.tenantId,
        OR: [
          { id: identifier },
          { sku: identifier },
        ],
      },
      include: {
        ledger: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: {
            batch: {
              select: { id: true, batchNumber: true }
            }
          }
        }
      }
    })
    
    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }
    
    return NextResponse.json({
      item: {
        id: item.id,
        sku: item.sku,
        name: item.name,
        category: item.category,
        unit: item.unit,
        balance: Number(item.cachedBalance),
        reorderPoint: item.reorderPoint ? Number(item.reorderPoint) : null,
        supplier: item.supplier,
        costPerUnit: item.costPerUnit ? Number(item.costPerUnit) : null,
        specs: item.specs,
        updatedAt: item.balanceUpdatedAt,
      },
      ledger: item.ledger.map(entry => ({
        id: entry.id,
        quantity: Number(entry.quantity),
        type: entry.type,
        notes: entry.notes,
        reference: entry.orderId,
        batchNumber: entry.batch?.batchNumber,
        createdBy: entry.createdBy,
        createdAt: entry.createdAt,
      }))
    })
  } catch (error) {
    console.error('Inventory item GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch item' }, { status: 500 })
  }
})

// PUT /api/inventory/:id - Update item (requires inventory:update)
export const PUT = withPermission('inventory:update', async (
  req: NextRequest,
  ctx: RouteContext
) => {
  try {
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/').filter(Boolean)
    const identifier = pathParts[pathParts.length - 1] // Could be id or sku
    
    if (!identifier) {
      return NextResponse.json({ error: 'Item ID or SKU is required' }, { status: 400 })
    }
    
    const body = await req.json()
    
    // Find item by EITHER id OR sku
    const existingItem = await prisma.inventoryItem.findFirst({
      where: {
        tenantId: ctx.tenantId,
        OR: [
          { id: identifier },
          { sku: identifier },
        ],
      },
    })
    
    if (!existingItem) {
      return NextResponse.json(
        { error: 'ინგრედიენტი ვერ მოიძებნა' },
        { status: 404 }
      )
    }
    
    // Update using the actual item.id
    const item = await prisma.inventoryItem.update({
      where: { id: existingItem.id },
      data: {
        name: body.name,
        reorderPoint: body.reorderPoint,
        supplier: body.supplier,
        costPerUnit: body.costPerUnit,
      }
    })
    
    return NextResponse.json({ item })
  } catch (error) {
    console.error('Inventory item PUT error:', error)
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 })
  }
})

// DELETE /api/inventory/:id - Delete item (requires inventory:update)
export const DELETE = withPermission('inventory:update', async (
  req: NextRequest,
  ctx: RouteContext
) => {
  try {
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/').filter(Boolean)
    const identifier = pathParts[pathParts.length - 1] // Could be id or sku
    
    console.log('[DELETE] Looking for item by id or sku:', identifier)
    console.log('[DELETE] Context tenantId:', ctx.tenantId)
    
    if (!identifier) {
      return NextResponse.json({ error: 'Item ID or SKU is required' }, { status: 400 })
    }
    
    // Find item by EITHER id OR sku
    const item = await prisma.inventoryItem.findFirst({
      where: {
        tenantId: ctx.tenantId,
        OR: [
          { id: identifier },
          { sku: identifier },
        ],
      },
    })
    
    console.log('[DELETE] Found item:', item ? {
      id: item.id,
      sku: item.sku,
      name: item.name,
      tenantId: item.tenantId,
    } : null)

    if (!item) {
      return NextResponse.json(
        { error: 'ინგრედიენტი ვერ მოიძებნა' },
        { status: 404 }
      )
    }

    // Delete ledger entries first (use the actual item.id, not the parameter)
    const deletedLedger = await prisma.inventoryLedger.deleteMany({
      where: { 
        itemId: item.id,
        tenantId: ctx.tenantId,
      },
    })
    
    console.log('[DELETE] Deleted ledger entries:', deletedLedger.count)

    // Delete the item (use the actual item.id)
    await prisma.inventoryItem.delete({
      where: { id: item.id },
    })
    
    console.log('[DELETE] Item deleted successfully')

    return NextResponse.json({ 
      success: true,
      message: 'ინგრედიენტი წარმატებით წაიშალა' 
    })
  } catch (error) {
    console.error('[DELETE] Inventory item DELETE error:', error)

    if ((error as any).code === 'P2025') {
      return NextResponse.json(
        { error: 'ინგრედიენტი ვერ მოიძებნა' },
        { status: 404 }
      )
    }

    if ((error as any).code === 'P2003') {
      return NextResponse.json(
        { error: 'ინგრედიენტი გამოყენებულია სხვა ჩანაწერებში და ვერ წაიშლება' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'წაშლა ვერ მოხერხდა: ' + ((error as Error).message || 'Unknown error') },
      { status: 500 }
    )
  }
})

// PATCH /api/inventory/:id - Update item balance (requires inventory:update)
export const PATCH = withPermission('inventory:update', async (
  req: NextRequest,
  ctx: RouteContext
) => {
  try {
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/').filter(Boolean)
    const identifier = pathParts[pathParts.length - 1]
    
    if (!identifier) {
      return NextResponse.json({ error: 'Item ID or SKU is required' }, { status: 400 })
    }
    
    const body = await req.json()
    const { quantity, type, notes, batchId, balance, cachedBalance, currentStock } = body
    
    console.log('[PATCH] Inventory update:', { identifier, quantity, type, notes, batchId, balance, cachedBalance, currentStock })
    
    // Find item by EITHER id OR sku
    const existingItem = await prisma.inventoryItem.findFirst({
      where: {
        tenantId: ctx.tenantId,
        OR: [
          { id: identifier },
          { sku: identifier },
        ],
      },
    })
    
    if (!existingItem) {
      return NextResponse.json(
        { error: 'ინგრედიენტი ვერ მოიძებნა' },
        { status: 404 }
      )
    }
    
    // Calculate new balance
    const currentBalance = Number(existingItem.cachedBalance) || 0
    const changeAmount = Number(quantity) || Number(balance) || Number(cachedBalance) || Number(currentStock) || 0
    
    // type: 'USE' = subtract, 'ADD' = add, 'ADJUSTMENT' = set directly
    // If balance/cachedBalance/currentStock is provided directly, use it as absolute value
    let newBalance: number
    if (balance !== undefined || cachedBalance !== undefined || currentStock !== undefined) {
      // Direct set (from handleStartBrewing)
      newBalance = changeAmount
    } else if (type === 'USE' || type === 'CONSUMPTION') {
      newBalance = currentBalance - Math.abs(changeAmount)
    } else if (type === 'ADD' || type === 'RECEIPT') {
      newBalance = currentBalance + Math.abs(changeAmount)
    } else if (type === 'ADJUSTMENT') {
      newBalance = changeAmount // Direct set
    } else {
      // Default: subtract (for brewing consumption)
      newBalance = currentBalance - Math.abs(changeAmount)
    }
    
    // Ensure non-negative balance
    if (newBalance < 0) {
      newBalance = 0
    }
    
    // Update item balance
    const updatedItem = await prisma.inventoryItem.update({
      where: { id: existingItem.id },
      data: {
        cachedBalance: newBalance,
        balanceUpdatedAt: new Date(),
      },
    })
    
    // Create ledger entry (only if quantity/type provided, not for direct balance updates)
    if (quantity && type) {
      // ✅ FIX: Map request body type to valid LedgerEntryType enum
      const mapTypeToLedgerEntryType = (reqType: string): 'CONSUMPTION' | 'PURCHASE' | 'ADJUSTMENT' | 'PRODUCTION' => {
        const upperType = (reqType || '').toUpperCase()
        if (upperType === 'USE' || upperType === 'USAGE' || upperType === 'CONSUMPTION') {
          return 'CONSUMPTION'
        }
        if (upperType === 'ADD' || upperType === 'RECEIPT' || upperType === 'PURCHASE') {
          return 'PURCHASE'
        }
        if (upperType === 'ADJUSTMENT' || upperType === 'ADJUST') {
          return 'ADJUSTMENT'
        }
        if (upperType === 'PRODUCTION') {
          return 'PRODUCTION'
        }
        // Default to CONSUMPTION for unknown types
        return 'CONSUMPTION'
      }
      
      const ledgerType = mapTypeToLedgerEntryType(type)
      const isNegative = ledgerType === 'CONSUMPTION' || ledgerType === 'ADJUSTMENT'
      
      await prisma.inventoryLedger.create({
        data: {
          id: randomUUID(),
          tenantId: ctx.tenantId,
          itemId: existingItem.id,
          quantity: isNegative ? -Math.abs(changeAmount) : changeAmount,
          type: ledgerType,
          notes: notes || null,
          batchId: batchId || null,
          createdBy: ctx.userId || 'system',
        },
      })
    }
    
    console.log('[PATCH] ✅ Inventory updated:', {
      item: existingItem.name,
      oldBalance: currentBalance,
      change: changeAmount,
      newBalance: newBalance,
    })
    
    return NextResponse.json({
      success: true,
      item: {
        id: updatedItem.id,
        sku: updatedItem.sku,
        name: updatedItem.name,
        balance: newBalance,
      },
    })
  } catch (error) {
    console.error('[PATCH] Inventory PATCH error:', error)
    return NextResponse.json(
      { error: 'Failed to update inventory: ' + ((error as Error).message || 'Unknown error') },
      { status: 500 }
    )
  }
})