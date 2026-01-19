import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { testPrisma, TEST_TENANT_ID, TEST_USER_ID } from './setup'
import { BatchService } from '../services/batch.service'
import { TankUnavailableError, InsufficientInventoryError } from '../errors'

describe('Concurrency Tests', () => {
  let batchService: BatchService
  let testRecipeId: string
  let testTankId: string
  let testInventoryId: string

  beforeEach(async () => {
    batchService = new BatchService()
    
    // Create test recipe
    const recipe = await testPrisma.recipe.create({
      data: {
        tenantId: TEST_TENANT_ID,
        name: `Concurrent Recipe ${Date.now()}`,
        style: 'Lager',
        abv: 5.0,
        og: 1.050,
        fg: 1.010,
        batchSize: 100,
      },
    })
    testRecipeId = recipe.id
    
    // Create inventory with limited stock
    const malt = await testPrisma.inventoryItem.create({
      data: {
        tenantId: TEST_TENANT_ID,
        sku: `MALT-CONC-${Date.now()}`,
        name: 'Limited Malt',
        category: 'RAW_MATERIAL',
        unit: 'kg',
        cachedBalance: 50, // Only enough for one batch
      },
    })
    testInventoryId = malt.id
    
    await testPrisma.inventoryLedger.create({
      data: {
        tenantId: TEST_TENANT_ID,
        itemId: malt.id,
        quantity: 50,
        type: 'PURCHASE',
        createdBy: TEST_USER_ID,
      },
    })
    
    await testPrisma.recipeIngredient.create({
      data: {
        recipeId: recipe.id,
        inventoryItemId: malt.id,
        name: 'Limited Malt',
        category: 'MALT',
        amount: 50, // Exactly all available
        unit: 'kg',
      },
    })
    
    // Create tank
    const tank = await testPrisma.tank.create({
      data: {
        tenantId: TEST_TENANT_ID,
        name: `FV-CONC-${Date.now()}`,
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
  })

  it('should prevent double-booking of tank under concurrent requests', async () => {
    // Create second tank for parallel test
    const tank2 = await testPrisma.tank.create({
      data: {
        tenantId: TEST_TENANT_ID,
        name: `FV-CONC2-${Date.now()}`,
        type: 'FERMENTER',
        capacity: 500,
        status: 'AVAILABLE',
      },
    })
    
    // Add more inventory for parallel test
    await testPrisma.inventoryItem.update({
      where: { id: testInventoryId },
      data: { cachedBalance: 100 },
    })
    await testPrisma.inventoryLedger.create({
      data: {
        tenantId: TEST_TENANT_ID,
        itemId: testInventoryId,
        quantity: 50,
        type: 'PURCHASE',
        createdBy: TEST_USER_ID,
      },
    })
    
    // Launch 2 parallel batch creations for same tank
    const results = await Promise.allSettled([
      batchService.create(TEST_TENANT_ID, TEST_USER_ID, {
        recipeId: testRecipeId,
        tankId: testTankId, // Same tank!
        volume: 100,
        plannedDate: new Date(),
      }),
      batchService.create(TEST_TENANT_ID, TEST_USER_ID, {
        recipeId: testRecipeId,
        tankId: testTankId, // Same tank!
        volume: 100,
        plannedDate: new Date(),
      }),
    ])
    
    // One should succeed, one should fail
    const successes = results.filter(r => r.status === 'fulfilled')
    const failures = results.filter(r => r.status === 'rejected')
    
    expect(successes).toHaveLength(1)
    expect(failures).toHaveLength(1)
    
    // The failure should be TankUnavailableError
    const failedResult = failures[0] as PromiseRejectedResult
    expect(failedResult.reason).toBeInstanceOf(TankUnavailableError)
    
    // Cleanup
    await testPrisma.tank.delete({ where: { id: tank2.id } })
  })

  it('should prevent over-deduction of inventory under concurrent requests', async () => {
    // Create two tanks
    const tank2 = await testPrisma.tank.create({
      data: {
        tenantId: TEST_TENANT_ID,
        name: `FV-INV-${Date.now()}`,
        type: 'FERMENTER',
        capacity: 500,
        status: 'AVAILABLE',
      },
    })
    
    // Launch 2 parallel batch creations
    // Both need 50kg, but only 50kg available
    const results = await Promise.allSettled([
      batchService.create(TEST_TENANT_ID, TEST_USER_ID, {
        recipeId: testRecipeId,
        tankId: testTankId,
        volume: 100,
        plannedDate: new Date(),
      }),
      batchService.create(TEST_TENANT_ID, TEST_USER_ID, {
        recipeId: testRecipeId,
        tankId: tank2.id,
        volume: 100,
        plannedDate: new Date(),
      }),
    ])
    
    // One should succeed, one should fail
    const successes = results.filter(r => r.status === 'fulfilled')
    const failures = results.filter(r => r.status === 'rejected')
    
    expect(successes).toHaveLength(1)
    expect(failures).toHaveLength(1)
    
    // The failure should be InsufficientInventoryError
    const failedResult = failures[0] as PromiseRejectedResult
    expect(failedResult.reason).toBeInstanceOf(InsufficientInventoryError)
    
    // Verify inventory is exactly 0, not negative
    const item = await testPrisma.inventoryItem.findUnique({
      where: { id: testInventoryId },
    })
    expect(Number(item?.cachedBalance)).toBe(0)
    
    // Cleanup
    await testPrisma.tankOccupation.deleteMany({ where: { tankId: tank2.id } })
    await testPrisma.tank.delete({ where: { id: tank2.id } })
  })
})



















