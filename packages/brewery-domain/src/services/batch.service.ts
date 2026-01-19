import { prisma, withTransaction, PrismaTransactionClient } from '@brewery/database'
import { withIdempotency } from '@brewery/redis'
import { batchRepository } from '../repositories/batch.repository'
import { inventoryRepository } from '../repositories/inventory.repository'
import { tankRepository } from '../repositories/tank.repository'
import { 
  BatchCreateInput, 
  BatchCreateResult,
  BatchStatus,
  InventoryPosition 
} from '../types'
import {
  InsufficientInventoryError,
  InvalidBatchStateError,
  EntityNotFoundError,
  TankCapacityExceededError,
} from '../errors'

export class BatchService {
  /**
   * CREATE BATCH - Atomic operation
   * 1. Validate recipe & tank
   * 2. Lock inventory items
   * 3. Verify availability
   * 4. Deduct inventory (ledger OUT)
   * 5. Acquire tank
   * 6. Create batch with ingredients snapshot
   */
  async create(
    tenantId: string,
    userId: string,
    input: BatchCreateInput,
    idempotencyKey?: string
  ): Promise<BatchCreateResult> {
    // Idempotency wrapper (if key provided)
    if (idempotencyKey) {
      const result = await withIdempotency<BatchCreateResult>(
        tenantId,
        idempotencyKey,
        86400, // 24 hours
        () => this.executeCreate(tenantId, userId, input)
      )
      return result.response
    }
    
    return this.executeCreate(tenantId, userId, input)
  }

  private async executeCreate(
    tenantId: string,
    userId: string,
    input: BatchCreateInput
  ): Promise<BatchCreateResult> {
    return withTransaction(async (tx) => {
      // 1. Get recipe with ingredients
      const recipe = await tx.recipe.findUnique({
        where: { id: input.recipeId, tenantId },
        include: { ingredients: true },
      })
      
      if (!recipe) {
        throw new EntityNotFoundError('Recipe', input.recipeId)
      }
      
      // 2. Calculate required quantities (scale by batch size ratio)
      const scaleFactor = Number(input.volume) / Number(recipe.batchSize)
      const requiredIngredients = recipe.ingredients
        .filter(ing => ing.inventoryItemId) // Only items linked to inventory
        .map(ing => ({
          itemId: ing.inventoryItemId!,
          name: ing.name,
          quantity: Number(ing.amount) * scaleFactor,
          unit: ing.unit,
          category: ing.category,
        }))
      
      // 3. Lock inventory items (prevent concurrent deductions)
      if (requiredIngredients.length > 0) {
        await inventoryRepository.lockItemsForUpdate(
          tx,
          tenantId,
          requiredIngredients.map(i => i.itemId)
        )
      }
      
      // 4. Verify inventory availability
      const positions = await inventoryRepository.getPositions(
        tenantId,
        requiredIngredients.map(i => i.itemId),
        tx
      )
      
      const insufficientItems: Array<{
        itemId: string
        name: string
        required: number
        available: number
      }> = []
      
      for (const req of requiredIngredients) {
        const position = positions.get(req.itemId)
        if (!position || position.available < req.quantity) {
          insufficientItems.push({
            itemId: req.itemId,
            name: req.name,
            required: req.quantity,
            available: position?.available ?? 0,
          })
        }
      }
      
      if (insufficientItems.length > 0) {
        throw new InsufficientInventoryError(insufficientItems)
      }
      
      // 5. Validate tank capacity (tankId is actually equipmentId)
      const equipment = await tx.equipment.findUnique({
        where: { id: input.tankId, tenantId },
        select: { id: true, name: true, capacity: true },
      })
      
      if (!equipment) {
        throw new EntityNotFoundError('Tank', input.tankId)
      }
      
      if (equipment.capacity && Number(equipment.capacity) < input.volume) {
        throw new TankCapacityExceededError(
          equipment.id,
          equipment.name,
          Number(equipment.capacity),
          input.volume
        )
      }
      
      // 6. Generate batch number
      const batchNumber = await batchRepository.generateBatchNumber(tx, tenantId)
      
      // 7. Create batch first (to get ID)
      const batch = await batchRepository.create(tx, {
        tenantId,
        batchNumber,
        recipeId: input.recipeId,
        tankId: input.tankId,
        volume: input.volume,
        targetOg: Number(recipe.og),
        plannedDate: input.plannedDate,
        notes: input.notes,
        createdBy: userId,
      })
      
      // 8. Acquire tank (using batch ID)
      await tankRepository.acquire(tx, tenantId, input.tankId, batch.id, 'FERMENTATION')
      
      // 9. Deduct inventory (create ledger OUT entries)
      const consumedIngredients: BatchCreateResult['ingredientsConsumed'] = []
      
      for (const req of requiredIngredients) {
        await inventoryRepository.createLedgerEntry(tx, {
          tenantId,
          itemId: req.itemId,
          quantity: -req.quantity, // Negative = consumption
          type: 'CONSUMPTION',
          batchId: batch.id,
          notes: `Batch ${batchNumber}`,
          createdBy: userId,
        })
        
        consumedIngredients.push({
          itemId: req.itemId,
          name: req.name,
          quantity: req.quantity,
          unit: req.unit,
        })
      }
      
      // 10. Save ingredients snapshot
      await batchRepository.addIngredients(
        tx,
        batch.id,
        recipe.ingredients.map(ing => ({
          inventoryItemId: ing.inventoryItemId ?? undefined,
          name: ing.name,
          category: ing.category,
          plannedAmount: Number(ing.amount) * scaleFactor,
          unit: ing.unit,
        }))
      )
      
      // 11. Add timeline event
      await batchRepository.addTimelineEvent(tx, {
        batchId: batch.id,
        type: 'CREATED',
        title: 'Batch Created',
        description: `Batch ${batchNumber} created from recipe "${recipe.name}"`,
        data: { recipeId: recipe.id, recipeName: recipe.name, volume: input.volume },
        createdBy: userId,
      })
      
      return {
        batch: {
          id: batch.id,
          batchNumber: batch.batchNumber,
          status: batch.status,
        },
        ingredientsConsumed: consumedIngredients,
        tank: {
          id: equipment.id,
          name: equipment.name,
        },
      }
    }, { timeout: 15000, isolationLevel: 'Serializable' })
  }

  /**
   * START BREWING - Update batch to BREWING status
   */
  async startBrewing(
    tenantId: string,
    userId: string,
    batchId: string,
    originalGravity?: number
  ): Promise<void> {
    return withTransaction(async (tx) => {
      const batch = await batchRepository.getById(tenantId, batchId)
      
      if (!batch) {
        throw new EntityNotFoundError('Batch', batchId)
      }
      
      if (batch.status !== 'PLANNED') {
        throw new InvalidBatchStateError(batchId, batch.status, 'PLANNED')
      }
      
      await batchRepository.updateStatus(tx, tenantId, batchId, 'BREWING', {
        brewedAt: new Date(),
        originalGravity: originalGravity,
      })
      
      await batchRepository.addTimelineEvent(tx, {
        batchId,
        type: 'BREWING_STARTED',
        title: 'Brewing Started',
        description: originalGravity ? `Original Gravity: ${originalGravity}` : undefined,
        data: { originalGravity },
        createdBy: userId,
      })
    })
  }

  /**
   * START FERMENTATION - Transfer to fermenter
   * + EQUIPMENT SYNC: Update Equipment.currentBatchId/currentBatchNumber
   */
  async startFermentation(
    tenantId: string,
    userId: string,
    batchId: string,
    tankId?: string // Optional: transfer to different tank
  ): Promise<void> {
    return withTransaction(async (tx) => {
      const batch = await batchRepository.getById(tenantId, batchId)
      
      if (!batch) {
        throw new EntityNotFoundError('Batch', batchId)
      }
      
      if (batch.status !== 'BREWING') {
        throw new InvalidBatchStateError(batchId, batch.status, 'BREWING')
      }
      
      const targetTankId = tankId || batch.tankId
      
      // If transferring to new tank
      if (tankId && tankId !== batch.tankId) {
        // Release current tank
        if (batch.tankId) {
          await tankRepository.release(tx, tenantId, batch.tankId, 'CLEANING')
          // Clear old Equipment
          await this.clearEquipmentByTankId(tx, tenantId, batch.tankId)
        }
        // Acquire new tank
        await tankRepository.acquire(tx, tenantId, tankId, batchId, 'FERMENTATION')
      }
      
      await batchRepository.updateStatus(tx, tenantId, batchId, 'FERMENTING', {
        fermentationStartedAt: new Date(),
        tankId: targetTankId,
      })
      
      // ========== EQUIPMENT SYNC ==========
      // Update Equipment with batch info
      if (targetTankId) {
        await this.syncEquipmentWithBatch(tx, tenantId, targetTankId, {
          batchId: batch.id,
          batchNumber: batch.batchNumber,
        })
      }
      // ====================================
      
      await batchRepository.addTimelineEvent(tx, {
        batchId,
        type: 'FERMENTATION_STARTED',
        title: 'Fermentation Started',
        data: { tankId: targetTankId },
        createdBy: userId,
      })
    })
  }

  /**
   * TRANSFER TO CONDITIONING
   * + EQUIPMENT SYNC: Clear old, update new
   */
  async transferToConditioning(
    tenantId: string,
    userId: string,
    batchId: string,
    newTankId?: string
  ): Promise<void> {
    return withTransaction(async (tx) => {
      const batch = await batchRepository.getById(tenantId, batchId)
      
      if (!batch) {
        throw new EntityNotFoundError('Batch', batchId)
      }
      
      if (batch.status !== 'FERMENTING') {
        throw new InvalidBatchStateError(batchId, batch.status, 'FERMENTING')
      }
      
      const targetTankId = newTankId || batch.tankId
      
      // If transferring to new tank
      if (newTankId && newTankId !== batch.tankId) {
        if (batch.tankId) {
          await tankRepository.release(tx, tenantId, batch.tankId, 'CLEANING')
          // ========== EQUIPMENT SYNC: Clear old ==========
          await this.clearEquipmentByTankId(tx, tenantId, batch.tankId)
        }
        await tankRepository.acquire(tx, tenantId, newTankId, batchId, 'CONDITIONING')
      }
      
      await batchRepository.updateStatus(tx, tenantId, batchId, 'CONDITIONING', {
        conditioningStartedAt: new Date(),
        tankId: targetTankId,
      })
      
      // ========== EQUIPMENT SYNC: Update new ==========
      if (targetTankId) {
        await this.syncEquipmentWithBatch(tx, tenantId, targetTankId, {
          batchId: batch.id,
          batchNumber: batch.batchNumber,
        })
      }
      // ================================================
      
      await batchRepository.addTimelineEvent(tx, {
        batchId,
        type: 'CONDITIONING_STARTED',
        title: 'Conditioning Started',
        createdBy: userId,
      })
    })
  }

  /**
   * MARK READY - Ready for packaging
   * + EQUIPMENT SYNC: Clear tank (batch no longer actively in tank)
   */
  async markReady(
    tenantId: string,
    userId: string,
    batchId: string,
    finalGravity?: number
  ): Promise<void> {
    return withTransaction(async (tx) => {
      const batch = await batchRepository.getById(tenantId, batchId)
      
      if (!batch) {
        throw new EntityNotFoundError('Batch', batchId)
      }
      
      if (!['FERMENTING', 'CONDITIONING'].includes(batch.status)) {
        throw new InvalidBatchStateError(batchId, batch.status, ['FERMENTING', 'CONDITIONING'])
      }
      
      // Calculate ABV if we have OG and FG
      let calculatedAbv: number | undefined
      if (batch.originalGravity && finalGravity) {
        calculatedAbv = (Number(batch.originalGravity) - finalGravity) * 131.25
      }
      
      // ========== EQUIPMENT SYNC: Clear when ready ==========
      // Note: You may want to keep batch info until packaging
      // Uncomment below if you want to clear immediately
      // if (batch.tankId) {
      //   await this.clearEquipmentByTankId(tx, tenantId, batch.tankId)
      // }
      // ======================================================
      
      await batchRepository.updateStatus(tx, tenantId, batchId, 'READY', {
        readyAt: new Date(),
        finalGravity,
        calculatedAbv,
      })
      
      await batchRepository.addTimelineEvent(tx, {
        batchId,
        type: 'READY_FOR_PACKAGING',
        title: 'Ready for Packaging',
        data: { finalGravity, calculatedAbv },
        createdBy: userId,
      })
    })
  }

  /**
   * CANCEL BATCH - Reversal via ledger entries (no deletes)
   * + EQUIPMENT SYNC: Clear tank
   */
  async cancel(
    tenantId: string,
    userId: string,
    batchId: string,
    reason: string
  ): Promise<void> {
    return withTransaction(async (tx) => {
      const batch = await batchRepository.getById(tenantId, batchId, {
        includeIngredients: true,
      })
      
      if (!batch) {
        throw new EntityNotFoundError('Batch', batchId)
      }
      
      // Can only cancel non-completed batches
      if (['COMPLETED', 'CANCELLED'].includes(batch.status)) {
        throw new InvalidBatchStateError(batchId, batch.status, 'not COMPLETED or CANCELLED')
      }
      
      // Get all consumption entries for this batch
      const consumptionEntries = await tx.inventoryLedger.findMany({
        where: {
          tenantId,
          batchId,
          type: 'CONSUMPTION',
        },
      })
      
      // Create reversal entries (return inventory)
      for (const entry of consumptionEntries) {
        await inventoryRepository.createLedgerEntry(tx, {
          tenantId,
          itemId: entry.itemId,
          quantity: -Number(entry.quantity), // Reverse: negative of negative = positive
          type: 'REVERSAL',
          batchId,
          notes: `Reversal for cancelled batch: ${reason}`,
          createdBy: userId,
        })
      }
      
      // Release tank if occupied
      if (batch.tankId) {
        await tankRepository.release(tx, tenantId, batch.tankId, 'AVAILABLE')
        // ========== EQUIPMENT SYNC: Clear on cancel ==========
        await this.clearEquipmentByTankId(tx, tenantId, batch.tankId)
        // =====================================================
      }
      
      // Update batch status
      await batchRepository.updateStatus(tx, tenantId, batchId, 'CANCELLED', {
        cancelledAt: new Date(),
        notes: `Cancelled: ${reason}`,
      })
      
      await batchRepository.addTimelineEvent(tx, {
        batchId,
        type: 'CANCELLED',
        title: 'Batch Cancelled',
        description: reason,
        data: { reversedEntries: consumptionEntries.length },
        createdBy: userId,
      })
    }, { timeout: 15000 })
  }

  /**
   * Add gravity reading
   * + EQUIPMENT SYNC: Update currentTemp
   */
  async addGravityReading(
    tenantId: string,
    userId: string,
    batchId: string,
    gravity: number,
    temperature: number,
    notes?: string
  ): Promise<void> {
    return withTransaction(async (tx) => {
      const batch = await batchRepository.getById(tenantId, batchId)
      
      if (!batch) {
        throw new EntityNotFoundError('Batch', batchId)
      }
      
      await batchRepository.addGravityReading(tx, {
        batchId,
        gravity,
        temperature,
        notes,
        recordedBy: userId,
      })
      
      // Update current gravity on batch
      await batchRepository.updateStatus(tx, tenantId, batchId, batch.status, {
        currentGravity: gravity,
      })
      
      // ========== EQUIPMENT SYNC: Update temperature ==========
      if (batch.tankId) {
        await this.updateEquipmentTemperature(tx, tenantId, batch.tankId, temperature)
      }
      // ========================================================
      
      await batchRepository.addTimelineEvent(tx, {
        batchId,
        type: 'GRAVITY_READING',
        title: `Gravity Reading: ${gravity}`,
        data: { gravity, temperature },
        createdBy: userId,
      })
    })
  }

  // ============================================
  // EQUIPMENT SYNC HELPERS
  // ============================================

  /**
   * Sync Equipment with batch info - tankId is actually equipmentId
   */
  private async syncEquipmentWithBatch(
    tx: PrismaTransactionClient,
    tenantId: string,
    tankId: string,
    batchInfo: { batchId: string; batchNumber: string }
  ): Promise<void> {
    try {
      // tankId is actually equipmentId in the legacy system
      const equipment = await tx.equipment.findUnique({
        where: { id: tankId },
      })
      
      if (!equipment) {
        console.warn(`[Equipment Sync] Equipment not found: ${tankId}`)
        return
      }
      
      await tx.equipment.update({
        where: { id: equipment.id },
        data: {
          currentBatchId: batchInfo.batchId,
          // Optionally set status
          // status: 'OPERATIONAL',
        },
      })
      console.log(`[Equipment Sync] Updated ${equipment.name} with batch ${batchInfo.batchNumber}`)
    } catch (error) {
      // Log but don't fail the main operation
      console.error('[Equipment Sync] Error syncing equipment:', error)
    }
  }

  /**
   * Clear Equipment batch info when tank is released - tankId is actually equipmentId
   */
  private async clearEquipmentByTankId(
    tx: PrismaTransactionClient,
    tenantId: string,
    tankId: string
  ): Promise<void> {
    try {
      // tankId is actually equipmentId in the legacy system
      const equipment = await tx.equipment.findUnique({
        where: { id: tankId },
      })
      
      if (!equipment) {
        console.warn(`[Equipment Sync] Equipment not found: ${tankId}`)
        return
      }
      
      await tx.equipment.update({
        where: { id: equipment.id },
        data: {
          currentBatchId: null,
          status: 'NEEDS_CIP', // Mark as needing CIP after batch
        },
      })
      console.log(`[Equipment Sync] Cleared ${equipment.name}`)
    } catch (error) {
      console.error('[Equipment Sync] Error clearing equipment:', error)
    }
  }

  /**
   * Update Equipment temperature from gravity reading - tankId is actually equipmentId
   */
  private async updateEquipmentTemperature(
    tx: PrismaTransactionClient,
    tenantId: string,
    tankId: string,
    temperature: number
  ): Promise<void> {
    try {
      // tankId is actually equipmentId in the legacy system
      const equipment = await tx.equipment.findUnique({
        where: { id: tankId },
      })
      
      if (!equipment) {
        console.warn(`[Equipment Sync] Equipment not found: ${tankId}`)
        return
      }
      
      await tx.equipment.update({
        where: { id: equipment.id },
        data: {
        },
      })
      console.log(`[Equipment Sync] Updated ${equipment.name} temperature: ${temperature}°C`)
    } catch (error) {
      console.error('[Equipment Sync] Error updating temperature:', error)
    }
  }
}

export const batchService = new BatchService()


