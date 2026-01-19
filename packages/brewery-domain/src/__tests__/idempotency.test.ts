import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { redis } from '@brewery/redis'
import { testPrisma, TEST_TENANT_ID, TEST_USER_ID } from './setup'
import { BatchService } from '../services/batch.service'

describe('Idempotency Tests', () => {
  let batchService: BatchService
  let testRecipeId: string
  let testTankId: string
  let testInventoryId: string

  beforeEach(async () => {
    batchService = new BatchService()
    
    // Setup similar to other tests
    const recipe = await testPrisma.recipe.create({
      data: {
        tenantId: TEST_TENANT_ID,
        name: `Idempotent Recipe ${Date.now()}`,
        style: 'Ale',
        abv: 5.0,
        og: 1.050,
        fg: 1.010,
        batchSize: 100,
      },
    })
    testRecipeId = recipe.id
    
    const malt = await testPrisma.inventoryItem.create({
      data: {
        tenantId: TEST_TENANT_ID,
        sku: `MALT-IDEMP-${Date.now()}`,
        name: 'Idempotent Malt',
        category: 'RAW_MATERIAL',
        unit: 'kg',
        cachedBalance: 200,
      },
    })
    testInventoryId = malt.id
    
    await testPrisma.inventoryLedger.create({
      data: {
        tenantId: TEST_TENANT_ID,
        itemId: malt.id,
        quantity: 200,
        type: 'PURCHASE',
        createdBy: TEST_USER_ID,
      },
    })
    
    await testPrisma.recipeIngredient.create({
      data: {
        recipeId: recipe.id,
        inventoryItemId: malt.id,
        name: 'Idempotent Malt',
        category: 'MALT',
        amount: 50,
        unit: 'kg',
      },
    })
    
    const tank = await testPrisma.tank.create({
      data: {
        tenantId: TEST_TENANT_ID,
        name: `FV-IDEMP-${Date.now()}`,
        type: 'FERMENTER',
        capacity: 500,
        status: 'AVAILABLE',
      },
    })
    testTankId = tank.id
  })

  afterEach(async () => {
    // Cleanup
    await testPrisma.batchTimeline.deleteMany({
      where: { batch: { tenantId: TEST_TENANT_ID, recipeId: testRecipeId } },
    })
    await testPrisma.batchIngredient.deleteMany({
      where: { batch: { tenantId: TEST_TENANT_ID, recipeId: testRecipeId } },
    })
    await testPrisma.inventoryLedger.deleteMany({
      where: { itemId: testInventoryId },
    })
    await testPrisma.batch.deleteMany({
      where: { recipeId: testRecipeId },
    })
    await testPrisma.tankOccupation.deleteMany({
      where: { tankId: testTankId },
    })
    await testPrisma.tank.delete({ where: { id: testTankId } })
    await testPrisma.recipeIngredient.deleteMany({
      where: { recipeId: testRecipeId },
    })
    await testPrisma.recipe.delete({ where: { id: testRecipeId } })
    await testPrisma.inventoryItem.delete({ where: { id: testInventoryId } })
    
    // Clear Redis idempotency keys
    try {
      const keys = await redis.keys(`idempotency:${TEST_TENANT_ID}:*`)
      if (keys.length > 0) {
        await redis.del(...keys)
      }
    } catch (error) {
      // Redis might not be available in tests
      console.warn('Could not clear Redis keys:', error)
    }
  })

  it('should return same result for duplicate requests with same idempotency key', async () => {
    const idempotencyKey = `test-key-${Date.now()}`
    const input = {
      recipeId: testRecipeId,
      tankId: testTankId,
      volume: 100,
      plannedDate: new Date(),
    }
    
    // First request
    const result1 = await batchService.create(
      TEST_TENANT_ID,
      TEST_USER_ID,
      input,
      idempotencyKey
    )
    
    // Second request with same key (simulates retry/duplicate)
    const result2 = await batchService.create(
      TEST_TENANT_ID,
      TEST_USER_ID,
      input,
      idempotencyKey
    )
    
    // Should return same batch ID
    expect(result1.batch.id).toBe(result2.batch.id)
    expect(result1.batch.batchNumber).toBe(result2.batch.batchNumber)
    
    // Verify only one batch was created
    const batches = await testPrisma.batch.findMany({
      where: { tenantId: TEST_TENANT_ID, recipeId: testRecipeId },
    })
    expect(batches).toHaveLength(1)
    
    // Verify inventory was only deducted once
    const item = await testPrisma.inventoryItem.findUnique({
      where: { id: testInventoryId },
    })
    expect(Number(item?.cachedBalance)).toBe(150) // 200 - 50 = 150
  })

  it('should create separate batches with different idempotency keys', async () => {
    const input = {
      recipeId: testRecipeId,
      tankId: testTankId,
      volume: 100,
      plannedDate: new Date(),
    }
    
    // First request
    const result1 = await batchService.create(
      TEST_TENANT_ID,
      TEST_USER_ID,
      input,
      `key-1-${Date.now()}`
    )
    
    // Need a new tank for second batch
    const tank2 = await testPrisma.tank.create({
      data: {
        tenantId: TEST_TENANT_ID,
        name: `FV-IDEMP2-${Date.now()}`,
        type: 'FERMENTER',
        capacity: 500,
        status: 'AVAILABLE',
      },
    })
    
    // Second request with different key
    const result2 = await batchService.create(
      TEST_TENANT_ID,
      TEST_USER_ID,
      { ...input, tankId: tank2.id },
      `key-2-${Date.now()}`
    )
    
    // Should create different batches
    expect(result1.batch.id).not.toBe(result2.batch.id)
    
    // Verify two batches were created
    const batches = await testPrisma.batch.findMany({
      where: { tenantId: TEST_TENANT_ID, recipeId: testRecipeId },
    })
    expect(batches).toHaveLength(2)
    
    // Cleanup extra tank
    await testPrisma.tankOccupation.deleteMany({ where: { tankId: tank2.id } })
    await testPrisma.tank.delete({ where: { id: tank2.id } })
  })
})



















