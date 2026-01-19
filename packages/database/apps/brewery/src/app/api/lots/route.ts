import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@saas-platform/database'
import { withTenant, RouteContext } from '@/lib/api-middleware'

// ═══════════════════════════════════════════════════════════
// GET /api/lots
// LOT-CENTRIC API for Production Page
// ═══════════════════════════════════════════════════════════
// 
// RULE: Production page shows ONLY ACTIVE LOTS
// - Split: Each child lot = separate row
// - Blend: Only result lot = one row (source lots hidden)
// - Single: One lot = one row
// - Batches are NEVER displayed as rows
// ═══════════════════════════════════════════════════════════

export const GET = withTenant(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const url = new URL(req.url)
    const phase = url.searchParams.get('phase')
    const status = url.searchParams.get('status')
    const lotNumber = url.searchParams.get('lotNumber')
    const lotId = url.searchParams.get('id')
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const activeOnly = url.searchParams.get('activeOnly') !== 'false' // default true

    const whereClause: any = {
      tenantId: ctx.tenantId,
    }

    // Search by lotNumber or id
    if (lotNumber) {
      whereClause.OR = [
        { lotCode: lotNumber },
        { id: lotNumber },
      ]
    }

    if (lotId) {
      whereClause.OR = [
        { id: lotId },
        { lotCode: lotId },
      ]
    }

    if (phase) {
      whereClause.phase = phase
    }

    if (status) {
      whereClause.status = status
    }

    // ═══════════════════════════════════════════════════════════
    // ACTIVE ONLY FILTER (for Production page)
    // ═══════════════════════════════════════════════════════════
    if (activeOnly && !lotId && !lotNumber) {
      // Show only:
      // 1. Active/Planned lots
      // 2. NOT source lots that were consumed in blend (status = COMPLETED after blend)
      whereClause.status = { in: ['ACTIVE', 'PLANNED'] }
    }

    const lots = await prisma.lot.findMany({
      where: whereClause,
      include: {
        // Get batches in this lot
        LotBatch: {
          include: {
            Batch: {
              select: {
                id: true,
                batchNumber: true,
                status: true,
                volume: true,
                packagedVolume: true,
                originalGravity: true,
                currentGravity: true,
                brewedAt: true,
                recipe: {
                  select: { id: true, name: true, style: true },
                },
                gravityReadings: {
                  orderBy: { recordedAt: 'desc' },
                  take: 10,
                },
                packagingRuns: {
                  orderBy: { performedAt: 'desc' },
                  take: 10,
                  select: {
                    id: true,
                    packageType: true,
                    quantity: true,
                    volumeTotal: true,
                    lotNumber: true,
                    performedBy: true,
                    performedAt: true,
                    notes: true,
                  },
                },
              },
            },
          },
        },
        // Get tank assignment
        TankAssignment: {
          where: { status: { in: ['ACTIVE', 'PLANNED'] } },
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            Equipment: {
              select: { id: true, name: true, type: true, capacity: true },
            },
          },
        },
        // Get parent lot (for split children)
        Lot: {
          select: { 
            id: true, 
            lotCode: true,
            // Get parent's batches to show source batch info
            LotBatch: {
              select: {
                Batch: {
                  select: {
                    id: true,
                    batchNumber: true,
                    volume: true,
                  }
                }
              }
            }
          },
        },
        // Get child lots (for detecting if this is a parent that was split)
        other_Lot: {
          where: { status: { in: ['ACTIVE', 'PLANNED'] } },
          select: { 
            id: true, 
            lotCode: true, 
            status: true,
            phase: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    // ═══════════════════════════════════════════════════════════
    // TRANSFORM: Add helper fields for UI
    // ═══════════════════════════════════════════════════════════
    const transformed = lots
      .filter(lot => {
        // ═══════════════════════════════════════════════════════
        // FILTER OUT: Parent lots that were split (show children instead)
        // ═══════════════════════════════════════════════════════
        if (lot.other_Lot && lot.other_Lot.length > 0) {
          // This lot has active children = it was split
          // Don't show parent, show children
          console.log('[LOTS API] Filtering out parent lot:', lot.lotCode, '- has', lot.other_Lot.length, 'active children')
          return false
        }
        
        // ═══════════════════════════════════════════════════════
        // FILTER OUT: Source lots consumed in blend
        // ═══════════════════════════════════════════════════════
        // If lot has batchCount > 1 AND isBlendResult = false AND status = COMPLETED
        // = this was a source lot for a blend
        if (lot.LotBatch.length === 1 && 
            lot.status === 'COMPLETED' && 
            !lot.isBlendResult) {
          // Check if this lot's batch is now part of a blend lot
          // (This would be caught by activeOnly filter, but double check)
          console.log('[LOTS API] Filtering out completed non-blend lot:', lot.lotCode)
          return false
        }

        return true
      })
      .map(lot => {
        // Get active tank assignment
        const activeAssignment = lot.TankAssignment?.[0]
        const tank = (activeAssignment as any)?.Equipment
        
        // ═══════════════════════════════════════════════════════
        // DETECT LOT TYPE
        // ═══════════════════════════════════════════════════════
        const batchCount = lot.LotBatch.length
        const isBlendResult = lot.isBlendResult === true || batchCount > 1
        const isSplitChild = !!lot.parentLotId
        const lotType: 'single' | 'blend' | 'split' = 
          isBlendResult ? 'blend' : 
          isSplitChild ? 'split' : 
          'single'

        // Get first batch info (for recipe name, etc.)
        const firstBatch = lot.LotBatch[0]?.Batch
        
        // ═══════════════════════════════════════════════════════
        // SOURCE INFO
        // ═══════════════════════════════════════════════════════
        // For Split: get parent batch number
        let sourceBatchNumber: string | null = null
        let sourceBatchId: string | null = null
        
        if (isSplitChild && lot.Lot) {
          // Parent lot's batch is the source
          const parentBatch = (lot.Lot as any)?.LotBatch?.[0]?.Batch
          sourceBatchNumber = parentBatch?.batchNumber || null
          sourceBatchId = parentBatch?.id || null
        }

        // For Blend: get source lots info (for tooltip)
        let sourceLots: { id: string; lotCode: string; batchNumber: string; volume: number }[] = []
        
        if (isBlendResult) {
          // Source batches are in LotBatch
          sourceLots = lot.LotBatch.map(lb => ({
            id: lb.Batch?.id || '',
            lotCode: '', // Source lot code would need additional query
            batchNumber: lb.Batch?.batchNumber || '',
            volume: lb.volumeContribution ? Number(lb.volumeContribution) : 0,
          }))
        }

        // ═══════════════════════════════════════════════════════
        // CALCULATE METRICS
        // ═══════════════════════════════════════════════════════
        const totalVolume = lot.actualVolume 
          ? Number(lot.actualVolume) 
          : lot.LotBatch.reduce((sum, lb) => sum + (lb.volumeContribution ? Number(lb.volumeContribution) : 0), 0)

        // Calculate packagedVolume from all batches
        const packagedVolume = lot.LotBatch.reduce((sum, lb) => {
          const pkgVol = (lb.Batch as any)?.packagedVolume
          return sum + (pkgVol ? Number(pkgVol) : 0)
        }, 0)

        // Get gravity info
        const latestGravity = firstBatch?.gravityReadings?.[0]
        const originalGravity = firstBatch?.originalGravity 
          ? Number(firstBatch.originalGravity) 
          : null
        const currentGravity = latestGravity?.gravity 
          ? Number(latestGravity.gravity) 
          : (firstBatch?.currentGravity ? Number(firstBatch.currentGravity) : null)

        // ═══════════════════════════════════════════════════════
        // CALCULATE PROGRESS
        // ═══════════════════════════════════════════════════════
        const phase = lot.phase || activeAssignment?.phase
        let progress = 0
        
        if (lot.status === 'COMPLETED') {
          progress = 100
        } else {
          switch (phase) {
            case 'FERMENTATION': progress = 40; break
            case 'CONDITIONING': progress = 70; break
            case 'BRIGHT': progress = 85; break
            case 'PACKAGING': 
              // Calculate from packaged volume
              if (totalVolume > 0 && packagedVolume > 0) {
                progress = Math.min(Math.round((packagedVolume / totalVolume) * 100), 99)
              } else {
                progress = 90
              }
              break
            default: progress = 10
          }
        }

        // ═══════════════════════════════════════════════════════
        // RETURN TRANSFORMED LOT
        // ═══════════════════════════════════════════════════════
        return {
          // Core identifiers
          id: lot.id,
          lotCode: lot.lotCode || lot.id,
          lotNumber: lot.lotCode || lot.id, // alias for display
          
          // Type detection (for UI badges)
          type: lotType,
          isBlendResult,
          isSplitChild,
          
          // Status & Phase
          phase: lot.phase,
          status: lot.status,
          progress,
          
          // Source info (for tooltips/detail)
          sourceBatchNumber, // For splits: "from BRW-2025-0001"
          sourceBatchId,
          sourceLots,       // For blends: [{batchNumber, volume}]
          parentLotId: lot.parentLotId,
          
          // Recipe info (from first batch)
          recipeName: firstBatch?.recipe?.name || 'Unknown',
          recipeStyle: firstBatch?.recipe?.style || '',
          recipeId: firstBatch?.recipe?.id || null,
          
          // Volume metrics
          totalVolume,
          plannedVolume: lot.plannedVolume ? Number(lot.plannedVolume) : null,
          actualVolume: lot.actualVolume ? Number(lot.actualVolume) : null,
          packagedVolume,
          remainingVolume: Math.max(0, totalVolume - packagedVolume),
          
          // Gravity metrics
          originalGravity,
          currentGravity,
          
          // Tank info
          tank: tank ? {
            id: tank.id,
            name: tank.name,
            type: tank.type,
            capacity: tank.capacity ? Number(tank.capacity) : null,
          } : null,
          tankName: tank?.name || '-',
          tankId: tank?.id || null,
          
          // Timestamps
          createdAt: lot.createdAt,
          updatedAt: lot.updatedAt,
          blendedAt: lot.blendedAt,
          splitAt: lot.splitAt,
          
          // Notes
          notes: lot.notes,
          
          // ═══════════════════════════════════════════════════════
          // BATCHES (for detail view / backward compatibility)
          // ═══════════════════════════════════════════════════════
          batchCount,
          batches: lot.LotBatch.map(lb => ({
            id: lb.Batch?.id || lb.batchId,
            batchNumber: lb.Batch?.batchNumber || '',
            status: lb.Batch?.status || 'ACTIVE',
            volume: lb.Batch?.volume ? Number(lb.Batch.volume) : null,
            volumeContribution: lb.volumeContribution ? Number(lb.volumeContribution) : null,
            batchPercentage: lb.batchPercentage ? Number(lb.batchPercentage) : 100,
            recipeName: lb.Batch?.recipe?.name || null,
            recipeStyle: lb.Batch?.recipe?.style || null,
            originalGravity: lb.Batch?.originalGravity ? Number(lb.Batch.originalGravity) : null,
            currentGravity: lb.Batch?.currentGravity ? Number(lb.Batch.currentGravity) : null,
            packagedVolume: (lb.Batch as any)?.packagedVolume ? Number((lb.Batch as any).packagedVolume) : 0,
          })),
          
          // Raw relations (for backward compatibility)
          LotBatch: lot.LotBatch,
          TankAssignment: lot.TankAssignment,
        }
      })

    // ═══════════════════════════════════════════════════════════
    // STATS for UI
    // ═══════════════════════════════════════════════════════════
    const stats = {
      total: transformed.length,
      fermenting: transformed.filter(l => l.phase === 'FERMENTATION' && l.status === 'ACTIVE').length,
      conditioning: transformed.filter(l => l.phase === 'CONDITIONING' && l.status === 'ACTIVE').length,
      bright: transformed.filter(l => l.phase === 'BRIGHT' && l.status === 'ACTIVE').length,
      packaging: transformed.filter(l => l.phase === 'PACKAGING' && l.status === 'ACTIVE').length,
      blends: transformed.filter(l => l.type === 'blend').length,
      splits: transformed.filter(l => l.type === 'split').length,
      singles: transformed.filter(l => l.type === 'single').length,
    }

    console.log('[LOTS API] Returning', transformed.length, 'lots - Stats:', stats)

    return NextResponse.json({
      lots: transformed,
      count: transformed.length,
      stats,
    })

  } catch (error: any) {
    console.error('[LOTS API] Error:', error.message)
    return NextResponse.json(
      { error: 'შეცდომა', details: error.message },
      { status: 500 }
    )
  }
})
