import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { testPrisma, TEST_TENANT_ID, TEST_USER_ID } from './setup'
import { BatchService } from '../services/batch.service'
import { InsufficientInventoryError, TankUnavailableError } from '../errors'

describe('BatchService', () => {
  let batchService: BatchService
  let testRecipeId: string
  let testTankId: string
  let testInventoryIds: string[] = []

  beforeEach(async () => {
    batchService = new BatchService()
    
    // Create test recipe
    const recipe = await testPrisma.recipe.create({
      data: {
        tenantId: TEST_TENANT_ID,
        name: `Test Recipe ${Date.now()}`,
        style: 'IPA',
        abv: 6.5,
        ibu: 60,
        og: 1.065,
        fg: 1.012,
        batchSize: 500,
        boilTime: 60,
      },
    })
    testRecipeId = recipe.id
    
    // Create test inventory items with stock
    const malt = await testPrisma.inventoryItem.create({
      data: {
        tenantId: TEST_TENANT_ID,
        sku: `MALT-TEST-${Date.now()}`,
        name: 'Test Malt',
        category: 'RAW_MATERIAL',
        unit: 'kg',
        cachedBalance: 200,
      },
    })
    testInventoryIds.push(malt.id)
    
    // Add ledger entry for the balance
    await testPrisma.inventoryLedger.create({
      data: {
        tenantId: TEST_TENANT_ID,
        itemId: malt.id,
        quantity: 200,
        type: 'PURCHASE',
        createdBy: TEST_USER_ID,
      },
    })
    
    // Add ingredient to recipe
    await testPrisma.recipeIngredient.create({
      data: {
        recipeId: recipe.id,
        inventoryItemId: malt.id,
        name: 'Test Malt',
        category: 'MALT',
        amount: 100, // 100kg per 500L batch
        unit: 'kg',
      },
    })
    
    // Create test tank
    const tank = await testPrisma.tank.create({
      data: {
        tenantId: TEST_TENANT_ID,
        name: `FV-TEST-${Date.now()}`,
        type: 'FERMENTER',
        capacity: 1000,
        status: 'AVAILABLE',
      },
    })
    testTankId = tank.id
  })

  afterEach(async () => {
    // Clean up test data
    await testPrisma.batchTimeline.deleteMany({
      where: { batch: { tenantId: TEST_TENANT_ID, recipeId: testRecipeId } },
    })
    await testPrisma.batchIngredient.deleteMany({
      where: { batch: { tenantId: TEST_TENANT_ID, recipeId: testRecipeId } },
    })
    await testPrisma.inventoryLedger.deleteMany({
      where: { tenantId: TEST_TENANT_ID, itemId: { in: testInventoryIds } },
    })
    await testPrisma.batch.deleteMany({
      where: { tenantId: TEST_TENANT_ID, recipeId: testRecipeId },
    })
    await testPrisma.tankOccupation.deleteMany({
      where: { tankId: testTankId },
    })
    await testPrisma.tank.deleteMany({
      where: { id: testTankId },
    })
    await testPrisma.recipeIngredient.deleteMany({
      where: { recipeId: testRecipeId },
    })
    await testPrisma.recipe.deleteMany({
      where: { id: testRecipeId },
    })
    await testPrisma.inventoryItem.deleteMany({
      where: { id: { in: testInventoryIds } },
    })
    testInventoryIds = []
  })

  describe('create', () => {
    it('should create batch and deduct inventory atomically', async () => {
      const result = await batchService.create(
        TEST_TENANT_ID,
        TEST_USER_ID,
        {
          recipeId: testRecipeId,
          tankId: testTankId,
          volume: 500,
          plannedDate: new Date(),
        }
      )
      
      expect(result.batch).toBeDefined()
      expect(result.batch.status).toBe('PLANNED')
      expect(result.ingredientsConsumed).toHaveLength(1)
      expect(result.ingredientsConsumed[0].quantity).toBe(100) // 100kg malt
      
      // Verify inventory was deducted
      const item = await testPrisma.inventoryItem.findFirst({
        where: { id: testInventoryIds[0] },
      })
      expect(Number(item?.cachedBalance)).toBe(100) // 200 - 100 = 100
      
      // Verify tank is occupied
      const tank = await testPrisma.tank.findUnique({
        where: { id: testTankId },
      })
      expect(tank?.status).toBe('OCCUPIED')
    })

    it('should rollback on insufficient inventory', async () => {
      // First batch uses most inventory
      await batchService.create(TEST_TENANT_ID, TEST_USER_ID, {
        recipeId: testRecipeId,
        tankId: testTankId,
        volume: 500,
        plannedDate: new Date(),
      })
      
      // Create another tank for second batch
      const tank2 = await testPrisma.tank.create({
        data: {
          tenantId: TEST_TENANT_ID,
          name: `FV-TEST2-${Date.now()}`,
          type: 'FERMENTER',
          capacity: 1000,
          status: 'AVAILABLE',
        },
      })
      
      try {
        // Second batch should fail - only 100kg left
        await batchService.create(TEST_TENANT_ID, TEST_USER_ID, {
          recipeId: testRecipeId,
          tankId: tank2.id,
          volume: 1000, // Would need 200kg
          plannedDate: new Date(),
        })
        expect.fail('Should have thrown InsufficientInventoryError')
      } catch (error) {
        expect(error).toBeInstanceOf(InsufficientInventoryError)
      }
      
      // Verify inventory wasn't changed (rollback worked)
      const item = await testPrisma.inventoryItem.findFirst({
        where: { id: testInventoryIds[0] },
      })
      expect(Number(item?.cachedBalance)).toBe(100) // Still 100 from first batch
      
      // Clean up
      await testPrisma.tank.delete({ where: { id: tank2.id } })
    })

    it('should fail if tank is unavailable', async () => {
      // First batch takes the tank
      await batchService.create(TEST_TENANT_ID, TEST_USER_ID, {
        recipeId: testRecipeId,
        tankId: testTankId,
        volume: 200,
        plannedDate: new Date(),
      })
      
      try {
        // Second batch should fail - tank occupied
        await batchService.create(TEST_TENANT_ID, TEST_USER_ID, {
          recipeId: testRecipeId,
          tankId: testTankId,
          volume: 200,
          plannedDate: new Date(),
        })
        expect.fail('Should have thrown TankUnavailableError')
      } catch (error) {
        expect(error).toBeInstanceOf(TankUnavailableError)
      }
    })
  })

  describe('cancel', () => {
    it('should reverse inventory deductions on cancel', async () => {
      // Create batch
      const result = await batchService.create(
        TEST_TENANT_ID,
        TEST_USER_ID,
        {
          recipeId: testRecipeId,
          tankId: testTankId,
          volume: 500,
          plannedDate: new Date(),
        }
      )
      
      // Verify inventory deducted
      let item = await testPrisma.inventoryItem.findFirst({
        where: { id: testInventoryIds[0] },
      })
      expect(Number(item?.cachedBalance)).toBe(100)
      
      // Cancel batch
      await batchService.cancel(
        TEST_TENANT_ID,
        TEST_USER_ID,
        result.batch.id,
        'Test cancellation'
      )
      
      // Verify inventory restored
      item = await testPrisma.inventoryItem.findFirst({
        where: { id: testInventoryIds[0] },
      })
      expect(Number(item?.cachedBalance)).toBe(200) // Restored to original
      
      // Verify tank released
      const tank = await testPrisma.tank.findUnique({
        where: { id: testTankId },
      })
      expect(tank?.status).toBe('AVAILABLE')
    })
  })

  describe('batch lifecycle', () => {
    it('should progress through lifecycle stages', async () => {
      // Create
      const result = await batchService.create(
        TEST_TENANT_ID,
        TEST_USER_ID,
        {
          recipeId: testRecipeId,
          tankId: testTankId,
          volume: 500,
          plannedDate: new Date(),
        }
      )
      
      const batchId = result.batch.id
      
      // Start brewing
      await batchService.startBrewing(TEST_TENANT_ID, TEST_USER_ID, batchId, 1.065)
      let batch = await testPrisma.batch.findUnique({ where: { id: batchId } })
      expect(batch?.status).toBe('BREWING')
      expect(Number(batch?.actualOg)).toBe(1.065)
      
      // Start fermentation
      await batchService.startFermentation(TEST_TENANT_ID, TEST_USER_ID, batchId)
      batch = await testPrisma.batch.findUnique({ where: { id: batchId } })
      expect(batch?.status).toBe('FERMENTING')
      
      // Transfer to conditioning
      await batchService.transferToConditioning(TEST_TENANT_ID, TEST_USER_ID, batchId)
      batch = await testPrisma.batch.findUnique({ where: { id: batchId } })
      expect(batch?.status).toBe('CONDITIONING')
      
      // Mark ready
      await batchService.markReady(TEST_TENANT_ID, TEST_USER_ID, batchId, 1.012)
      batch = await testPrisma.batch.findUnique({ where: { id: batchId } })
      expect(batch?.status).toBe('READY')
      expect(Number(batch?.finalGravity)).toBe(1.012)
    })
  })
})



















