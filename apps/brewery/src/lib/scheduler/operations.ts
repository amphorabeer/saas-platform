// ============================================
// TANK SCHEDULER - API OPERATIONS
// ============================================

import { prisma } from '@saas-platform/database'
import {
  checkTankAvailability,
  getAvailableTanks,
  validateBlending,
  validateSplit,
  validateTransfer,
} from './validation'
import { generateLotNumber } from '../lot-helpers'

// ============================================
// 1. PLAN FERMENTATION
// ============================================

export interface PlanFermentationInput {
  tenantId: string
  createdBy: string
  
  // Batches to ferment
  batchIds: string[]          // One or more batches
  volumeAllocations?: number[] // Volume from each batch (optional, defaults to full)
  
  // Tank assignment
  tankId: string
  plannedStart: Date
  plannedEnd: Date
  plannedVolume: number
  
  // Options
  enableSplit?: boolean       // Split single batch across multiple tanks
  splitDestinations?: {       // If splitting, define destinations
    tankId: string
    volumePercent: number
    plannedStart: Date
    plannedEnd: Date
  }[]
  
  notes?: string
}

export async function planFermentation(input: PlanFermentationInput) {
  const { tenantId, createdBy, batchIds, tankId, plannedStart, plannedEnd, plannedVolume, notes } = input
  
  // 1. Validate batches exist and are ready
  const batches = await prisma.batch.findMany({
    where: { id: { in: batchIds }, tenantId },
  })
  
  if (batches.length !== batchIds.length) {
    throw new Error('One or more batches not found')
  }
  
  const invalidBatches = batches.filter(b => !['PLANNED', 'BREWING'].includes(b.status))
  if (invalidBatches.length > 0) {
    throw new Error(`Batches not ready for fermentation: ${invalidBatches.map(b => b.batchNumber).join(', ')}`)
  }
  
  // 2. Handle split fermentation
  if (input.enableSplit && input.splitDestinations?.length) {
    return await planSplitFermentation(input)
  }
  
  // 3. Validate tank availability (PLANNED = OCCUPIED)
  const availability = await checkTankAvailability(tenantId, {
    tankId,
    timeRange: { start: plannedStart, end: plannedEnd },
    volume: plannedVolume,
  })
  
  if (!availability.valid) {
    throw new Error(`Tank not available: ${availability.errors.join(', ')}`)
  }
  
  // 4. Create lot and assignment in transaction
  const result = await prisma.$transaction(async (tx) => {
    // Generate lot code
    const lotCode = await generateLotNumber(tenantId, 'FERMENTATION')
    
    // Create lot
    const lot = await tx.lot.create({
      data: {
        id: crypto.randomUUID(),
        tenantId,
        lotCode,
        phase: 'FERMENTATION',
        status: 'PLANNED',
        plannedVolume,
        notes,
        createdBy,
        updatedAt: new Date(),
      },
    })
    
    // Link batches to lot
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i]
      const volumeContribution = input.volumeAllocations?.[i] || Number(batch.volume || 0)
      
      await tx.lotBatch.create({
        data: {
          id: crypto.randomUUID(),
          lotId: lot.id,
          batchId: batch.id,
          volumeContribution,
          batchPercentage: 100, // Full batch
        },
      })
      
      // Update batch status
      await tx.batch.update({
        where: { id: batch.id },
        data: { status: 'FERMENTING' },
      })
    }
    
    // Create tank assignment
    const assignment = await tx.tankAssignment.create({
      data: {
        id: crypto.randomUUID(),
        tenantId,
        tankId,
        lotId: lot.id,
        phase: 'FERMENTATION',
        plannedStart,
        plannedEnd,
        status: 'PLANNED',
        plannedVolume,
        createdBy,
        updatedAt: new Date(),
      },
    })
    
    // Update tank current lot (cache)
    await tx.tank.update({
      where: { id: tankId },
      data: {
        currentLotId: lot.id,
        currentPhase: 'FERMENTATION',
      },
    })
    
    return { lot, assignment }
  })
  
  return result
}

/**
 * Plan split fermentation (one batch -> multiple tanks)
 */
async function planSplitFermentation(input: PlanFermentationInput) {
  const { tenantId, createdBy, batchIds, splitDestinations, notes } = input
  
  if (batchIds.length !== 1) {
    throw new Error('Split fermentation requires exactly one batch')
  }
  
  if (!splitDestinations?.length) {
    throw new Error('Split destinations required')
  }
  
  // Validate split percentages
  const totalPercent = splitDestinations.reduce((sum, d) => sum + d.volumePercent, 0)
  if (totalPercent > 100) {
    throw new Error(`Split percentages exceed 100% (${totalPercent}%)`)
  }
  
  // Get batch
  const batch = await prisma.batch.findUnique({
    where: { id: batchIds[0] },
  })
  
  if (!batch) throw new Error('Batch not found')
  
  const batchVolume = Number(batch.volume || 0)
  
  // Validate all destination tanks
  for (const dest of splitDestinations) {
    const destVolume = batchVolume * (dest.volumePercent / 100)
    const availability = await checkTankAvailability(tenantId, {
      tankId: dest.tankId,
      timeRange: { start: dest.plannedStart, end: dest.plannedEnd },
      volume: destVolume,
    })
    
    if (!availability.valid) {
      const tank = await prisma.equipment.findUnique({ where: { id: dest.tankId } })
      throw new Error(`Tank ${tank?.name} not available: ${availability.errors.join(', ')}`)
    }
  }
  
  // Create lots and assignments in transaction
  const result = await prisma.$transaction(async (tx) => {
    const lots = []
    const assignments = []
    
    for (const dest of splitDestinations) {
      const splitVolume = batchVolume * (dest.volumePercent / 100)
      const lotCode = await generateLotNumber(tenantId, 'FERMENTATION')
      
      // Create lot
      const lot = await tx.lot.create({
        data: {
          id: crypto.randomUUID(),
          tenantId,
          lotCode,
          phase: 'FERMENTATION',
          status: 'PLANNED',
          plannedVolume: splitVolume,
          splitRatio: dest.volumePercent / 100,
          notes: `Split ${dest.volumePercent}% from ${batch.batchNumber}. ${notes || ''}`,
          createdBy,
          updatedAt: new Date(),
        },
      })
      
      // Link batch to lot (partial)
      await tx.lotBatch.create({
        data: {
          id: crypto.randomUUID(),
          lotId: lot.id,
          batchId: batch.id,
          volumeContribution: splitVolume,
          batchPercentage: dest.volumePercent,
        },
      })
      
      // Create assignment
      const assignment = await tx.tankAssignment.create({
        data: {
          id: crypto.randomUUID(),
          tenantId,
          tankId: dest.tankId,
          lotId: lot.id,
          phase: 'FERMENTATION',
          plannedStart: dest.plannedStart,
          plannedEnd: dest.plannedEnd,
          status: 'PLANNED',
          plannedVolume: splitVolume,
          createdBy,
          updatedAt: new Date(),
        },
      })
      
      lots.push(lot)
      assignments.push(assignment)
    }
    
    // Update batch status
    await tx.batch.update({
      where: { id: batch.id },
      data: { status: 'FERMENTING' },
    })
    
    return { lots, assignments }
  })
  
  return result
}

// ============================================
// 2. PLAN TRANSFER (with optional merge)
// ============================================

export interface PlanTransferInput {
  tenantId: string
  createdBy: string
  
  // Source(s)
  sourceLotIds: string[]      // Can be multiple for merge
  sourceVolumes: number[]     // Volume from each source
  
  // Destination
  destTankId: string
  destLotId?: string          // Existing lot for blending (optional)
  createNewLot: boolean       // If true, create new lot at destination
  
  // Transfer details
  transferType: 'FERMENT_TO_CONDITION' | 'CONDITION_TO_BRIGHT' | 'TANK_TO_TANK'
  plannedAt: Date
  
  // New lot details (if createNewLot)
  newLotPhase?: 'CONDITIONING' | 'BRIGHT'
  newLotPlannedStart?: Date
  newLotPlannedEnd?: Date
  
  // Blending options
  enableBlending?: boolean    // Must be explicitly enabled
  
  notes?: string
}

export async function planTransfer(input: PlanTransferInput) {
  const {
    tenantId, createdBy, sourceLotIds, sourceVolumes,
    destTankId, destLotId, createNewLot,
    transferType, plannedAt, newLotPhase, newLotPlannedStart, newLotPlannedEnd,
    enableBlending, notes
  } = input
  
  const totalVolume = sourceVolumes.reduce((sum, v) => sum + v, 0)
  
  // 1. Check if this is a merge/blend operation
  if (sourceLotIds.length > 1 || destLotId) {
    if (!enableBlending) {
      throw new Error('Blending must be explicitly enabled for merge operations')
    }
    
    // Validate blending
    const blendValidation = await validateBlending(tenantId, {
      destTankId,
      destLotId,
      sourceLotIds,
      sourceVolumes,
      targetPhase: newLotPhase || 'CONDITIONING',
      timeRange: { start: newLotPlannedStart || plannedAt, end: newLotPlannedEnd || plannedAt },
    })
    
    if (!blendValidation.valid) {
      throw new Error(`Blending validation failed: ${blendValidation.errors.join(', ')}`)
    }
  }
  
  // 2. Get source lots
  const sourceLots = await prisma.lot.findMany({
    where: { id: { in: sourceLotIds } },
    include: {
      TankAssignment: { where: { status: 'ACTIVE' }, take: 1 },
      LotBatch: { include: { Batch: true } },
    },
  })
  
  if (sourceLots.length !== sourceLotIds.length) {
    throw new Error('One or more source lots not found')
  }
  
  // 3. Determine destination lot
  let destLot: any = null
  
  if (destLotId) {
    // Blending into existing lot
    destLot = await prisma.lot.findUnique({
      where: { id: destLotId },
      include: { TankAssignment: { where: { tankId: destTankId } } },
    })
    
    if (!destLot) throw new Error('Destination lot not found')
    
  } else if (createNewLot) {
    // Validate destination tank
    const availability = await checkTankAvailability(tenantId, {
      tankId: destTankId,
      timeRange: { start: newLotPlannedStart!, end: newLotPlannedEnd! },
      volume: totalVolume,
    })
    
    if (!availability.valid) {
      throw new Error(`Destination tank not available: ${availability.errors.join(', ')}`)
    }
  }
  
  // 4. Create transfer(s) and optionally new lot in transaction
  const result = await prisma.$transaction(async (tx) => {
    const transfers = []
    
    // Create new destination lot if needed
    if (createNewLot && !destLotId) {
      const lotCode = await generateLotNumber(tenantId, newLotPhase! as 'FERMENTATION' | 'CONDITIONING' | 'BRIGHT' | 'PACKAGING')
      
      destLot = await tx.lot.create({
        data: {
          id: crypto.randomUUID(),
          tenantId,
          lotCode,
          phase: newLotPhase!,
          status: 'PLANNED',
          plannedVolume: totalVolume,
          // Link to parent lot if single source
          parentLotId: sourceLotIds.length === 1 ? sourceLotIds[0] : null,
          notes,
          createdBy,
          updatedAt: new Date(),
        },
      })
      
      // Create assignment for new lot
      await tx.tankAssignment.create({
        data: {
          id: crypto.randomUUID(),
          tenantId,
          tankId: destTankId,
          lotId: destLot.id,
          phase: newLotPhase!,
          plannedStart: newLotPlannedStart!,
          plannedEnd: newLotPlannedEnd!,
          status: 'PLANNED',
          plannedVolume: totalVolume,
          createdBy,
          updatedAt: new Date(),
        },
      })
      
      // Copy batch links from source lots
      const allBatchLinks = sourceLots.flatMap(sl => sl.LotBatch)
      for (const link of allBatchLinks) {
        const sourceIndex = sourceLots.findIndex(sl => sl.id === link.lotId)
        const sourceVolume = sourceVolumes[sourceIndex]
        const volumeRatio = sourceVolume / Number(sourceLots[sourceIndex].plannedVolume)
        
        await tx.lotBatch.create({
          data: {
            id: crypto.randomUUID(),
            lotId: destLot.id,
            batchId: link.batchId,
            volumeContribution: Number(link.volumeContribution) * volumeRatio,
            batchPercentage: Number(link.batchPercentage) * volumeRatio,
          },
        })
      }
    }
    
    // Create transfer records
    for (let i = 0; i < sourceLots.length; i++) {
      const sourceLot = sourceLots[i]
      const volume = sourceVolumes[i]
      const sourceTankId = sourceLot.TankAssignment[0]?.tankId
      
      if (!sourceTankId) {
        throw new Error(`Source lot ${sourceLot.id} has no active tank assignment`)
      }
      
      // Generate transfer code
      const transferCode = `TRF-${Date.now()}-${i + 1}`
      
      const transfer = await tx.transfer.create({
        data: {
          id: crypto.randomUUID(),
          tenantId,
          transferCode,
          sourceLotId: sourceLot.id,
          sourceTankId,
          destLotId: destLot?.id || null,
          destTankId,
          transferType: sourceLotIds.length > 1 ? "BLEND" : transferType,
          volume,
          plannedAt: plannedAt || new Date(),
          notes,
        },
      })
      
      transfers.push(transfer)
    }
    
    return { destLot, transfers }
  })
  
  return result
}

// ============================================
// 3. EXECUTE OPERATIONS
// ============================================

/**
 * Start a planned lot (PLANNED -> ACTIVE)
 */
export async function startLot(
  assignmentId: string,
  actualStart: Date,
  actualVolume?: number
) {
  const assignment = await prisma.tankAssignment.findUnique({
    where: { id: assignmentId },
    include: { Lot: true },
  })
  
  if (!assignment) throw new Error('Assignment not found')
  if (assignment.status !== 'PLANNED') {
    throw new Error(`Cannot start assignment with status ${assignment.status}`)
  }
  
  return await prisma.$transaction(async (tx) => {
    // Update assignment
    await tx.tankAssignment.update({
      where: { id: assignmentId },
      data: {
        status: 'ACTIVE',
        actualVolume: actualVolume || assignment.plannedVolume,
      },
    })
    
    // Update lot
    await tx.lot.update({
      where: { id: assignment.lotId },
      data: {
        status: 'ACTIVE',
        actualVolume: actualVolume || assignment.Lot.plannedVolume,
      },
    })
    
    // Update tank cache
    await tx.tank.update({
      where: { id: assignment.tankId },
      data: {
        currentLotId: assignment.lotId,
        currentPhase: assignment.phase,
      },
    })
    
    return { success: true }
  })
}

/**
 * Complete a lot (ACTIVE -> COMPLETED)
 */
export async function completeLot(
  assignmentId: string,
  actualEnd: Date,
  finalVolume?: number
) {
  const assignment = await prisma.tankAssignment.findUnique({
    where: { id: assignmentId },
    include: { Lot: true },
  })
  
  if (!assignment) throw new Error('Assignment not found')
  if (assignment.status !== 'ACTIVE') {
    throw new Error(`Cannot complete assignment with status ${assignment.status}`)
  }
  
  return await prisma.$transaction(async (tx) => {
    // Update assignment
    await tx.tankAssignment.update({
      where: { id: assignmentId },
      data: {
        actualVolume: finalVolume || assignment.actualVolume,
      },
    })
    
    // Update lot
    await tx.lot.update({
      where: { id: assignment.lotId },
      data: {
        actualVolume: finalVolume || assignment.Lot.actualVolume,
      },
    })
    
    // Clear tank cache
    await tx.tank.update({
      where: { id: assignment.tankId },
      data: {
        currentLotId: null,
        currentPhase: null,
        status: 'CLEANING', // Tank needs cleaning
      },
    })
    
    return { success: true }
  })
}

/**
 * Execute a planned transfer
 */
export async function executeTransfer(
  transferId: string,
  executedAt: Date,
  actualVolume: number,
  measuredLoss?: number,
  performedBy?: string
) {
  const transfer = await prisma.transfer.findUnique({
    where: { id: transferId },
    include: {
      Lot_Transfer_sourceLotIdToLot: { include: { TankAssignment: true } },
      Lot_Transfer_destLotIdToLot: { include: { TankAssignment: true } },
    },
  })
  
  if (!transfer) throw new Error('Transfer not found')
  
  return await prisma.$transaction(async (tx) => {
    // Update transfer
    await tx.transfer.update({
      where: { id: transferId },
      data: {
        executedAt: new Date(),
      },
    })
    
    // Update source lot volume
    if (transfer.Lot_Transfer_sourceLotIdToLot) {
      const currentVolume = Number(transfer.Lot_Transfer_sourceLotIdToLot.actualVolume || transfer.Lot_Transfer_sourceLotIdToLot.plannedVolume)
      const newVolume = currentVolume - actualVolume - (measuredLoss || 0)
      
      await tx.lot.update({
        where: { id: transfer.sourceLotId! },
        data: { actualVolume: Math.max(0, newVolume) },
      })
    }
    
    // Update dest lot volume
    if (transfer.Lot_Transfer_destLotIdToLot) {
      const currentVolume = Number(transfer.Lot_Transfer_destLotIdToLot.actualVolume || 0)
      
      await tx.lot.update({
        where: { id: transfer.destLotId! },
        data: { actualVolume: currentVolume + actualVolume },
      })
    }
    
    return { success: true }
  })
}

// ============================================
// 4. QUERY HELPERS
// ============================================

/**
 * Get available tanks for planning
 */
export async function getAvailableTanksForPlanning(
  tenantId: string,
  phase: 'FERMENTATION' | 'CONDITIONING' | 'BRIGHT',
  timeRange: { start: Date; end: Date },
  minVolume?: number,
  excludeTankIds?: string[]
) {
  const tanks = await getAvailableTanks(tenantId, timeRange, phase, minVolume)
  
  if (excludeTankIds?.length) {
    return tanks.filter(t => !excludeTankIds.includes(t.id))
  }
  
  return tanks
}

/**
 * Get lots available for blending
 */
export async function getLotsAvailableForBlending(
  tenantId: string,
  targetPhase: 'FERMENTATION' | 'CONDITIONING' | 'BRIGHT',
  targetTankId?: string
) {
  return await prisma.lot.findMany({
    where: {
      tenantId,
      phase: targetPhase,
      status: 'ACTIVE',
      // If targeting specific tank, only show lots in that tank
      ...(targetTankId ? {
        TankAssignment: { some: { tankId: targetTankId, status: 'ACTIVE' } },
      } : {}),
    },
    include: {
      LotBatch: { include: { Batch: { include: { recipe: true } } } },
      TankAssignment: {
        where: { status: 'ACTIVE' },
        include: { Tank: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
}
