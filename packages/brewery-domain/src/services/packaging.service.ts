import { prisma, withTransaction } from '@brewery/database'
import { batchRepository } from '../repositories/batch.repository'
import { inventoryRepository } from '../repositories/inventory.repository'
import { tankRepository } from '../repositories/tank.repository'
import { PackagingInput, PackageType } from '../types'
import { 
  EntityNotFoundError, 
  InvalidBatchStateError,
  InsufficientInventoryError 
} from '../errors'

// Package type to volume mapping (liters per unit)
const PACKAGE_VOLUMES: Record<PackageType, number> = {
  KEG_50: 50,
  KEG_30: 30,
  KEG_20: 20,
  BOTTLE_750: 0.75,
  BOTTLE_500: 0.5,
  BOTTLE_330: 0.33,
  CAN_500: 0.5,
  CAN_330: 0.33,
}

// Package type to required packaging SKUs
const PACKAGE_MATERIALS: Record<PackageType, string[]> = {
  KEG_50: ['PKG-KEG50'],
  KEG_30: ['PKG-KEG30'],
  KEG_20: ['PKG-KEG20'],
  BOTTLE_750: ['PKG-BOT750', 'PKG-CAP', 'PKG-LBL'],
  BOTTLE_500: ['PKG-BOT500', 'PKG-CAP', 'PKG-LBL'],
  BOTTLE_330: ['PKG-BOT330', 'PKG-CAP', 'PKG-LBL'],
  CAN_500: ['PKG-CAN500', 'PKG-LBL'],
  CAN_330: ['PKG-CAN330', 'PKG-LBL'],
}

export class PackagingService {
  /**
   * FINISH PACKAGING - Atomic operation
   * 1. Validate batch state
   * 2. Deduct packaging materials
   * 3. Create finished goods ledger entry
   * 4. Create packaging run record
   * 5. Update batch status
   * 6. Release tank
   */
  async package(
    tenantId: string,
    userId: string,
    input: PackagingInput
  ): Promise<{ packagingId: string; finishedGoodsSku: string }> {
    return withTransaction(async (tx) => {
      // 1. Get batch
      const batch = await batchRepository.getById(tenantId, input.batchId)
      
      if (!batch) {
        throw new EntityNotFoundError('Batch', input.batchId)
      }
      
      if (!['READY', 'PACKAGING'].includes(batch.status)) {
        throw new InvalidBatchStateError(input.batchId, batch.status, ['READY', 'PACKAGING'])
      }
      
      const packageType = input.packageType as PackageType
      const volumePerUnit = PACKAGE_VOLUMES[packageType]
      const totalVolume = volumePerUnit * input.quantity
      
      // 2. Check available batch volume
      // Note: We'll track packaged volume via packaging runs aggregation
      const existingPackagingRuns = await tx.packagingRun.findMany({
        where: { batchId: input.batchId },
        select: { volumeTotal: true },
      })
      
      const currentPackaged = existingPackagingRuns.reduce(
        (sum, run) => sum + Number(run.volumeTotal),
        0
      )
      const remainingVolume = Number(batch.volume) - currentPackaged
      
      if (totalVolume > remainingVolume) {
        throw new InvalidBatchStateError(
          input.batchId,
          `Only ${remainingVolume}L remaining`,
          `Need ${totalVolume}L for ${input.quantity} ${packageType}`
        )
      }
      
      // 3. Get required packaging materials
      const requiredSkus = PACKAGE_MATERIALS[packageType] || []
      
      // Get inventory items by SKU
      const packagingItems = await tx.inventoryItem.findMany({
        where: {
          tenantId,
          sku: { in: requiredSkus },
        },
      })
      
      // Lock items
      if (packagingItems.length > 0) {
        await inventoryRepository.lockItemsForUpdate(
          tx,
          tenantId,
          packagingItems.map(i => i.id)
        )
      }
      
      // 4. Verify packaging materials availability
      const insufficientItems: Array<{
        itemId: string
        name: string
        required: number
        available: number
      }> = []
      
      for (const item of packagingItems) {
        const required = item.sku === 'PKG-LBL' || item.sku === 'PKG-CAP' 
          ? input.quantity 
          : input.quantity // 1:1 for containers
          
        if (Number(item.cachedBalance) < required) {
          insufficientItems.push({
            itemId: item.id,
            name: item.name,
            required,
            available: Number(item.cachedBalance),
          })
        }
      }
      
      if (insufficientItems.length > 0) {
        throw new InsufficientInventoryError(insufficientItems)
      }
      
      // 5. Deduct packaging materials
      for (const item of packagingItems) {
        const quantity = item.sku === 'PKG-LBL' || item.sku === 'PKG-CAP'
          ? input.quantity
          : input.quantity
          
        await inventoryRepository.createLedgerEntry(tx, {
          tenantId,
          itemId: item.id,
          quantity: -quantity,
          type: 'CONSUMPTION',
          batchId: input.batchId,
          notes: `Packaging: ${input.quantity} x ${packageType}`,
          createdBy: userId,
        })
      }
      
      // 6. Create packaging run
      const packagingRun = await tx.packagingRun.create({
        data: {
          tenantId,
          batchId: input.batchId,
          packageType,
          quantity: input.quantity,
          volumeTotal: totalVolume,
          lotNumber: input.lotNumber,
          performedBy: userId,
          notes: input.notes,
        },
      })
      
      // 7. Create or update finished goods inventory
      const finishedGoodsSku = `FG-${batch.recipe?.name?.toUpperCase().replace(/\s+/g, '-') || 'BEER'}-${packageType}`
      
      let finishedGoodsItem = await tx.inventoryItem.findUnique({
        where: { tenantId_sku: { tenantId, sku: finishedGoodsSku } },
      })
      
      if (!finishedGoodsItem) {
        finishedGoodsItem = await tx.inventoryItem.create({
          data: {
            tenantId,
            sku: finishedGoodsSku,
            name: `${batch.recipe?.name || 'Beer'} (${packageType.replace('_', ' ')})`,
            category: 'FINISHED_GOOD',
            unit: 'pcs',
          },
        })
      }
      
      // 8. Add finished goods to inventory (ledger IN)
      await inventoryRepository.createLedgerEntry(tx, {
        tenantId,
        itemId: finishedGoodsItem.id,
        quantity: input.quantity, // Positive = production
        type: 'PRODUCTION',
        batchId: input.batchId,
        packagingId: packagingRun.id,
        notes: `From batch ${batch.batchNumber}`,
        reference: input.lotNumber,
        createdBy: userId,
      })
      
      // 9. Update batch
      const newPackagedVolume = currentPackaged + totalVolume
      const isFullyPackaged = newPackagedVolume >= Number(batch.volume) * 0.99 // 99% threshold
      
      await batchRepository.updateStatus(tx, tenantId, input.batchId, 
        isFullyPackaged ? 'COMPLETED' : 'PACKAGING',
        {
          packagedAt: new Date(),
          ...(isFullyPackaged && { completedAt: new Date() }),
        }
      )
      
      // 10. Release tank if fully packaged
      if (isFullyPackaged && batch.tankId) {
        await tankRepository.release(tx, tenantId, batch.tankId, 'CLEANING')
      }
      
      // 11. Timeline event
      await batchRepository.addTimelineEvent(tx, {
        batchId: input.batchId,
        type: isFullyPackaged ? 'COMPLETED' : 'PACKAGING_COMPLETE',
        title: isFullyPackaged ? 'Batch Completed' : 'Packaging Run Complete',
        description: `${input.quantity} x ${packageType} (${totalVolume}L)`,
        data: {
          packagingId: packagingRun.id,
          packageType,
          quantity: input.quantity,
          volumeTotal: totalVolume,
        },
        createdBy: userId,
      })
      
      return {
        packagingId: packagingRun.id,
        finishedGoodsSku,
      }
    }, { timeout: 15000, isolationLevel: 'Serializable' })
  }
}

export const packagingService = new PackagingService()



















