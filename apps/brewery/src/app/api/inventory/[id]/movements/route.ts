import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@saas-platform/database'
import { withPermission, RouteContext } from '@/lib/api-middleware'

// GET /api/inventory/[id]/movements - Get all movements for an ingredient
export const GET = withPermission('inventory:read', async (
  req: NextRequest,
  ctx: RouteContext
) => {
  const url = new URL(req.url)
  const pathParts = url.pathname.split('/').filter(Boolean)
  const identifier = pathParts[pathParts.length - 2] // Get id from /api/inventory/[id]/movements
  
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
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }
    
    // Get all ledger entries for this inventory item (use the real item.id)
    const ledgerEntries = await prisma.inventoryLedger.findMany({
      where: {
        itemId: item.id,
        tenantId: ctx.tenantId,
      },
      include: {
        batch: {
          select: {
            id: true,
            batchNumber: true,
            status: true,
            recipe: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Get unique user IDs from ledger entries
    const userIds = Array.from(new Set(ledgerEntries.map(e => e.createdBy).filter((id): id is string => Boolean(id))))
    
    // Fetch user names if there are any user IDs
    const userMap: Record<string, string> = {}
    if (userIds.length > 0) {
      try {
        const users = await prisma.user.findMany({
          where: {
            id: { in: userIds },
          },
          select: {
            id: true,
            name: true,
            email: true,
          },
        })
        
        // Create a map of user ID to name (fallback to email if name is not available)
        users.forEach(u => {
          userMap[u.id] = u.name || u.email || 'უცნობი'
        })
      } catch (userError) {
        console.error('[GET movements] Error fetching users:', userError)
        // Continue without user names if there's an error
      }
    }

    // Transform ledger entries to movement format
    const movements = ledgerEntries.map((entry) => {
      // Map LedgerEntryType to movement type
      let type: 'in' | 'out' | 'adjustment' | 'waste' = 'out'
      let reason = entry.notes || ''
      let reference = entry.batchId || entry.orderId || ''
      let movementDate = entry.createdAt // Default to createdAt

      switch (entry.type) {
        case 'PURCHASE':
          type = 'in'
          // For purchases, use createdAt as the purchase date (can be enhanced later with order dates)
          movementDate = entry.createdAt
          reason = entry.notes || `მიწოდება ${entry.orderId || ''}`.trim() || 'შესყიდვა'
          reference = entry.orderId || ''
          break
        case 'PRODUCTION':
          type = 'in'
          reason = entry.notes || (entry.batch ? `პარტია ${entry.batch.batchNumber}` : 'წარმოება')
          reference = entry.batch?.batchNumber || entry.orderId || ''
          break
        case 'RETURN':
          type = 'in'
          reason = entry.notes || 'დაბრუნება'
          reference = entry.orderId || ''
          break
        case 'CONSUMPTION':
          type = 'out'
          reason = entry.notes || (entry.batch ? `პარტია ${entry.batch.batchNumber}` : 'მოხმარება')
          reference = entry.batch?.batchNumber || entry.orderId || ''
          break
        case 'WASTE':
          type = 'waste'
          reason = entry.notes || 'ჩამოწერა'
          reference = entry.orderId || ''
          break
        case 'ADJUSTMENT_ADD':
          type = 'adjustment'
          reason = entry.notes || 'კორექტირება (+)'
          reference = entry.orderId || ''
          break
        case 'ADJUSTMENT_REMOVE':
          type = 'adjustment'
          reason = entry.notes || 'კორექტირება (-)'
          reference = entry.orderId || ''
          break
        case 'SALE':
          type = 'out'
          reason = entry.notes || 'გაყიდვა'
          reference = entry.orderId || ''
          break
        case 'REVERSAL':
          type = 'adjustment'
          reason = entry.notes || 'გაუქმება'
          reference = entry.orderId || ''
          break
        default:
          type = Number(entry.quantity) >= 0 ? 'in' : 'out'
          reason = entry.notes || entry.type
          reference = entry.orderId || entry.batch?.batchNumber || ''
      }

      const quantity = Number(entry.quantity)
      const absQuantity = Math.abs(quantity)

      return {
        id: entry.id,
        date: movementDate, // Use purchase date for purchases, createdAt for others
        type,
        quantity: absQuantity,
        reason: reason || entry.type,
        reference: reference || entry.batch?.batchNumber || undefined,
        user: entry.createdBy || 'სისტემა',
        userName: entry.createdBy ? (userMap[entry.createdBy] || 'სისტემა') : 'სისტემა',
        balanceAfter: 0, // Will be calculated below
        batchId: entry.batchId,
        batchNumber: entry.batch?.batchNumber,
        batchStatus: entry.batch?.status,
        recipeName: entry.batch?.recipe?.name,
        rawQuantity: quantity, // Keep original for balance calculation
        orderId: entry.orderId || '',
      }
    })

    // Calculate balance after each movement
    // Start from the oldest entry and work forward
    // item already fetched above, just get cachedBalance

    // Sort by date ascending for balance calculation
    movements.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    // Get initial balance by summing all ledger entries
    // This gives us the starting point
    const totalSum = ledgerEntries.reduce((sum, entry) => sum + Number(entry.quantity), 0)
    const currentBalance = Number(item.cachedBalance || 0)
    
    // Calculate starting balance (current - total changes)
    let runningBalance = currentBalance - totalSum
    
    // Calculate running balance forward from start
    movements.forEach((movement: any) => {
      // Use rawQuantity (can be negative) for accurate calculation
      const qty = movement.rawQuantity !== undefined ? movement.rawQuantity : (movement.type === 'in' || (movement.type === 'adjustment' && Number(ledgerEntries.find(e => e.id === movement.id)?.quantity || 0) > 0) ? movement.quantity : -movement.quantity)
      runningBalance += qty
      movement.balanceAfter = Math.max(0, runningBalance)
      // Remove rawQuantity from response
      delete movement.rawQuantity
    })

    // Sort back to descending (most recent first) for display
    movements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return NextResponse.json({ movements })
  } catch (error: any) {
    console.error('[GET /api/inventory/[id]/movements] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch movements', details: error.message },
      { status: 500 }
    )
  }
})

// POST /api/inventory/[id]/movements - Create a new movement
export const POST = withPermission('inventory:update', async (
  req: NextRequest,
  ctx: RouteContext
) => {
  const url = new URL(req.url)
  const pathParts = url.pathname.split('/').filter(Boolean)
  const identifier = pathParts[pathParts.length - 2] // Get id from /api/inventory/[id]/movements
  const body = await req.json()
  
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
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }
    
    const itemId = item.id // Use the real item.id
    
    // Determine ledger entry type from movement type
    let ledgerType: 'PURCHASE' | 'CONSUMPTION' | 'ADJUSTMENT_ADD' | 'ADJUSTMENT_REMOVE' | 'WASTE' = 'PURCHASE'
    if (body.type === 'PURCHASE' || body.type === 'in') {
      ledgerType = 'PURCHASE'
    } else if (body.type === 'CONSUMPTION' || body.type === 'out') {
      ledgerType = 'CONSUMPTION'
    } else if (body.type === 'WASTE' || body.type === 'waste') {
      ledgerType = 'WASTE'
    } else if (body.type === 'ADJUSTMENT_ADD' || body.type === 'adjustment') {
      ledgerType = body.quantity >= 0 ? 'ADJUSTMENT_ADD' : 'ADJUSTMENT_REMOVE'
    }

    // Create ledger entry
    const ledgerEntry = await prisma.inventoryLedger.create({
      data: {
        tenantId: ctx.tenantId,
        itemId: itemId,
        quantity: body.quantity,
        type: ledgerType,
        notes: body.reason || '',
        batchId: body.batchId || null,  // ✅ სწორი ველი
        createdBy: ctx.userId || 'system',
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
      },
    })

    return NextResponse.json({ success: true, id: ledgerEntry.id })
  } catch (error: any) {
    console.error('[POST /api/inventory/[id]/movements] Error:', error)
    return NextResponse.json(
      { error: 'Failed to create movement', details: error.message },
      { status: 500 }
    )
  }
})
