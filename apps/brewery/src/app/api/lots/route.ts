import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@saas-platform/database'
import { withTenant, RouteContext } from '@/lib/api-middleware'

// ═══════════════════════════════════════════════════════════
// GET /api/lots - LOT-CENTRIC API
// ═══════════════════════════════════════════════════════════

export const GET = withTenant(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const url = new URL(req.url)
    const phase = url.searchParams.get('phase')
    const status = url.searchParams.get('status')
    const lotNumber = url.searchParams.get('lotNumber')
    const lotId = url.searchParams.get('id')
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const activeOnly = url.searchParams.get('activeOnly') !== 'false'

    const whereClause: any = {
      tenantId: ctx.tenantId,
    }

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

    if (activeOnly && !lotId && !lotNumber) {
      whereClause.status = { in: ['ACTIVE', 'PLANNED'] }
    }

    console.log('[LOTS API] Query with where:', JSON.stringify(whereClause))

    const lots = await prisma.lot.findMany({
      where: whereClause,
      include: {
        LotBatch: {
          include: {
            Batch: {
              select: {
                id: true,
                batchNumber: true,
                status: true,
                volume: true,
                originalGravity: true,
                currentGravity: true,
                brewedAt: true,
                recipe: {
                  select: { id: true, name: true, style: true },
                },
                // ✅ Include gravity readings for fermentation monitoring
                gravityReadings: {
                  orderBy: { recordedAt: 'desc' },
                  select: {
                    id: true,
                    gravity: true,
                    temperature: true,
                    notes: true,
                    recordedAt: true,
                  },
                },
                // ✅ Add packaging runs
                packagingRuns: {
                  orderBy: { performedAt: 'desc' },
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
        // ✅ Include TankAssignment with Tank relation
        TankAssignment: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            // ✅ FIX: Use Tank (not Equipment) - Prisma uses model name for relation
            Tank: {
              select: { id: true, name: true, type: true, capacity: true },
            },
          },
        },
        Lot: {
          select: { 
            id: true, 
            lotCode: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    console.log('[LOTS API] Found', lots.length, 'lots')

    // ✅ FIX: Build a set of parent lot IDs to filter them out
    const parentLotIds = new Set<string>()
    
    // Method 1: Check parentLotId field
    lots.forEach(lot => {
      if (lot.parentLotId) {
        parentLotIds.add(lot.parentLotId)
      }
    })
    
    // Method 2: Check lotCode patterns - if lot X exists and lot X-A or X-B exists, X is parent
    const lotCodeMap = new Map<string, string>() // lotCode -> lotId
    lots.forEach(lot => {
      if (lot.lotCode) {
        lotCodeMap.set(lot.lotCode, lot.id)
      }
    })
    
    lots.forEach(lot => {
      if (lot.lotCode) {
        // Check if this lot's code ends with -A, -B, etc.
        const match = lot.lotCode.match(/^(.+)-([A-Z])$/)
        if (match) {
          const parentLotCode = match[1]
          const parentLotId = lotCodeMap.get(parentLotCode)
          if (parentLotId) {
            parentLotIds.add(parentLotId)
          }
        }
      }
    })
    
    console.log('[LOTS API] Found parent lot IDs to filter:', Array.from(parentLotIds))

    // Transform
    const transformed = lots
      .filter(lot => {
        // ✅ FIX: Filter out ALL parent lots that have children
        // A lot is a parent if its ID appears as parentLotId in any other lot
        // OR if its lotCode has children with -A, -B suffixes
        const isParentLot = parentLotIds.has(lot.id)
        
        if (isParentLot) {
          console.log('[LOTS API] Filtering out parent lot:', lot.lotCode, '(id:', lot.id, ')')
          return false
        }
        return true
      })
      .map((lot: any) => {
        // Get first active/planned tank assignment
        const activeAssignment = lot.TankAssignment?.find((ta: any) => 
          ta.status === 'ACTIVE' || ta.status === 'PLANNED'
        ) || lot.TankAssignment?.[0]
        
        // ✅ FIX: Get tank from Tank relation (not Equipment)
        const tank = activeAssignment?.Tank
        
        // Detect lot type
        const batchCount = lot.LotBatch.length
        const isBlendResult = batchCount > 1
        const isSplitChild = !!lot.parentLotId
        const lotType: 'single' | 'blend' | 'split' = 
          isBlendResult ? 'blend' : 
          isSplitChild ? 'split' : 
          'single'

        const firstBatch = lot.LotBatch[0]?.Batch
        
        // ✅ FIX: Get recipe name from first batch, with fallback to all batches
        let recipeName = 'Unknown'
        let recipeStyle = ''
        let recipeId: string | null = null
        
        if (firstBatch?.recipe?.name) {
          recipeName = firstBatch.recipe.name
          recipeStyle = firstBatch.recipe.style || ''
          recipeId = firstBatch.recipe.id || null
        } else {
          // Fallback: try to find recipe from any batch in the lot
          for (const lb of lot.LotBatch) {
            if (lb.Batch?.recipe?.name) {
              recipeName = lb.Batch.recipe.name
              recipeStyle = lb.Batch.recipe.style || ''
              recipeId = lb.Batch.recipe.id || null
              break
            }
          }
        }
        
        // Source info for splits
        let sourceBatchNumber: string | null = null
        if (isSplitChild && lot.Lot) {
          sourceBatchNumber = (lot.Lot as any)?.lotCode || null
        }

        // Source lots for blends
        let sourceLots: { batchNumber: string; volume: number }[] = []
        if (isBlendResult) {
          sourceLots = lot.LotBatch.map((lb: any) => ({
            batchNumber: lb.Batch?.batchNumber || '',
            volume: lb.volumeContribution ? Number(lb.volumeContribution) : 0,
          }))
        }

        // Calculate metrics
        const totalVolume = lot.actualVolume 
          ? Number(lot.actualVolume) 
          : lot.LotBatch.reduce((sum: number, lb: any) => sum + (lb.volumeContribution ? Number(lb.volumeContribution) : 0), 0)

        const packagedVolume = 0 // Will add when Prisma client is regenerated

        // Gravity
        const originalGravity = firstBatch?.originalGravity 
          ? Number(firstBatch.originalGravity) 
          : null
        const currentGravity = firstBatch?.currentGravity 
          ? Number(firstBatch.currentGravity) 
          : null

        // Progress
        const lotPhase = lot.phase || activeAssignment?.phase
        let progress = 0
        
        if (lot.status === 'COMPLETED') {
          progress = 100
        } else {
          switch (lotPhase) {
            case 'FERMENTATION': progress = 40; break
            case 'CONDITIONING': progress = 70; break
            case 'BRIGHT': progress = 85; break
            case 'PACKAGING': progress = 90; break
            default: progress = 10
          }
        }

        return {
          id: lot.id,
          lotCode: lot.lotCode || lot.id,
          lotNumber: lot.lotCode || lot.id,
          
          type: lotType,
          isBlendResult,
          isSplitChild,
          
          phase: lot.phase,
          status: lot.status,
          progress,
          
          sourceBatchNumber,
          sourceLots,
          parentLotId: lot.parentLotId,
          
          recipeName,
          recipeStyle,
          recipeId,
          
          totalVolume,
          plannedVolume: lot.plannedVolume ? Number(lot.plannedVolume) : null,
          actualVolume: lot.actualVolume ? Number(lot.actualVolume) : null,
          packagedVolume,
          remainingVolume: Math.max(0, totalVolume - packagedVolume),
          
          originalGravity,
          currentGravity,
          
          // ✅ Include tank info from Tank relation
          tank: tank ? {
            id: tank.id,
            name: tank.name,
            type: tank.type,
            capacity: tank.capacity ? Number(tank.capacity) : null,
          } : null,
          tankName: tank?.name || '-',
          tankId: tank?.id || null,
          
          createdAt: lot.createdAt,
          updatedAt: lot.updatedAt,
          
          notes: lot.notes,
          
          batchCount,
          batches: lot.LotBatch.map((lb: any) => ({
            id: lb.Batch?.id || lb.batchId,
            batchNumber: lb.Batch?.batchNumber || '',
            status: lb.Batch?.status || 'ACTIVE',
            volume: lb.Batch?.volume ? Number(lb.Batch.volume) : null,
            volumeContribution: lb.volumeContribution ? Number(lb.volumeContribution) : null,
            batchPercentage: lb.BatchPercentage ? Number(lb.BatchPercentage) : 100,
            recipeName: lb.Batch?.recipe?.name || null,
            recipeStyle: lb.Batch?.recipe?.style || null,
            originalGravity: lb.Batch?.originalGravity ? Number(lb.Batch.originalGravity) : null,
            currentGravity: lb.Batch?.currentGravity ? Number(lb.Batch.currentGravity) : null,
            brewedAt: lb.Batch?.brewedAt || null,
            // ✅ Include gravity readings
            gravityReadings: (lb.Batch?.gravityReadings || []).map((gr: any) => ({
              id: gr.id,
              gravity: gr.gravity ? Number(gr.gravity) : null,
              temperature: gr.temperature ? Number(gr.temperature) : null,
              notes: gr.notes,
              recordedAt: gr.recordedAt,
            })),
            // ✅ Include packaging runs
            packagingRuns: (lb.Batch?.packagingRuns || []).map((pr: any) => ({
              id: pr.id,
              packageType: pr.packageType,
              quantity: pr.quantity,
              volumeTotal: pr.volumeTotal ? Number(pr.volumeTotal) : 0,
              lotNumber: pr.lotNumber,
              performedBy: pr.performedBy,
              performedAt: pr.performedAt,
              notes: pr.notes,
            })),
          })),
          
          // ✅ Add aggregated packaging runs at lot level
          packagingRuns: lot.LotBatch.flatMap((lb: any) => 
            (lb.Batch?.packagingRuns || []).map((pr: any) => ({
              id: pr.id,
              batchNumber: lb.Batch?.batchNumber || '',
              packageType: pr.packageType,
              quantity: pr.quantity,
              volumeTotal: pr.volumeTotal ? Number(pr.volumeTotal) : 0,
              lotNumber: pr.lotNumber,
              performedBy: pr.performedBy,
              performedAt: pr.performedAt,
              notes: pr.notes,
            }))
          ),
        }
      })

    // Stats
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
    console.error('[LOTS API] Stack:', error.stack)
    return NextResponse.json(
      { error: 'შეცდომა', details: error.message },
      { status: 500 }
    )
  }
})