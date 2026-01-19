import { prisma, PrismaTransactionClient } from '@brewery/database'
import type { 
  Batch, 
  BatchStatus, 
  BatchIngredient, 
  GravityReading, 
  BatchTimeline,
  TimelineEventType 
} from '../types'
import { EntityNotFoundError } from '../errors'

export class BatchRepository {
  /**
   * Get batch by ID with relations
   */
  async getById(
    tenantId: string,
    batchId: string,
    options?: { 
      includeIngredients?: boolean
      includeTimeline?: boolean
      includeGravityReadings?: boolean
    }
  ): Promise<Batch | null> {
    return prisma.batch.findUnique({
      where: { id: batchId, tenantId },
      include: {
        recipe: true,
        tank: true,
        ingredients: options?.includeIngredients ?? false,
        timeline: options?.includeTimeline ? {
          orderBy: { createdAt: 'desc' },
          take: 50,
        } : false,
        gravityReadings: options?.includeGravityReadings ? {
          orderBy: { recordedAt: 'desc' },
        } : false,
      },
    })
  }

  /**
   * Get batches with filters
   */
  async list(
    tenantId: string,
    options?: {
      status?: BatchStatus | BatchStatus[]
      recipeId?: string
      tankId?: string
      limit?: number
      offset?: number
    }
  ): Promise<Batch[]> {
    const statusFilter = options?.status
      ? Array.isArray(options.status)
        ? { in: options.status }
        : options.status
      : undefined

    return prisma.batch.findMany({
      where: {
        tenantId,
        ...(statusFilter && { status: statusFilter }),
        ...(options?.recipeId && { recipeId: options.recipeId }),
        ...(options?.tankId && { tankId: options.tankId }),
      },
      include: {
        recipe: { select: { id: true, name: true, style: true } },
        tank: { select: { id: true, name: true, type: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit ?? 50,
      skip: options?.offset ?? 0,
    })
  }

  /**
   * Generate unique batch number
   */
  async generateBatchNumber(
    tx: PrismaTransactionClient,
    tenantId: string
  ): Promise<string> {
    const result = await tx.$queryRaw<[{ generate_batch_number: string }]>`
      SELECT generate_batch_number(${tenantId}) as generate_batch_number
    `
    return result[0].generate_batch_number
  }

  /**
   * Create new batch
   */
  async create(
    tx: PrismaTransactionClient,
    data: {
      tenantId: string
      batchNumber: string
      recipeId: string
      tankId?: string
      volume: number
      targetOg?: number
      plannedDate: Date
      notes?: string
      createdBy: string
    }
  ): Promise<Batch> {
    return tx.batch.create({
      data: {
        tenantId: data.tenantId,
        batchNumber: data.batchNumber,
        recipeId: data.recipeId,
        tankId: data.tankId,
        volume: data.volume,
        targetOg: data.targetOg,
        plannedDate: data.plannedDate,
        notes: data.notes,
        createdBy: data.createdBy,
        status: 'PLANNED',
      },
      include: {
        recipe: true,
        tank: true,
      },
    })
  }

  /**
   * Update batch status
   */
  async updateStatus(
    tx: PrismaTransactionClient,
    tenantId: string,
    batchId: string,
    status: BatchStatus,
    additionalData?: Partial<Batch>
  ): Promise<Batch> {
    return tx.batch.update({
      where: { id: batchId, tenantId },
      data: {
        status,
        ...additionalData,
        updatedAt: new Date(),
      },
    })
  }

  /**
   * Add batch ingredients snapshot
   */
  async addIngredients(
    tx: PrismaTransactionClient,
    batchId: string,
    ingredients: Array<{
      inventoryItemId?: string
      name: string
      category: string
      plannedAmount: number
      unit: string
    }>
  ): Promise<void> {
    await tx.batchIngredient.createMany({
      data: ingredients.map(ing => ({
        batchId,
        inventoryItemId: ing.inventoryItemId,
        name: ing.name,
        category: ing.category as any,
        plannedAmount: ing.plannedAmount,
        unit: ing.unit,
      })),
    })
  }

  /**
   * Add timeline event
   */
  async addTimelineEvent(
    tx: PrismaTransactionClient,
    data: {
      batchId: string
      type: TimelineEventType
      title: string
      description?: string
      data?: Record<string, any>
      createdBy: string
    }
  ): Promise<BatchTimeline> {
    return tx.batchTimeline.create({
      data: {
        batchId: data.batchId,
        type: data.type,
        title: data.title,
        description: data.description,
        data: data.data,
        createdBy: data.createdBy,
      },
    })
  }

  /**
   * Add gravity reading
   */
  async addGravityReading(
    tx: PrismaTransactionClient,
    data: {
      batchId: string
      gravity: number
      temperature: number
      notes?: string
      recordedBy: string
    }
  ): Promise<GravityReading> {
    return tx.gravityReading.create({
      data: {
        batchId: data.batchId,
        gravity: data.gravity,
        temperature: data.temperature,
        notes: data.notes,
        recordedBy: data.recordedBy,
      },
    })
  }
}

export const batchRepository = new BatchRepository()



















