import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@saas-platform/database'
import { withTenant, RouteContext } from '@/lib/api-middleware'

export const GET = withTenant(async (req: NextRequest, ctx: RouteContext) => {
  try {
    console.log('[GET_ACTIVE_ASSIGNMENTS] Tenant ID:', ctx.tenantId)

    const url = new URL(req.url)
    const phaseFilter = url.searchParams.get('phase') // FERMENTATION or CONDITIONING

    // ═══════════════════════════════════════════════════════════
    // პირდაპირ Batch-ებიდან წამოვიღოთ აქტიური ბაჩები
    // (TankAssignment ცხრილი შეიძლება ცარიელი იყოს)
    // ═══════════════════════════════════════════════════════════
    
    const whereClause: any = {
      tenantId: ctx.tenantId,
      status: {
        in: phaseFilter 
          ? [phaseFilter === 'FERMENTATION' ? 'FERMENTING' : 'CONDITIONING'] 
          : ['FERMENTING', 'CONDITIONING'],
      },
    }

    const activeBatches = await prisma.batch.findMany({
      where: whereClause,
      include: {
        tank: {
          select: { id: true, name: true, type: true, capacity: true },
        },
        recipe: {
          select: { id: true, name: true, style: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    console.log('[GET_ACTIVE_ASSIGNMENTS] Found batches:', activeBatches.length)

    // ტრანსფორმაცია assignment-ის ფორმატში
    const assignments = activeBatches.map(batch => {
      // Equipment-დან ავზის ინფო თუ tank არ არის
      let tankName = batch.tank?.name || 'N/A'
      let tankType = batch.tank?.type || 'UNKNOWN'
      let tankCapacity = batch.tank?.capacity || 0

      return {
        id: `batch-${batch.id}`, // უნიკალური ID
        tankId: batch.tankId,
        tankName: tankName,
        tankType: tankType,
        tankCapacity: tankCapacity,
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        recipeName: batch.recipe?.name || 'N/A',
        recipeStyle: batch.recipe?.style || '',
        volume: parseFloat(batch.volume?.toString() || '0'),
        phase: batch.status === 'FERMENTING' ? 'FERMENTATION' : 'CONDITIONING',
        status: batch.status,
        startDate: batch.fermentationStartedAt || batch.conditioningStartedAt || batch.createdAt,
        isBlendable: true,
      }
    })

    console.log('[GET_ACTIVE_ASSIGNMENTS] ✅ Returning:', assignments.length, 'assignments')

    return NextResponse.json({
      assignments,
      count: assignments.length,
    })

  } catch (error: any) {
    console.error('[GET_ACTIVE_ASSIGNMENTS] Error:', error.message)
    return NextResponse.json(
      { error: 'Failed to fetch active assignments', details: error.message },
      { status: 500 }
    )
  }
})
