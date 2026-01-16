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
        // ✅ Include TankAssignment with Equipment relation
        TankAssignment: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            // ✅ Use Equipment - this is the relation name in schema
            Equipment: {
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
        other_Lot: {
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

    console.log('[LOTS API] Found', lots.length, 'lots')

    // Transform
    const transformed = lots
      .filter(lot => {
        // ✅ FIX: Filter out ALL parent lots that have children (regardless of child status)
        const hasChildren = lot.other_Lot && lot.other_Lot.length > 0
        
        if (hasChildren) {
          console.log('[LOTS API] Filtering out parent lot:', lot.lotCode)
          return false
        }
        return true
      })
      .map(lot => {
        // Get first active/planned tank assignment
        const activeAssignment = lot.TankAssignment?.find((ta: any) => 
          ta.status === 'ACTIVE' || ta.status === 'PLANNED'
        ) || lot.TankAssignment?.[0]
        
        // ✅ Get tank from Equipment relation
        const tank = (activeAssignment as any)?.Equipment
        
        // Detect lot type
        const batchCount = lot.LotBatch.length
        const isBlendResult = lot.isBlendResult === true || batchCount > 1
        const isSplitChild = !!lot.parentLotId
        const lotType: 'single' | 'blend' | 'split' = 
          isBlendResult ? 'blend' : 
          isSplitChild ? 'split' : 
          'single'

        const firstBatch = lot.LotBatch[0]?.Batch
        
        // Source info for splits
        let sourceBatchNumber: string | null = null
        if (isSplitChild && lot.Lot) {
          sourceBatchNumber = (lot.Lot as any)?.lotCode || null
        }

        // Source lots for blends
        let sourceLots: { batchNumber: string; volume: number }[] = []
        if (isBlendResult) {
          sourceLots = lot.LotBatch.map(lb => ({
            batchNumber: lb.Batch?.batchNumber || '',
            volume: lb.volumeContribution ? Number(lb.volumeContribution) : 0,
          }))
        }

        // Calculate metrics
        const totalVolume = lot.actualVolume 
          ? Number(lot.actualVolume) 
          : lot.LotBatch.reduce((sum, lb) => sum + (lb.volumeContribution ? Number(lb.volumeContribution) : 0), 0)

        const packagedVolume = 0 // Will add when Prisma client is regenerated

        // Gravity
        const originalGravity = firstBatch?.originalGravity 
          ? Number(firstBatch.originalGravity) 
          : null
        const currentGravity = firstBatch?.currentGravity 
          ? Number(firstBatch.currentGravity) 
          : null

        // Progress
        const lotPhase = lot.phase || (activeAssignment as any)?.phase
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
          
          recipeName: firstBatch?.recipe?.name || 'Unknown',
          recipeStyle: firstBatch?.recipe?.style || '',
          recipeId: firstBatch?.recipe?.id || null,
          
          totalVolume,
          plannedVolume: lot.plannedVolume ? Number(lot.plannedVolume) : null,
          actualVolume: lot.actualVolume ? Number(lot.actualVolume) : null,
          packagedVolume,
          remainingVolume: Math.max(0, totalVolume - packagedVolume),
          
          originalGravity,
          currentGravity,
          
          // ✅ Include tank info from Equipment relation
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
          blendedAt: lot.blendedAt,
          splitAt: lot.splitAt,
          
          notes: lot.notes,
          
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
          packagingRuns: lot.LotBatch.flatMap(lb => 
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
