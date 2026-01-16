import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@saas-platform/database'
import { withTenant, RouteContext } from '@/lib/api-middleware'

// ═══════════════════════════════════════════════════════════
// GET /api/lots/active?phase=FERMENTATION
// Returns lots available for blending
// ═══════════════════════════════════════════════════════════

export const GET = withTenant<any>(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const url = new URL(req.url)
    const phase = url.searchParams.get('phase') || 'FERMENTATION'

    const activeLots = await prisma.lot.findMany({
      where: {
        tenantId: ctx.tenantId,
        phase: phase as any,
        status: { in: ['PLANNED', 'ACTIVE'] },
        // Only top-level lots (not children) for blending
        parentLotId: null,
        // ✅ Only lots that have at least one batch
        LotBatch: { some: {} },
      },
      include: {
        LotBatch: {
          include: {
            Batch: {
              select: {
                id: true,
                batchNumber: true,
                status: true,  // ✅ ADD: Include batch status for filtering
                recipe: {
                  select: { id: true, name: true, style: true, yeastStrain: true },
                },
              },
            },
          },
        },
        // ✅ ყველა assignment-ს ვიღებთ, არა მხოლოდ ACTIVE-ს
        TankAssignment: {
          where: {
            status: { in: ['PLANNED', 'ACTIVE'] },  // ✅ PLANNED-იც!
          },
          include: {
            // ✅ FIX: Changed from Tank to Equipment (correct relation name)
            Equipment: {
              select: {
                id: true,
                name: true,
                type: true,
                capacity: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Format response with tank info - matching what StartFermentationModalV2 expects
    const transformed = activeLots
      .map(lot => {
        const assignment = lot.TankAssignment[0] as any
        
        // ✅ FIX: Filter out LotBatch entries where Batch is deleted OR COMPLETED
        const validLotBatches = lot.LotBatch.filter(lb => {
          if (!lb.Batch) return false
          // ✅ Exclude COMPLETED batches from blending
          const batchStatus = (lb.Batch as any).status?.toUpperCase()
          if (batchStatus === 'COMPLETED') {
            console.log(`[LOTS/ACTIVE] Filtering out completed batch: ${lb.Batch.batchNumber}`)
            return false
          }
          return true
        })
        
        const totalVolume = validLotBatches.reduce(
          (sum, lb) => sum + parseFloat(lb.volumeContribution.toString()),
          0
        )
        const batch = validLotBatches[0]?.Batch

        return {
          id: lot.id,
          lotNumber: (lot as any).lotCode || lot.id,
          phase: lot.phase,
          status: lot.status,
          
          // ✅ Fields expected by StartFermentationModalV2 dropdown
          batchNumber: batch?.batchNumber || '-',
          recipeName: batch?.recipe?.name || '-',
          // ✅ FIX: Changed from Tank to Equipment
          tankName: assignment?.Equipment?.name || '-',
          totalVolume: totalVolume,
          
          // Batch info (detailed)
          batches: validLotBatches.map(lb => ({
            id: lb.Batch!.id,
            batchNumber: lb.Batch!.batchNumber,
            recipeName: lb.Batch!.recipe?.name,
            volume: lb.volumeContribution,
          })),
          
          // Tank info - ✅ FIX: Changed from Tank to Equipment
          Tank: assignment?.Equipment || null,
          tankId: assignment?.tankId || null,
          tankCapacity: assignment?.Equipment?.capacity || 0,
          remainingCapacity: assignment 
            ? (parseFloat(assignment.Equipment?.capacity?.toString() || '0')) - totalVolume
            : 0,
          
          // Volume info
          volume: totalVolume,
          batchCount: validLotBatches.length,
          assignmentId: assignment?.id || null,
          
          // ✅ ADD: Check if lot has active tank assignment
          hasActiveTank: !!assignment?.tankId,
          
          // For blending compatibility check
          canBlend: true,
        }
      })
      // ✅ FIX: Filter out lots with:
      // 1. No volume
      // 2. No valid batches (all completed or orphaned)
      // 3. No active tank assignment
      .filter(lot => {
        if (lot.totalVolume <= 0) {
          console.log(`[LOTS/ACTIVE] Filtering out lot with no volume: ${lot.lotNumber}`)
          return false
        }
        if (lot.batchCount <= 0) {
          console.log(`[LOTS/ACTIVE] Filtering out lot with no valid batches: ${lot.lotNumber}`)
          return false
        }
        if (!lot.hasActiveTank) {
          console.log(`[LOTS/ACTIVE] Filtering out lot with no active tank: ${lot.lotNumber}`)
          return false
        }
        return true
      })

    console.log(`[LOTS/ACTIVE] Found ${transformed.length} active lots for phase: ${phase || 'all'}`)

    // ✅ Return wrapped in { lots: [...] } as expected by modal
    return NextResponse.json({ lots: transformed })

  } catch (error: any) {
    console.error('[LOTS/ACTIVE] Error:', error.message)
    return NextResponse.json(
      { error: 'შეცდომა', details: error.message },
      { status: 500 }
    )
  }
})