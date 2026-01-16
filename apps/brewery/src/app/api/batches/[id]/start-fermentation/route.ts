import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@saas-platform/database'
import { withTenant, RouteContext } from '@/lib/api-middleware'

// ✅ Helper: Parse date string to local date (avoid timezone conversion)
const parseLocalDate = (dateStr: string | null | undefined): Date => {
  if (!dateStr) return new Date()
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (match) {
    const [, year, month, day] = match
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 12, 0, 0)
  }
  return new Date(dateStr)
}

export const POST = withTenant(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    const batchIdIndex = pathParts.indexOf('batches') + 1
    const batchId = pathParts[batchIdIndex] || (ctx as any).params?.id

    console.log('[START_FERMENTATION] Batch ID:', batchId)

    if (!batchId) {
      return NextResponse.json({ error: 'Batch ID is required' }, { status: 400 })
    }

    const body = await req.json().catch(() => ({}))
    const { 
      tankId, 
      actualOG, 
      temperature, 
      notes,
      isSplit,
      allocations,
      isBlend,
      blendWithAssignmentId,
      plannedStart,  // ✅ Add plannedStart parameter
    } = body

    console.log('[START_FERMENTATION] Body:', body)

    // Find batch
    const batch = await prisma.batch.findFirst({
      where: { id: batchId, tenantId: ctx.tenantId },
    })

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
    }

    console.log('[START_FERMENTATION] Found batch:', batch.batchNumber)

    // ═══════════════════════════════════════════════════════════
    // გაყოფის რეჟიმი
    // ═══════════════════════════════════════════════════════════
    if (isSplit && Array.isArray(allocations) && allocations.length > 0) {
      console.log('[START_FERMENTATION] 🔀 SPLIT MODE -', allocations.length, 'tanks')
      
      // პირველ ტანკზე - მთავარი ბაჩი (volume-ს ვანახლებთ)
      const firstAllocation = allocations[0]
      
      await prisma.batch.update({
        where: { id: batchId },
        data: {
          status: 'FERMENTING',
          fermentationStartedAt: plannedStart ? parseLocalDate(plannedStart) : new Date(),  // ✅ Use plannedStart if provided
          originalGravity: actualOG ? parseFloat(String(actualOG)) : batch.originalGravity,
          volume: firstAllocation.volume, // ✅ volume განახლება
          tankId: firstAllocation.tankId,  // ✅ Save tankId for history (references Equipment.id)
          notes: `${batch.notes || ''}\nგაყოფილი: ${allocations.length} ავზში`,
          updatedAt: new Date(),
        },
      })

      // Equipment განახლება
      await prisma.equipment.updateMany({
        where: { id: firstAllocation.tankId, tenantId: ctx.tenantId },
        data: { currentBatchId: batchId },
      }).catch(() => {})

      // დამატებითი ბაჩების შექმნა
      for (let i = 1; i < allocations.length; i++) {
        const alloc = allocations[i]
        
        const newBatch = await prisma.batch.create({
          data: {
            tenantId: ctx.tenantId,
            batchNumber: `${batch.batchNumber}-${String.fromCharCode(65 + i)}`,
            recipeId: batch.recipeId,
            status: 'FERMENTING',
            fermentationStartedAt: plannedStart ? parseLocalDate(plannedStart) : new Date(),  // ✅ Use plannedStart if provided
            originalGravity: actualOG ? parseFloat(String(actualOG)) : batch.originalGravity,
            targetOg: batch.targetOg,
            volume: alloc.volume, // ✅ volume სავალდებულო
            tankId: alloc.tankId,  // ✅ Save tankId for history (references Equipment.id)
            notes: `გაყოფილი ${batch.batchNumber}-დან`,
            plannedDate: batch.plannedDate,
            createdBy: ctx.userId || 'system',
          },
        })

        // Equipment განახლება
        await prisma.equipment.updateMany({
          where: { id: alloc.tankId, tenantId: ctx.tenantId },
          data: { currentBatchId: newBatch.id },
        }).catch(() => {})

        console.log('[START_FERMENTATION] Created split batch:', newBatch.batchNumber)
      }

      // Timeline
      await prisma.batchTimeline.create({
        data: {
          batchId: batchId,
          type: 'FERMENTATION_STARTED',
          title: 'ფერმენტაცია დაიწყო (გაყოფილი)',
          description: `გაყოფილია ${allocations.length} ავზში`,
          data: { allocations, actualOG, temperature },
          createdBy: ctx.userId || 'system',
        },
      }).catch(() => {})

      return NextResponse.json({
        success: true,
        message: `გაყოფილია ${allocations.length} ავზში`,
        batchId,
      })
    }

    // ═══════════════════════════════════════════════════════════
    // შერევის რეჟიმი
    // ═══════════════════════════════════════════════════════════
    if (isBlend && blendWithAssignmentId) {
      console.log('[START_FERMENTATION] 🔄 BLEND MODE')
      
      await prisma.batch.update({
        where: { id: batchId },
        data: {
          status: 'FERMENTING',
          fermentationStartedAt: plannedStart ? parseLocalDate(plannedStart) : new Date(),  // ✅ Use plannedStart if provided
          originalGravity: actualOG ? parseFloat(String(actualOG)) : batch.originalGravity,
          notes: `${batch.notes || ''}\nშერეული: ${blendWithAssignmentId}`,
          updatedAt: new Date(),
        },
      })

      return NextResponse.json({
        success: true,
        message: 'შერევა წარმატებით დასრულდა',
        batchId,
      })
    }

    // ═══════════════════════════════════════════════════════════
    // ჩვეულებრივი რეჟიმი
    // ═══════════════════════════════════════════════════════════
    console.log('[START_FERMENTATION] 📦 NORMAL MODE - Tank:', tankId)

    if (!tankId) {
      return NextResponse.json({ error: 'Tank ID is required' }, { status: 400 })
    }

    const updatedBatch = await prisma.batch.update({
      where: { id: batchId },
      data: {
        status: 'FERMENTING',
        fermentationStartedAt: plannedStart ? parseLocalDate(plannedStart) : new Date(),  // ✅ Use plannedStart if provided
        originalGravity: actualOG ? parseFloat(String(actualOG)) : batch.originalGravity,
        tankId: tankId,  // ✅ Save tankId for history (references Equipment.id)
        updatedAt: new Date(),
      },
      include: {
        recipe: { select: { id: true, name: true, style: true } },
      },
    })

    console.log('[START_FERMENTATION] ✅ Batch updated:', updatedBatch.batchNumber)

    // Equipment განახლება
    await prisma.equipment.updateMany({
      where: { id: tankId, tenantId: ctx.tenantId },
      data: { currentBatchId: batchId },
    }).catch(() => {})

    // Timeline
    await prisma.batchTimeline.create({
      data: {
        batchId: batchId,
        type: 'FERMENTATION_STARTED',
        title: 'ფერმენტაცია დაიწყო',
        description: notes || 'დაიწყო ფერმენტაციის პროცესი',
        data: { tankId, actualOG, temperature },
        createdBy: ctx.userId || 'system',
      },
    }).catch(() => {})

    return NextResponse.json({
      success: true,
      batchId,
      batch: updatedBatch,
      batchNumber: updatedBatch.batchNumber,
    })

  } catch (error: any) {
    console.error('[START_FERMENTATION] ❌ Error:', error.message)

    return NextResponse.json(
      { error: 'Failed to start fermentation', details: error.message },
      { status: 500 }
    )
  }
})
