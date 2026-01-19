import { prisma, PrismaTransactionClient, withTenant } from '@brewery/database'
import type { InventoryItem, InventoryLedger, LedgerEntryType } from '../types'
import { InventoryPosition } from '../types'

export class InventoryRepository {
  /**
   * Get inventory position using cached balance
   * Fast path - uses trigger-maintained cache
   */
  async getPosition(
    tenantId: string,
    itemId: string,
    tx?: PrismaTransactionClient
  ): Promise<InventoryPosition | null> {
    const db = tx || prisma
    
    const item = await db.inventoryItem.findUnique({
      where: { id: itemId, tenantId },
      select: {
        id: true,
        sku: true,
        name: true,
        unit: true,
        cachedBalance: true,
      },
    })
    
    if (!item) return null
    
    return {
      itemId: item.id,
      sku: item.sku,
      name: item.name,
      onHand: Number(item.cachedBalance),
      reserved: 0, // Future: implement reservations
      available: Number(item.cachedBalance),
      unit: item.unit,
    }
  }

  /**
   * Get multiple inventory positions (batch operation)
   */
  async getPositions(
    tenantId: string,
    itemIds: string[],
    tx?: PrismaTransactionClient
  ): Promise<Map<string, InventoryPosition>> {
    const db = tx || prisma
    
    const items = await db.inventoryItem.findMany({
      where: { 
        tenantId,
        id: { in: itemIds },
      },
      select: {
        id: true,
        sku: true,
        name: true,
        unit: true,
        cachedBalance: true,
      },
    })
    
    const positions = new Map<string, InventoryPosition>()
    
    for (const item of items) {
      positions.set(item.id, {
        itemId: item.id,
        sku: item.sku,
        name: item.name,
        onHand: Number(item.cachedBalance),
        reserved: 0,
        available: Number(item.cachedBalance),
        unit: item.unit,
      })
    }
    
    return positions
  }

  /**
   * Lock inventory items for update (prevents concurrent modifications)
   * MUST be called within a transaction
   */
  async lockItemsForUpdate(
    tx: PrismaTransactionClient,
    tenantId: string,
    itemIds: string[]
  ): Promise<void> {
    await tx.$queryRaw`
      SELECT id FROM "InventoryItem"
      WHERE "tenantId" = ${tenantId}
      AND id = ANY(${itemIds}::text[])
      FOR UPDATE
    `
  }

  /**
   * Create ledger entry (this triggers balance cache update)
   */
  async createLedgerEntry(
    tx: PrismaTransactionClient,
    data: {
      tenantId: string
      itemId: string
      quantity: number // Positive = IN, Negative = OUT
      type: LedgerEntryType
      batchId?: string
      orderId?: string
      packagingId?: string
      notes?: string
      reference?: string
      createdBy: string
    }
  ): Promise<InventoryLedger> {
    return tx.inventoryLedger.create({
      data: {
        tenantId: data.tenantId,
        itemId: data.itemId,
        quantity: data.quantity,
        type: data.type,
        batchId: data.batchId,
        orderId: data.orderId,
        packagingId: data.packagingId,
        notes: data.notes,
        createdBy: data.createdBy,
      },
    })
  }

  /**
   * Get ledger history for an item
   */
  async getLedgerHistory(
    tenantId: string,
    itemId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<InventoryLedger[]> {
    return prisma.inventoryLedger.findMany({
      where: { tenantId, itemId },
      orderBy: { createdAt: 'desc' },
      take: options?.limit ?? 50,
      skip: options?.offset ?? 0,
    })
  }

  /**
   * Verify balance cache accuracy (for debugging/reconciliation)
   */
  async verifyBalance(
    tenantId: string,
    itemId: string
  ): Promise<{ cached: number; calculated: number; isValid: boolean }> {
    const [item, ledgerSum] = await Promise.all([
      prisma.inventoryItem.findUnique({
        where: { id: itemId, tenantId },
        select: { cachedBalance: true },
      }),
      prisma.inventoryLedger.aggregate({
        where: { tenantId, itemId },
        _sum: { quantity: true },
      }),
    ])
    
    const cached = Number(item?.cachedBalance ?? 0)
    const calculated = Number(ledgerSum._sum.quantity ?? 0)
    
    return {
      cached,
      calculated,
      isValid: Math.abs(cached - calculated) < 0.001,
    }
  }
}

export const inventoryRepository = new InventoryRepository()



















