import { prisma } from '@brewery/database'

// ═══════════════════════════════════════════════════════════
// LOT NUMBER GENERATOR - FIXED VERSION
// ═══════════════════════════════════════════════════════════

export async function generateLotNumber(
  tenantId: string,
  phase: 'FERMENTATION' | 'CONDITIONING' | 'BRIGHT' | 'PACKAGING'
): Promise<string> {
  const prefix = {
    FERMENTATION: 'FERM',
    CONDITIONING: 'COND',
    BRIGHT: 'BRT',
    PACKAGING: 'PKG',
  }[phase]

  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const dateStr = `${year}${month}${day}`

  // Since lotNumber doesn't exist in schema, generate a simple timestamp-based ID
  const timestamp = Date.now().toString(36).slice(-6).toUpperCase()
  return `${prefix}-${dateStr}-${timestamp}`
}

// ═══════════════════════════════════════════════════════════
// GENERATE BLEND LOT CODE - BLEND-YYYY-NNNN
// ═══════════════════════════════════════════════════════════
export async function generateBlendLotCode(tenantId: string): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `BLEND-${year}-`
  
  // Find last BLEND lot for this year
  const lastBlendLot = await prisma.lot.findFirst({
    where: { 
      tenantId,
      lotCode: { startsWith: prefix }
    },
    orderBy: { lotCode: 'desc' },
    select: { lotCode: true }
  })

  let nextNumber = 1
  if (lastBlendLot?.lotCode) {
    const match = lastBlendLot.lotCode.match(/BLEND-\d{4}-(\d{4})/)
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1
    }
  }

  return `${prefix}${String(nextNumber).padStart(4, '0')}`
  // Returns: BLEND-2026-0001, BLEND-2026-0002, etc.
}

// ═══════════════════════════════════════════════════════════
// TANK AVAILABILITY CHECK
// ═══════════════════════════════════════════════════════════

export interface TankAvailabilityResult {
  available: boolean
  conflictingAssignment?: {
    id: string
    lotNumber: string
    phase: string
    startTime: Date
    endTime: Date
    status: string
  }
}

export async function checkTankAvailability(
  tankId: string,
  startTime: Date | string,
  endTime: Date | string,
  excludeAssignmentId?: string
): Promise<TankAvailabilityResult> {
  const start = new Date(startTime)
  const end = new Date(endTime)

  // ✅ 1. First check Equipment.status - tank must be AVAILABLE or OPERATIONAL
  const equipment = await prisma.equipment.findUnique({
    where: { id: tankId },
    select: { id: true, name: true, status: true },
  })

  if (!equipment) {
    return {
      available: false,
      conflictingAssignment: {
        id: '',
        lotNumber: 'Equipment not found',
        phase: '',
        startTime: start,
        endTime: end,
        status: 'NOT_FOUND',
      },
    }
  }

  // Tank is not available if status is IN_USE, NEEDS_CIP, or other non-available statuses
  const unavailableStatuses = ['IN_USE', 'NEEDS_CIP', 'CIP', 'MAINTENANCE', 'OUT_OF_SERVICE']
  if (equipment.status && unavailableStatuses.includes(equipment.status.toUpperCase())) {
    return {
      available: false,
      conflictingAssignment: {
        id: '',
        lotNumber: `Tank status: ${equipment.status}`,
        phase: '',
        startTime: start,
        endTime: end,
        status: equipment.status,
      },
    }
  }

  // ✅ 2. Then check for conflicting TankAssignments
  const whereClause: any = {
    tankId: tankId,
    status: { in: ['PLANNED', 'ACTIVE'] },
    // Overlap formula: newStart < existingEnd AND newEnd > existingStart
    AND: [
      { plannedStart: { lt: end } },
      { plannedEnd: { gt: start } },
    ],
  }

  // Exclude current assignment (for updates)
  if (excludeAssignmentId) {
    whereClause.id = { not: excludeAssignmentId }
  }

  const conflicting = await prisma.tankAssignment.findFirst({
    where: whereClause,
    include: {
      Lot: {
        select: { id: true },
      },
    },
  })

  if (conflicting) {
    return {
      available: false,
        conflictingAssignment: {
          id: conflicting.id,
          lotNumber: conflicting.Lot.id || '',
          phase: conflicting.phase,
          startTime: (conflicting as any).plannedStart || (conflicting as any).actualStart,
          endTime: (conflicting as any).plannedEnd || (conflicting as any).actualEnd,
          status: conflicting.status,
        },
    }
  }

  return { available: true }
}

// ═══════════════════════════════════════════════════════════
// CHECK MULTIPLE TANKS
// ═══════════════════════════════════════════════════════════

export async function checkMultipleTanksAvailability(
  allocations: { tankId: string; volume: number }[],
  startTime: Date | string,
  endTime: Date | string
): Promise<{ 
  allAvailable: boolean
  results: Map<string, TankAvailabilityResult> 
}> {
  const results = new Map<string, TankAvailabilityResult>()
  let allAvailable = true

  for (const alloc of allocations) {
    const result = await checkTankAvailability(alloc.tankId, startTime, endTime)
    results.set(alloc.tankId, result)
    if (!result.available) {
      allAvailable = false
    }
  }

  return { allAvailable, results }
}

// ═══════════════════════════════════════════════════════════
// VALIDATE BLENDING COMPATIBILITY
// ═══════════════════════════════════════════════════════════

export async function validateBlendingCompatibility(
  batchIds: string[]
): Promise<{ 
  compatible: boolean
  warnings: string[]
  errors: string[] 
}> {
  const warnings: string[] = []
  const errors: string[] = []

  const batches = await prisma.batch.findMany({
    where: { id: { in: batchIds } },
    include: {
      recipe: {
        select: { id: true, name: true, style: true, yeastStrain: true },
      },
    },
  })

  // Check yeast compatibility
  const yeasts = new Set(batches.map(b => b.recipe?.yeastStrain).filter(Boolean))
  if (yeasts.size > 1) {
    errors.push(`სხვადასხვა საფუარი ვერ შეერევა: ${Array.from(yeasts).join(', ')}`)
  }

  // Check style compatibility (warning only)
  const styles = new Set(batches.map(b => b.recipe?.style).filter(Boolean))
  if (styles.size > 1) {
    warnings.push(`სხვადასხვა სტილის შერევა: ${Array.from(styles).join(', ')}`)
  }

  // Check recipe compatibility (warning only)
  const recipes = new Set(batches.map(b => b.recipe?.name).filter(Boolean))
  if (recipes.size > 1) {
    warnings.push(`სხვადასხვა რეცეპტის შერევა: ${Array.from(recipes).join(', ')}`)
  }

  return {
    compatible: errors.length === 0,
    warnings,
    errors,
  }
}

// ═══════════════════════════════════════════════════════════
// DETERMINE SCENARIO
// ═══════════════════════════════════════════════════════════

export type FermentationScenario = 'SIMPLE' | 'SPLIT' | 'BLEND'

export function determineFermentationScenario(
  batchIds: string[],
  allocations: { tankId: string; volume: number }[],
  enableBlending?: boolean,
  targetLotId?: string  // ✅ Add targetLotId parameter
): FermentationScenario {
  // ✅ BLEND when adding batch to existing lot OR merging multiple batches
  if (enableBlending && (batchIds.length > 1 || targetLotId)) {
    return 'BLEND'
  }
  if (allocations.length > 1) {
    return 'SPLIT'
  }
  return 'SIMPLE'
}
