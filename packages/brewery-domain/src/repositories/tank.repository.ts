import { prisma, PrismaTransactionClient, withTenant } from '@brewery/database'
import type { Tank, TankStatus, TankOccupation, OccupationPhase } from '../types'
import { ConcurrentModificationError, EntityNotFoundError, TankUnavailableError } from '../errors'

export class TankRepository {
  /**
   * Get tank by ID with current status (tankId is actually equipmentId)
   */
  async getById(
    tenantId: string,
    tankId: string,
    tx?: PrismaTransactionClient
  ): Promise<Tank | null> {
    const db = tx || prisma
    const equipment = await db.equipment.findUnique({
      where: { id: tankId, tenantId },
    })
    
    if (!equipment) return null
    
    // Map Equipment to Tank format
    return {
      id: equipment.id,
      tenantId: equipment.tenantId,
      name: equipment.name,
      type: equipment.type as Tank['type'],
      capacity: equipment.capacity ? Number(equipment.capacity) : 0,
      status: this.mapEquipmentStatusToTankStatus(equipment.status || 'OPERATIONAL', equipment.currentBatchId),
      currentBatchId: equipment.currentBatchId || undefined,
      location: equipment.location || undefined,
      version: 0, // Equipment doesn't have version, use 0
      createdAt: equipment.createdAt,
      updatedAt: equipment.updatedAt,
      capabilities: equipment.capabilities || [],
    }
  }
  
  /**
   * Map EquipmentStatus to TankStatus
   */
  private mapEquipmentStatusToTankStatus(
    equipmentStatus: string,
    currentBatchId: string | null
  ): TankStatus {
    if (currentBatchId) return 'OCCUPIED'
    
    switch (equipmentStatus) {
      case 'OPERATIONAL':
        return 'AVAILABLE'
      case 'NEEDS_CIP':
        return 'CLEANING'
      case 'UNDER_MAINTENANCE':
      case 'NEEDS_MAINTENANCE':
        return 'MAINTENANCE'
      case 'OUT_OF_SERVICE':
        return 'OUT_OF_SERVICE'
      default:
        return 'AVAILABLE'
    }
  }
  
  /**
   * Map TankStatus to EquipmentStatus
   */
  private mapTankStatusToEquipmentStatus(tankStatus: TankStatus): 'OPERATIONAL' | 'NEEDS_CIP' | 'UNDER_MAINTENANCE' | 'OUT_OF_SERVICE' {
    switch (tankStatus) {
      case 'AVAILABLE':
        return 'OPERATIONAL'
      case 'OCCUPIED':
        return 'OPERATIONAL' // Will be set with currentBatchId
      case 'CLEANING':
        return 'NEEDS_CIP'
      case 'MAINTENANCE':
        return 'UNDER_MAINTENANCE'
      case 'OUT_OF_SERVICE':
        return 'OUT_OF_SERVICE'
      default:
        return 'OPERATIONAL'
    }
  }

  /**
   * Get available tanks with optional capacity filter (tankId is actually equipmentId)
   */
  async getAvailable(
    tenantId: string,
    options?: { 
      minCapacity?: number
      type?: Tank['type']
    }
  ): Promise<Tank[]> {
    const equipmentList = await prisma.equipment.findMany({
      where: {
        tenantId,
        status: 'OPERATIONAL',
        currentBatchId: null, // Available = no current batch
        ...(options?.minCapacity && { capacity: { gte: options.minCapacity } }),
        ...(options?.type && { type: options.type }),
      },
      orderBy: { capacity: 'asc' },
    })
    
    // Map Equipment to Tank format
    return equipmentList.map(eq => ({
      id: eq.id,
      tenantId: eq.tenantId,
      name: eq.name,
      type: eq.type as Tank['type'],
      capacity: eq.capacity ? Number(eq.capacity) : 0,
      status: 'AVAILABLE' as TankStatus,
      currentBatchId: undefined,
      location: eq.location || undefined,
      version: 0,
      createdAt: eq.createdAt,
      updatedAt: eq.updatedAt,
      capabilities: eq.capabilities || [],
    }))
  }

  /**
   * Lock equipment for update (prevents concurrent modifications)
   * MUST be called within a transaction
   * tankId is actually equipmentId
   */
  async lockForUpdate(
    tx: PrismaTransactionClient,
    tenantId: string,
    tankId: string
  ): Promise<Tank> {
    const results = await tx.$queryRaw<any[]>`
      SELECT * FROM "Equipment"
      WHERE "tenantId" = ${tenantId}
      AND id = ${tankId}
      FOR UPDATE
    `
    
    if (results.length === 0) {
      throw new EntityNotFoundError('Tank', tankId)
    }
    
    const equipment = results[0]
    
    // Map Equipment to Tank format
    return {
      id: equipment.id,
      tenantId: equipment.tenantId,
      name: equipment.name,
      type: equipment.type,
      capacity: equipment.capacity ? Number(equipment.capacity) : 0,
      status: this.mapEquipmentStatusToTankStatus(equipment.status || 'OPERATIONAL', equipment.currentBatchId),
      currentBatchId: equipment.currentBatchId || undefined,
      location: equipment.location || undefined,
      version: 0, // Equipment doesn't have version
      createdAt: equipment.createdAt,
      updatedAt: equipment.updatedAt,
      capabilities: equipment.capabilities || [],
    }
  }

  /**
   * Acquire equipment for batch (tankId is actually equipmentId)
   * Returns updated tank or throws error
   * Note: Equipment doesn't have version field, so we skip optimistic locking
   */
  async acquire(
    tx: PrismaTransactionClient,
    tenantId: string,
    tankId: string,
    batchId: string,
    phase: OccupationPhase
  ): Promise<Tank> {
    // Lock and get current state
    const tank = await this.lockForUpdate(tx, tenantId, tankId)
    
    if (tank.status !== 'AVAILABLE') {
      throw new TankUnavailableError(tankId, tank.name, tank.status)
    }
    
    // Update equipment (no version check since Equipment doesn't have version)
    const updated = await tx.equipment.updateMany({
      where: {
        id: tankId,
        tenantId,
        status: 'OPERATIONAL',
        currentBatchId: null, // Must be available
      },
      data: {
        status: 'OPERATIONAL', // Keep OPERATIONAL, set currentBatchId instead
        currentBatchId: batchId,
        updatedAt: new Date(),
      },
    })
    
    if (updated.count === 0) {
      throw new ConcurrentModificationError('Tank', tankId)
    }
    
    // Record occupation (TankOccupation still uses tankId which is equipmentId)
    await tx.tankOccupation.create({
      data: {
        tenantId,
        tankId,
        batchId,
        phase,
        startedAt: new Date(),
      },
    })
    
    return {
      ...tank,
      status: 'OCCUPIED',
      currentBatchId: batchId,
      version: 0, // Equipment doesn't have version
    }
  }

  /**
   * Release equipment (make available or set to cleaning)
   * tankId is actually equipmentId
   */
  async release(
    tx: PrismaTransactionClient,
    tenantId: string,
    tankId: string,
    newStatus: TankStatus = 'CLEANING'
  ): Promise<Tank> {
    const tank = await this.lockForUpdate(tx, tenantId, tankId)
    
    // Close current occupation
    await tx.tankOccupation.updateMany({
      where: {
        tenantId,
        tankId,
        endedAt: null,
      },
      data: {
        endedAt: new Date(),
      },
    })
    
    // Map TankStatus to EquipmentStatus
    const equipmentStatus = this.mapTankStatusToEquipmentStatus(newStatus)
    
    // Update equipment
    const updated = await tx.equipment.update({
      where: { id: tankId, tenantId },
      data: {
        status: equipmentStatus,
        currentBatchId: null,
        updatedAt: new Date(),
      },
    })
    
    // Map back to Tank format
    return {
      id: updated.id,
      tenantId: updated.tenantId,
      name: updated.name,
      type: updated.type as Tank['type'],
      capacity: updated.capacity ? Number(updated.capacity) : 0,
      status: newStatus,
      currentBatchId: undefined,
      location: updated.location || undefined,
      version: 0,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      capabilities: updated.capabilities || [],
    }
  }

  /**
   * Get tank occupation history
   */
  async getOccupationHistory(
    tenantId: string,
    tankId: string,
    options?: { limit?: number }
  ): Promise<TankOccupation[]> {
    return prisma.tankOccupation.findMany({
      where: { tenantId, tankId },
      orderBy: { startedAt: 'desc' },
      take: options?.limit ?? 20,
    })
  }
}

export const tankRepository = new TankRepository()







