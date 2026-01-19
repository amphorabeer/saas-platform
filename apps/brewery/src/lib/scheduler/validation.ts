// ============================================
// TANK SCHEDULER - CORE VALIDATION LOGIC
// ============================================

import { prisma } from '@saas-platform/database'

// Types
export interface TimeRange {
  start: Date
  end: Date
}

export interface TankAvailabilityCheck {
  tankId: string
  timeRange: TimeRange
  excludeLotId?: string // Exclude when updating existing lot
  volume?: number
}

export interface BlendingRequest {
  destTankId: string
  destLotId?: string // Existing lot to blend into
  sourceLotIds: string[]
  sourceVolumes: number[]
  targetPhase: 'FERMENTATION' | 'CONDITIONING' | 'BRIGHT'
  timeRange: TimeRange
}

export interface SplitRequest {
  sourceLotId: string
  sourceTankId: string
  destinations: {
    tankId: string
    volumePercent: number // e.g., 60 for 60%
    timeRange: TimeRange
  }[]
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

// ============================================
// 1. OVERLAP DETECTION
// ============================================

/**
 * Check if two time ranges overlap
 * Overlap exists when: newStart < existingEnd AND newEnd > existingStart
 */
export function hasTimeOverlap(range1: TimeRange, range2: TimeRange): boolean {
  return range1.start < range2.end && range1.end > range2.start
}

/**
 * Get all overlapping assignments for a tank in a time range
 */
export async function getOverlappingAssignments(
  tenantId: string,
  tankId: string,
  timeRange: TimeRange,
  excludeLotId?: string
): Promise<any[]> {
  const overlapping = await prisma.tankAssignment.findMany({
    where: {
      tenantId,
      tankId,
      status: { in: ['PLANNED', 'ACTIVE'] }, // PLANNED = OCCUPIED!
      // Overlap condition: newStart < existingEnd AND newEnd > existingStart
      AND: [
        { plannedStart: { lt: timeRange.end } },
        { plannedEnd: { gt: timeRange.start } },
      ],
      // Exclude the lot we're updating (if any)
      ...(excludeLotId ? { lotId: { not: excludeLotId } } : {}),
    },
    include: {
      Lot: true,
      Tank: true,
    },
  })
  
  return overlapping
}

/**
 * Check if a tank is available for a new assignment
 * RULE: PLANNED = OCCUPIED - both PLANNED and ACTIVE block the tank
 */
export async function checkTankAvailability(
  tenantId: string,
  check: TankAvailabilityCheck
): Promise<ValidationResult> {
  const errors: string[] = []
  const warnings: string[] = []
  
  // 1. Get tank details
  const tank = await prisma.tank.findUnique({
    where: { id: check.tankId },
  })
  
  if (!tank) {
    return { valid: false, errors: ['Tank not found'], warnings: [] }
  }
  
  // 2. Check tank status
  if (tank.status !== 'AVAILABLE') {
    errors.push(`Tank ${tank.name} is not available (status: ${tank.status})`)
  }
  
  // 3. Check for overlapping assignments
  const overlapping = await getOverlappingAssignments(
    tenantId,
    check.tankId,
    check.timeRange,
    check.excludeLotId
  )
  
  if (overlapping.length > 0) {
    const conflictDetails = overlapping.map(a => {
      const lotCode = a.Lot?.lotCode || 'Unknown'
      const start = a.plannedStart.toISOString().split('T')[0]
      const end = a.plannedEnd.toISOString().split('T')[0]
      return `${lotCode} (${start} - ${end})`
    }).join(', ')
    
    errors.push(`Tank ${tank.name} has overlapping assignments: ${conflictDetails}`)
  }
  
  // 4. Check capacity if volume provided
  if (check.volume && tank.capacity) {
    const capacity = Number(tank.capacity)
    const minFill = (tank.minFillPercent || 20) / 100 * capacity
    const maxFill = (tank.maxFillPercent || 95) / 100 * capacity
    
    if (check.volume < minFill) {
      warnings.push(`Volume ${check.volume}L is below minimum fill (${minFill}L / ${tank.minFillPercent}%)`)
    }
    
    if (check.volume > maxFill) {
      errors.push(`Volume ${check.volume}L exceeds maximum fill (${maxFill}L / ${tank.maxFillPercent}%)`)
    }
    
    if (check.volume > capacity) {
      errors.push(`Volume ${check.volume}L exceeds tank capacity (${capacity}L)`)
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Get available tanks for a time range and phase
 */
export async function getAvailableTanks(
  tenantId: string,
  timeRange: TimeRange,
  phase: 'FERMENTATION' | 'CONDITIONING' | 'BRIGHT',
  minVolume?: number
): Promise<any[]> {
  // 1. Get all tanks with the required capability
  const capabilityMap: Record<string, string> = {
    FERMENTATION: 'FERMENTATION',
    CONDITIONING: 'CONDITIONING',
    BRIGHT: 'SERVING',
  }
  
  const allTanks = await prisma.tank.findMany({
    where: {
      tenantId,
      status: { in: ['AVAILABLE', 'OCCUPIED'] }, // Include occupied for blending
      ...(minVolume ? { capacity: { gte: minVolume } } : {}),
    },
  })
  
  // 2. Filter out tanks with overlapping assignments
  const availableTanks = []
  
  for (const tank of allTanks) {
    const overlapping = await getOverlappingAssignments(
      tenantId,
      tank.id,
      timeRange
    )
    
    if (overlapping.length === 0) {
      availableTanks.push(tank)
    }
  }
  
  return availableTanks
}

// ============================================
// 2. BLENDING VALIDATION
// ============================================

/**
 * Validate a blending operation
 */
export async function validateBlending(
  tenantId: string,
  request: BlendingRequest
): Promise<ValidationResult> {
  const errors: string[] = []
  const warnings: string[] = []
  
  // 1. Get blending configuration
  const config = await prisma.blendingConfig.findUnique({
    where: { tenantId },
  }) || {
    requireRecipeMatch: false,
    requireYeastMatch: true,
    requirePhaseMatch: true,
    requireStyleMatch: false,
    maxBlendSources: 4,
    allowOverCapacity: false,
    maxAgeDifferenceHours: 48,
  }
  
  // 2. Check max sources
  if (request.sourceLotIds.length > config.maxBlendSources) {
    errors.push(`Cannot blend more than ${config.maxBlendSources} sources`)
  }
  
  // 3. Get source lots with details
  const sourceLots = await prisma.lot.findMany({
    where: {
      id: { in: request.sourceLotIds },
    },
    include: {
      LotBatch: {
        include: {
          Batch: {
            include: { recipe: true },
          },
        },
      },
      TankAssignment: {
        where: { status: { in: ['PLANNED', 'ACTIVE'] } },
      },
    },
  })
  
  if (sourceLots.length !== request.sourceLotIds.length) {
    errors.push('One or more source lots not found')
    return { valid: false, errors, warnings }
  }
  
  // 4. Phase match check
  if (config.requirePhaseMatch) {
    const phases = new Set(sourceLots.map(l => l.phase))
    if (phases.size > 1) {
      errors.push('Cannot blend lots in different phases')
    }
    if (!phases.has(request.targetPhase)) {
      errors.push(`Source lots are not in ${request.targetPhase} phase`)
    }
  }
  
  // 5. Recipe/Yeast/Style match checks
  const allBatches = sourceLots.flatMap(l => l.LotBatch.map(lb => lb.Batch))
  
  if (config.requireRecipeMatch && allBatches.length > 0) {
    const recipes = new Set(allBatches.map(b => b.recipeId))
    if (recipes.size > 1) {
      errors.push('Cannot blend different recipes (requireRecipeMatch is ON)')
    }
  }
  
  if (config.requireYeastMatch && allBatches.length > 0) {
    const yeasts = new Set(allBatches.map(b => b.recipe?.yeastStrain).filter(Boolean))
    if (yeasts.size > 1) {
      errors.push('Cannot blend different yeast strains (requireYeastMatch is ON)')
    }
  }
  
  if (config.requireStyleMatch && allBatches.length > 0) {
    const styles = new Set(allBatches.map(b => b.recipe?.style).filter(Boolean))
    if (styles.size > 1) {
      errors.push('Cannot blend different beer styles (requireStyleMatch is ON)')
    }
  }
  
  // 6. Destination tank capacity check
  const destTank = await prisma.equipment.findUnique({
    where: { id: request.destTankId },
  })
  
  if (!destTank) {
    errors.push('Destination tank not found')
    return { valid: false, errors, warnings }
  }
  
  const totalVolume = request.sourceVolumes.reduce((sum, v) => sum + v, 0)
  
  // If blending into existing lot, add its current volume
  let existingVolume = 0
  if (request.destLotId) {
    const existingLot = await prisma.lot.findUnique({
      where: { id: request.destLotId },
    })
    existingVolume = Number(existingLot?.actualVolume || existingLot?.plannedVolume || 0)
  }
  
  const finalVolume = existingVolume + totalVolume
  
  if (destTank.capacity && finalVolume > destTank.capacity) {
    if (!config.allowOverCapacity) {
      errors.push(`Total volume ${finalVolume}L exceeds tank capacity ${destTank.capacity}L`)
    } else {
      warnings.push(`Total volume ${finalVolume}L exceeds tank capacity ${destTank.capacity}L (allowed by config)`)
    }
  }
  
  // 7. Check destination tank availability (unless blending into same existing lot)
  if (!request.destLotId) {
    const availability = await checkTankAvailability(tenantId, {
      tankId: request.destTankId,
      timeRange: request.timeRange,
      volume: finalVolume,
    })
    
    errors.push(...availability.errors)
    warnings.push(...availability.warnings)
  }
  
  // 8. Age difference check
  if (config.maxAgeDifferenceHours > 0) {
    const startDates = sourceLots
      .flatMap(l => l.TankAssignment.map(a => a.actualStart || a.plannedStart))
      .filter(Boolean) as Date[]
    
    if (startDates.length > 1) {
      const minDate = Math.min(...startDates.filter(d => d !== null).map(d => d!.getTime()))
      const maxDate = Math.max(...startDates.filter(d => d !== null).map(d => d!.getTime()))
      const diffHours = (maxDate - minDate) / (1000 * 60 * 60)
      
      if (diffHours > config.maxAgeDifferenceHours) {
        warnings.push(`Lots have ${Math.round(diffHours)}h age difference (max: ${config.maxAgeDifferenceHours}h)`)
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

// ============================================
// 3. SPLIT VALIDATION
// ============================================

/**
 * Validate a split operation
 */
export async function validateSplit(
  tenantId: string,
  request: SplitRequest
): Promise<ValidationResult> {
  const errors: string[] = []
  const warnings: string[] = []
  
  // 1. Get source lot
  const sourceLot = await prisma.lot.findUnique({
    where: { id: request.sourceLotId },
    include: {
      TankAssignment: {
        where: { tankId: request.sourceTankId, status: { in: ['PLANNED', 'ACTIVE'] } },
      },
    },
  })
  
  if (!sourceLot) {
    return { valid: false, errors: ['Source lot not found'], warnings: [] }
  }
  
  // 2. Validate split percentages sum to 100% or less
  const totalPercent = request.destinations.reduce((sum, d) => sum + d.volumePercent, 0)
  
  if (totalPercent > 100) {
    errors.push(`Split percentages sum to ${totalPercent}%, cannot exceed 100%`)
  }
  
  if (totalPercent < 100) {
    warnings.push(`Only ${totalPercent}% allocated, ${100 - totalPercent}% will remain in source`)
  }
  
  // 3. Calculate volumes and validate each destination
  const sourceVolume = Number(sourceLot.actualVolume || sourceLot.plannedVolume || 0)
  
  for (const dest of request.destinations) {
    const destVolume = sourceVolume * (dest.volumePercent / 100)
    
    const availability = await checkTankAvailability(tenantId, {
      tankId: dest.tankId,
      timeRange: dest.timeRange,
      volume: destVolume,
    })
    
    if (!availability.valid) {
      const tank = await prisma.equipment.findUnique({ where: { id: dest.tankId } })
      errors.push(`Destination ${tank?.name}: ${availability.errors.join(', ')}`)
    }
    
    warnings.push(...availability.warnings)
  }
  
  // 4. Check no duplicate destination tanks
  const tankIds = request.destinations.map(d => d.tankId)
  if (new Set(tankIds).size !== tankIds.length) {
    errors.push('Cannot split into the same tank multiple times')
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

// ============================================
// 4. TRANSFER VALIDATION
// ============================================

export interface TransferRequest {
  sourceLotId: string
  sourceTankId: string
  destTankId: string
  destLotId?: string // null = create new lot
  volume: number
  transferType: 'FERMENT_TO_CONDITION' | 'CONDITION_TO_BRIGHT' | 'TANK_TO_TANK' | 'BLEND'
  plannedAt: Date
}

export async function validateTransfer(
  tenantId: string,
  request: TransferRequest
): Promise<ValidationResult> {
  const errors: string[] = []
  const warnings: string[] = []
  
  // 1. Get source lot
  const sourceLot = await prisma.lot.findUnique({
    where: { id: request.sourceLotId },
    include: {
      TankAssignment: {
        where: { tankId: request.sourceTankId },
      },
    },
  })
  
  if (!sourceLot) {
    return { valid: false, errors: ['Source lot not found'], warnings: [] }
  }
  
  // 2. Volume integrity check
  const availableVolume = Number(sourceLot.actualVolume || sourceLot.plannedVolume || 0)
  
  if (request.volume > availableVolume) {
    errors.push(`Transfer volume ${request.volume}L exceeds available ${availableVolume}L`)
  }
  
  // 3. Phase progression check
  const phaseOrder: Record<string, number> = {
    FERMENTATION: 1,
    CONDITIONING: 2,
    BRIGHT: 3,
    PACKAGING: 4,
  }
  
  const expectedPhase = {
    FERMENT_TO_CONDITION: 'CONDITIONING',
    CONDITION_TO_BRIGHT: 'BRIGHT',
    TANK_TO_TANK: sourceLot.phase,
    BLEND: sourceLot.phase,
  }[request.transferType]
  
  // 4. Get destination tank and check capability
  const destTank = await prisma.equipment.findUnique({
    where: { id: request.destTankId },
  })
  
  if (!destTank) {
    return { valid: false, errors: ['Destination tank not found'], warnings: [] }
  }
  
  const requiredCapability = {
    FERMENTATION: 'FERMENTATION',
    CONDITIONING: 'CONDITIONING',
    BRIGHT: 'SERVING',
  }[expectedPhase as string]
  
  if (requiredCapability && destTank.capabilities && !destTank.capabilities.includes(requiredCapability as any)) {
    errors.push(`Tank ${destTank.name} does not support ${expectedPhase} phase`)
  }
  
  // 5. If creating new lot at destination, check tank availability
  if (!request.destLotId) {
    // Estimate time range (use source assignment times + offset)
    const sourceAssignment = sourceLot.TankAssignment[0]
    const estimatedEnd = new Date(request.plannedAt)
    estimatedEnd.setDate(estimatedEnd.getDate() + 14) // Default 14 days
    
    const availability = await checkTankAvailability(tenantId, {
      tankId: request.destTankId,
      timeRange: { start: request.plannedAt, end: estimatedEnd },
      volume: request.volume,
    })
    
    errors.push(...availability.errors)
    warnings.push(...availability.warnings)
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

// ============================================
// 5. UTILITY FUNCTIONS
// ============================================

/**
 * Derive tank status from assignments
 */
export async function deriveTankStatus(tankId: string): Promise<{
  status: 'AVAILABLE' | 'PLANNED' | 'ACTIVE'
  currentLotId?: string
  currentPhase?: string
}> {
  const now = new Date()
  
  // Check for active assignment
  const activeAssignment = await prisma.tankAssignment.findFirst({
    where: {
      tankId,
      status: 'ACTIVE',
    },
    include: { Lot: true },
    orderBy: { actualStart: 'desc' },
  })
  
  if (activeAssignment) {
    return {
      status: 'ACTIVE',
      currentLotId: activeAssignment.lotId,
      currentPhase: activeAssignment.phase,
    }
  }
  
  // Check for planned assignment that should be active
  const plannedAssignment = await prisma.tankAssignment.findFirst({
    where: {
      tankId,
      status: 'PLANNED',
      plannedStart: { lte: now },
      plannedEnd: { gte: now },
    },
    include: { Lot: true },
    orderBy: { plannedStart: 'asc' },
  })
  
  if (plannedAssignment) {
    return {
      status: 'PLANNED',
      currentLotId: plannedAssignment.lotId,
      currentPhase: plannedAssignment.phase,
    }
  }
  
  return { status: 'AVAILABLE' }
}

/**
 * Get tank occupancy for a time range (for calendar rendering)
 */
export async function getTankOccupancy(
  tenantId: string,
  tankIds: string[],
  timeRange: TimeRange
): Promise<Map<string, any[]>> {
  try {
    console.log('[VALIDATION] getTankOccupancy called')
    console.log('[VALIDATION] Tenant ID:', tenantId)
    console.log('[VALIDATION] Tank IDs:', tankIds.length)
    console.log('[VALIDATION] Prisma client type:', typeof prisma)
    console.log('[VALIDATION] Prisma tankAssignment exists:', 'tankAssignment' in prisma)
    
    const assignments = await prisma.tankAssignment.findMany({
    where: {
      tenantId,
      tankId: { in: tankIds },
      status: { in: ['PLANNED', 'ACTIVE', 'COMPLETED'] },
      AND: [
        { plannedStart: { lt: timeRange.end } },
        { plannedEnd: { gt: timeRange.start } },
      ],
    },
    include: {
      Lot: {
        include: {
          LotBatch: {
            include: { Batch: { include: { recipe: true } } },
          },
        },
      },
      Tank: true,
    },
    orderBy: { plannedStart: 'asc' },
  })
  
    // Group by tank
    const result = new Map<string, any[]>()
    
    for (const assignment of assignments) {
      const tankAssignments = result.get(assignment.tankId) || []
      tankAssignments.push(assignment)
      result.set(assignment.tankId, tankAssignments)
    }
    
    console.log('[VALIDATION] Found assignments:', assignments.length)
    console.log('[VALIDATION] Result map size:', result.size)
    return result
  } catch (error) {
    console.error('[VALIDATION] Error in getTankOccupancy:', error)
    console.error('[VALIDATION] Error stack:', error instanceof Error ? error.stack : 'No stack')
    throw error
  }
}

/**
 * Generate next lot code
 */
export async function generateLotCode(
  tenantId: string,
  phase: 'FERMENTATION' | 'CONDITIONING' | 'BRIGHT'
): Promise<string> {
  const prefix = {
    FERMENTATION: 'F',
    CONDITIONING: 'C',
    BRIGHT: 'B',
  }[phase]
  
  const year = new Date().getFullYear()
  
  const lastLot = await prisma.lot.findFirst({
    where: {
      tenantId,
      lotCode: { startsWith: `LOT-${year}-${prefix}` },
    },
    orderBy: { lotCode: 'desc' },
  })
  
  let sequence = 1
  if (lastLot) {
    const match = lastLot.lotCode?.match(/(\d+)$/)
    if (match) {
      sequence = parseInt(match[1], 10) + 1
    }
  }
  
  return `LOT-${year}-${prefix}${sequence.toString().padStart(3, '0')}`
}
