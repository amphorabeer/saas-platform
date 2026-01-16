// ============================================
// TANK SCHEDULER - CALENDAR RENDERING LOGIC
// ============================================

import { prisma } from '@saas-platform/database'
import { getTankOccupancy, deriveTankStatus } from './validation'

// ============================================
// TYPES
// ============================================

export interface CalendarBlock {
  id: string                    // assignment.id
  lotId: string
  lotCode: string
  tankId: string
  tankName: string
  
  // Time range
  startDate: Date
  endDate: Date
  
  // Display properties
  phase: 'FERMENTATION' | 'CONDITIONING' | 'BRIGHT' | 'PACKAGING'
  status: 'PLANNED' | 'ACTIVE' | 'COMPLETED'
  
  // Volume
  plannedVolume: number
  actualVolume?: number
  fillPercent: number          // For visual indicator
  
  // Batch info
  batchCount: number
  primaryBatchNumber?: string  // Main batch number for display
  primaryRecipe?: string       // Main recipe name
  
  // Split/Merge indicators
  isSplit: boolean             // Part of a split
  isBlend: boolean             // Result of blending
  splitRatio?: string          // e.g., "60/40"
  sourceCount?: number         // Number of source lots (for blends)
  
  // Parent/Child relations
  parentLotCode?: string
  childLotCodes?: string[]
  
  // Visual styling hints
  colorClass: string           // CSS class for phase color
  opacity: number              // 1.0 for active, 0.7 for planned, 0.5 for completed
  badges: CalendarBadge[]
}

export interface CalendarBadge {
  type: 'phase' | 'batch_count' | 'split' | 'blend' | 'warning' | 'overdue'
  label: string
  colorClass: string
}

export interface CalendarTankRow {
  tank: {
    id: string
    name: string
    type: string
    capacity: number
    status: 'AVAILABLE' | 'PLANNED' | 'ACTIVE' | 'MAINTENANCE'
    currentPhase?: string
  }
  blocks: CalendarBlock[]
}

export interface CalendarData {
  timeRange: { start: Date; end: Date }
  rows: CalendarTankRow[]
  summary: {
    totalTanks: number
    availableTanks: number
    occupiedTanks: number
    activeBlocks: number
    plannedBlocks: number
  }
}

// ============================================
// PHASE COLORS
// ============================================

const PHASE_COLORS: Record<string, string> = {
  FERMENTATION: 'bg-gradient-to-r from-amber-600 to-orange-500',
  CONDITIONING: 'bg-gradient-to-r from-blue-600 to-blue-400',
  BRIGHT: 'bg-gradient-to-r from-emerald-600 to-green-400',
  PACKAGING: 'bg-gradient-to-r from-purple-600 to-purple-400',
}

const STATUS_OPACITY: Record<string, number> = {
  ACTIVE: 1.0,
  PLANNED: 0.8,
  COMPLETED: 0.5,
}

// ============================================
// CALENDAR DATA GENERATION
// ============================================

/**
 * Generate calendar data for a time range
 */
export async function generateCalendarData(
  tenantId: string,
  timeRange: { start: Date; end: Date }
): Promise<CalendarData> {
  try {
    console.log('[CALENDAR] generateCalendarData called')
    console.log('[CALENDAR] Tenant ID:', tenantId)
    console.log('[CALENDAR] Time range:', timeRange.start, 'to', timeRange.end)
    console.log('[CALENDAR] Prisma client type:', typeof prisma)
    console.log('[CALENDAR] Prisma tankAssignment exists:', 'tankAssignment' in prisma)
    
    // 1. Get all tanks
    console.log('[CALENDAR] Fetching tanks...')
    console.log('[CALENDAR] Tenant ID:', tenantId)
    const tanks = await prisma.equipment.findMany({
      where: {
        tenantId,
        type: { in: ['FERMENTER', 'UNITANK', 'BRITE'] },
      },
      orderBy: [{ name: 'asc' }],
    })
    console.log('[CALENDAR] Found tanks:', tanks.length)
    console.log('[CALENDAR] Tank query result:', tanks.map(t => ({ id: t.id, name: t.name, type: t.type, status: t.status })))
    
    // 2. Get all assignments for the time range (new Lot system)
    console.log('[CALENDAR] Fetching tank occupancy...')
    const occupancyMap = await getTankOccupancy(
      tenantId,
      tanks.map(t => t.id),
      timeRange
    )
    console.log('[CALENDAR] Occupancy map size:', occupancyMap.size)
    
    // 2b. Fetch existing batches (old system) that have equipment assignments
    console.log('[CALENDAR] Fetching legacy batches...')
    const existingBatches = await prisma.batch.findMany({
      where: {
        tenantId,
        tankId: { not: null }, // tankId is the equipmentId in legacy system
        status: { in: ['PLANNED', 'BREWING', 'FERMENTING', 'CONDITIONING', 'READY', 'PACKAGING'] },
        // Only include batches that overlap with time range
        OR: [
          { brewedAt: { lte: timeRange.end } },
          { createdAt: { gte: timeRange.start } },
        ],
      },
      include: {
        recipe: { select: { id: true, name: true, style: true } },
      },
    })
    console.log('[CALENDAR] Found legacy batches:', existingBatches.length)
    
    // Get equipment details for legacy batches (tankId in Batch = equipmentId)
    const equipmentIdsSet = new Set<string>()
    for (const batch of existingBatches) {
      if (batch.tankId) equipmentIdsSet.add(batch.tankId) // tankId is actually equipmentId
    }
    const equipmentIds = Array.from(equipmentIdsSet)
    const legacyEquipment = await prisma.equipment.findMany({
      where: {
        id: { in: equipmentIds },
      },
      select: { id: true, name: true, type: true, capacity: true },
    })
    const equipmentMap = new Map(legacyEquipment.map(eq => [eq.id, eq]))
    
    // Convert legacy batches to blocks and merge with occupancy map
    const legacyBlocksMap = new Map<string, CalendarBlock[]>()
    for (const batch of existingBatches) {
      if (!batch.tankId) continue
      const equipment = equipmentMap.get(batch.tankId) // tankId is actually equipmentId
      if (!equipment) continue
      
      const equipmentId = batch.tankId // tankId field contains equipmentId
      const blocks = legacyBlocksMap.get(equipmentId) || []
      
      const block = batchToBlock(batch, equipment)
      blocks.push(block)
      legacyBlocksMap.set(equipmentId, blocks)
    }
  
  // 3. Build calendar rows
  const rows: CalendarTankRow[] = []
  let availableTanks = 0
  let occupiedTanks = 0
  let activeBlocks = 0
  let plannedBlocks = 0
  
  for (const tank of tanks) {
    const assignments = occupancyMap.get(tank.id) || []
    const legacyBlocks = legacyBlocksMap.get(tank.id) || []
    
    // Derive tank status
    const tankStatus = await deriveTankStatus(tank.id)
    
    // Convert assignments to blocks (new Lot system)
    const lotBlocks = assignments.map(assignment => 
      assignmentToBlock(assignment, tank)
    )
    
    // Merge legacy blocks with lot blocks
    // Filter out legacy blocks that overlap with lot blocks (avoid duplicates)
    const filteredLegacyBlocks = legacyBlocks.filter(legacyBlock => {
      return !lotBlocks.some(lotBlock => {
        // Check if legacy block overlaps with any lot block
        return legacyBlock.startDate < lotBlock.endDate && legacyBlock.endDate > lotBlock.startDate
      })
    })
    
    const blocks = [...lotBlocks, ...filteredLegacyBlocks]
    
    // Count stats
    if (tankStatus.status === 'AVAILABLE') {
      availableTanks++
    } else {
      occupiedTanks++
    }
    
    for (const block of blocks) {
      if (block.status === 'ACTIVE') activeBlocks++
      if (block.status === 'PLANNED') plannedBlocks++
    }
    
    rows.push({
      tank: {
        id: tank.id,
        name: tank.name,
        type: tank.type,
        capacity: tank.capacity || 0,
        status: tank.status === 'UNDER_MAINTENANCE' || tank.status === 'NEEDS_CIP'
          ? 'MAINTENANCE'
          : tankStatus.status,
        currentPhase: tankStatus.currentPhase,
      },
      blocks,
    })
  }
  
  console.log('[CALENDAR] Generated rows:', rows.length)
  console.log('[CALENDAR] Summary:', {
    totalTanks: tanks.length,
    availableTanks,
    occupiedTanks,
    activeBlocks,
    plannedBlocks,
  })
  
  return {
    timeRange,
    rows,
    summary: {
      totalTanks: tanks.length,
      availableTanks,
      occupiedTanks,
      activeBlocks,
      plannedBlocks,
    },
  }
  } catch (error) {
    console.error('[CALENDAR] Error in generateCalendarData:', error)
    console.error('[CALENDAR] Error stack:', error instanceof Error ? error.stack : 'No stack')
    throw error
  }
}

/**
 * Map batch status to phase
 */
function mapBatchStatusToPhase(status: string): 'FERMENTATION' | 'CONDITIONING' | 'BRIGHT' | 'PACKAGING' {
  switch (status?.toUpperCase()) {
    case 'PLANNED':
    case 'BREWING':
    case 'FERMENTING':
      return 'FERMENTATION'
    case 'CONDITIONING':
    case 'READY':
      return 'CONDITIONING'
    case 'PACKAGING':
      return 'PACKAGING'
    default:
      return 'FERMENTATION'
  }
}

/**
 * Convert a legacy Batch to a CalendarBlock
 */
function batchToBlock(batch: any, tank: any): CalendarBlock {
  const phase = mapBatchStatusToPhase(batch.status)
  const isPlanned = batch.status === 'PLANNED' || batch.status === 'BREWING'
  const status: 'PLANNED' | 'ACTIVE' | 'COMPLETED' = isPlanned ? 'PLANNED' : 'ACTIVE'
  
  // Calculate dates
  const startDate = batch.brewedAt || batch.createdAt || new Date()
  const endDate = batch.completedAt || (() => {
    const end = new Date(startDate)
    end.setDate(end.getDate() + 14) // Default 14 days
    return end
  })()
  
  // Calculate fill percent
  const volume = batch.actualVolume || batch.volume || 0
  const fillPercent = tank.capacity ? Math.round((Number(volume) / Number(tank.capacity)) * 100) : 0
  
  // Build badges
  const badges: CalendarBadge[] = [
    {
      type: 'phase',
      label: formatPhase(phase),
      colorClass: 'bg-white/20',
    },
  ]
  
  // Add legacy badge to distinguish from Lot system
  badges.push({
    type: 'warning',
    label: 'Legacy',
    colorClass: 'bg-yellow-500',
  })
  
  return {
    id: `legacy-${batch.id}`,
    lotId: '',
    lotCode: batch.batchNumber || `BATCH-${batch.id.slice(-6)}`,
    tankId: tank.id,
    tankName: tank.name,
    
    startDate,
    endDate,
    
    phase,
    status,
    
    plannedVolume: Number(batch.volume || 0),
    actualVolume: batch.actualVolume ? Number(batch.actualVolume) : undefined,
    fillPercent,
    
    batchCount: 1,
    primaryBatchNumber: batch.batchNumber,
    primaryRecipe: batch.recipe?.name || 'Unknown',
    
    isSplit: false,
    isBlend: false,
    
    colorClass: PHASE_COLORS[phase] || 'bg-gray-500',
    opacity: STATUS_OPACITY[status] || 0.8,
    badges,
  }
}

/**
 * Convert a TankAssignment to a CalendarBlock
 */
function assignmentToBlock(assignment: any, tank: any): CalendarBlock {
  const lot = assignment.Lot
  const batches = lot?.LotBatch || []
  const primaryBatch = batches[0]?.Batch
  
  // Calculate fill percent
  const volume = assignment.actualVolume || assignment.plannedVolume || 0
  const fillPercent = tank.capacity ? Math.round((Number(volume) / tank.capacity) * 100) : 0
  
  // Determine if split or blend
  const isSplit = !!lot?.parentLotId && !!lot?.splitRatio
  const isBlend = assignment.isBlendTarget || batches.length > 1
  
  // Build badges
  const badges: CalendarBadge[] = []
  
  // Phase badge
  badges.push({
    type: 'phase',
    label: formatPhase(assignment.phase),
    colorClass: 'bg-white/20',
  })
  
  // Batch count badge
  if (batches.length > 1) {
    badges.push({
      type: 'batch_count',
      label: `×${batches.length}`,
      colorClass: 'bg-blue-500',
    })
  }
  
  // Split badge
  if (isSplit && lot?.splitRatio) {
    badges.push({
      type: 'split',
      label: `${Math.round(Number(lot.splitRatio) * 100)}%`,
      colorClass: 'bg-orange-500',
    })
  }
  
  // Blend badge
  if (isBlend && !isSplit) {
    badges.push({
      type: 'blend',
      label: 'Blend',
      colorClass: 'bg-purple-500',
    })
  }
  
  // Overdue check
  const now = new Date()
  const plannedEnd = new Date(assignment.plannedEnd)
  if (assignment.status === 'ACTIVE' && plannedEnd < now) {
    badges.push({
      type: 'overdue',
      label: 'Overdue',
      colorClass: 'bg-red-500',
    })
  }
  
  // Calculate split ratio display
  let splitRatio: string | undefined
  if (lot?.other_Lot?.length > 0) {
    const ratios = lot.other_Lot.map((c: any) => 
      Math.round(Number(c.splitRatio || 0) * 100)
    )
    splitRatio = ratios.join('/')
  }
  
  return {
    id: assignment.id,
    lotId: lot?.id || '',
    lotCode: lot?.lotCode || 'Unknown',
    tankId: tank.id,
    tankName: tank.name,
    
    startDate: assignment.actualStart || assignment.plannedStart,
    endDate: assignment.actualEnd || assignment.plannedEnd,
    
    phase: assignment.phase,
    status: assignment.status,
    
    plannedVolume: Number(assignment.plannedVolume || 0),
    actualVolume: assignment.actualVolume ? Number(assignment.actualVolume) : undefined,
    fillPercent,
    
    batchCount: batches.length,
    primaryBatchNumber: primaryBatch?.batchNumber,
    primaryRecipe: primaryBatch?.recipe?.name,
    
    isSplit,
    isBlend,
    splitRatio,
    sourceCount: isBlend ? batches.length : undefined,
    
    parentLotCode: lot?.Lot?.lotCode,
    childLotCodes: lot?.other_Lot?.map((c: any) => c.lotCode),
    
    colorClass: PHASE_COLORS[assignment.phase] || 'bg-gray-500',
    opacity: STATUS_OPACITY[assignment.status] || 0.8,
    badges,
  }
}

// ============================================
// BLOCK DETAIL DATA
// ============================================

export interface BlockDetail {
  block: CalendarBlock
  
  // Lot details
  lot: {
    id: string
    code: string
    phase: string
    status: string
    plannedVolume: number
    actualVolume?: number
    notes?: string
    createdAt: Date
    completedAt?: Date
  }
  
  // Source batches
  batches: {
    id: string
    batchNumber: string
    recipe: string
    style?: string
    brewDate: Date
    originalGravity?: number
    volumeContribution: number
    batchPercentage: number
  }[]
  
  // Transfer history
  transfers: {
    id: string
    code: string
    type: string
    volume: number
    sourceLotCode?: string
    destLotCode?: string
    executedAt?: Date
    status: string
  }[]
  
  // Parent/child lots
  parentLot?: {
    id: string
    code: string
    phase: string
    tankName: string
  }
  childLots: {
    id: string
    code: string
    phase: string
    tankName: string
    splitRatio?: number
  }[]
  
  // Readings
  latestReadings: {
    type: string
    value: number
    unit: string
    recordedAt: Date
  }[]
}

/**
 * Get detailed information for a calendar block
 */
export async function getBlockDetail(assignmentId: string): Promise<BlockDetail | null> {
  const assignment = await prisma.tankAssignment.findUnique({
    where: { id: assignmentId },
    include: {
      Tank: true,
      Lot: {
        include: {
          LotBatch: {
            include: {
              Batch: {
                include: { recipe: true },
              },
            },
          },
          Transfer_Transfer_destLotIdToLot: {
            include: {
              Lot_Transfer_sourceLotIdToLot: true,
            },
            orderBy: { executedAt: 'desc' },
          },
          Transfer_Transfer_sourceLotIdToLot: {
            include: {
              Lot_Transfer_destLotIdToLot: true,
            },
            orderBy: { executedAt: 'desc' },
          },
          Lot: {
            include: {
              TankAssignment: {
                where: { status: { in: ['ACTIVE', 'COMPLETED'] } },
                include: { Tank: true },
                take: 1,
              },
            },
          },
          other_Lot: {
            include: {
              TankAssignment: {
                where: { status: { in: ['PLANNED', 'ACTIVE'] } },
                include: { Tank: true },
                take: 1,
              },
            },
          },
          LotReading: {
            orderBy: { recordedAt: 'desc' },
            take: 5,
          },
        },
      },
    },
  })
  
  if (!assignment || !assignment.Lot) return null
  
  const lot = assignment.Lot
  const block = assignmentToBlock(assignment, assignment.Tank)
  
  return {
    block,
    
    lot: {
      id: lot.id,
      code: lot.lotCode,
      phase: lot.phase,
      status: lot.status,
      plannedVolume: Number(lot.plannedVolume),
      actualVolume: lot.actualVolume ? Number(lot.actualVolume) : undefined,
      notes: lot.notes || undefined,
      createdAt: lot.createdAt,
      completedAt: lot.completedAt || undefined,
    },
    
    batches: lot.LotBatch.map(lb => ({
      id: lb.Batch.id,
      batchNumber: lb.Batch.batchNumber,
      recipe: lb.Batch.recipe?.name || 'Unknown',
      style: lb.Batch.recipe?.style || undefined,
      brewDate: lb.Batch.brewedAt || new Date(),
      originalGravity: lb.Batch.originalGravity ? Number(lb.Batch.originalGravity) : undefined,
      volumeContribution: Number(lb.volumeContribution),
      batchPercentage: Number(lb.batchPercentage),
    })),
    
    transfers: [
      ...lot.Transfer_Transfer_destLotIdToLot.map(t => ({
        id: t.id,
        code: t.transferCode,
        type: t.transferType,
        volume: Number(t.volume),
        sourceLotCode: t.Lot_Transfer_sourceLotIdToLot?.lotCode,
        destLotCode: undefined,
        executedAt: t.executedAt || undefined,
        status: t.status,
      })),
      ...lot.Transfer_Transfer_sourceLotIdToLot.map(t => ({
        id: t.id,
        code: t.transferCode,
        type: t.transferType,
        volume: Number(t.volume),
        sourceLotCode: undefined,
        destLotCode: t.Lot_Transfer_destLotIdToLot?.lotCode,
        executedAt: t.executedAt || undefined,
        status: t.status,
      })),
    ].sort((a, b) => {
      const dateA = a.executedAt?.getTime() || 0
      const dateB = b.executedAt?.getTime() || 0
      return dateB - dateA
    }),
    
    parentLot: lot.Lot ? {
      id: lot.Lot.id,
      code: lot.Lot.lotCode,
      phase: lot.Lot.phase,
      tankName: lot.Lot.TankAssignment[0]?.Tank.name || 'Unknown',
    } : undefined,
    
    childLots: lot.other_Lot.map(cl => ({
      id: cl.id,
      code: cl.lotCode,
      phase: cl.phase,
      tankName: cl.TankAssignment[0]?.Tank.name || 'TBD',
      splitRatio: cl.splitRatio ? Number(cl.splitRatio) : undefined,
    })),
    
    latestReadings: lot.LotReading.map(r => ({
      type: r.readingType,
      value: Number(r.value),
      unit: r.unit,
      recordedAt: r.recordedAt,
    })),
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatPhase(phase: string): string {
  const map: Record<string, string> = {
    FERMENTATION: 'ფერმენტაცია',
    CONDITIONING: 'კონდიცირება',
    BRIGHT: 'ბრაიტი',
    PACKAGING: 'შეფუთვა',
  }
  return map[phase] || phase
}

/**
 * Calculate block position for calendar grid
 */
export function calculateBlockPosition(
  block: CalendarBlock,
  weekStart: Date,
  dayWidth: number = 14.285714 // 100% / 7 days
): { left: number; width: number } | null {
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 7)
  
  // Check if block is in this week
  if (block.endDate < weekStart || block.startDate >= weekEnd) {
    return null
  }
  
  // Clamp to week bounds
  const displayStart = block.startDate < weekStart ? weekStart : block.startDate
  const displayEnd = block.endDate > weekEnd ? weekEnd : block.endDate
  
  // Calculate position
  const weekMs = 7 * 24 * 60 * 60 * 1000
  const startOffset = displayStart.getTime() - weekStart.getTime()
  const duration = displayEnd.getTime() - displayStart.getTime()
  
  const left = (startOffset / weekMs) * 100
  const width = (duration / weekMs) * 100
  
  return { left, width: Math.max(width, dayWidth * 0.5) } // Min width for visibility
}

/**
 * Get occupancy summary for a tank
 */
export async function getTankOccupancySummary(
  tankId: string,
  days: number = 30
): Promise<{
  totalDays: number
  occupiedDays: number
  utilizationPercent: number
  upcomingAssignments: number
}> {
  const now = new Date()
  const rangeStart = now
  const rangeEnd = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
  
  const assignments = await prisma.tankAssignment.findMany({
    where: {
      tankId,
      status: { in: ['PLANNED', 'ACTIVE'] },
      AND: [
        { plannedStart: { lt: rangeEnd } },
        { plannedEnd: { gt: rangeStart } },
      ],
    },
  })
  
  // Calculate occupied days
  let occupiedMs = 0
  for (const a of assignments) {
    const start = Math.max(a.plannedStart.getTime(), rangeStart.getTime())
    const end = Math.min(a.plannedEnd.getTime(), rangeEnd.getTime())
    occupiedMs += Math.max(0, end - start)
  }
  
  const totalMs = days * 24 * 60 * 60 * 1000
  const occupiedDays = Math.round(occupiedMs / (24 * 60 * 60 * 1000))
  
  return {
    totalDays: days,
    occupiedDays,
    utilizationPercent: Math.round((occupiedMs / totalMs) * 100),
    upcomingAssignments: assignments.filter(a => a.status === 'PLANNED').length,
  }
}
