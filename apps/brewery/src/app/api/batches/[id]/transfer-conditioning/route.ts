import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@brewery/database'
import { withTenant, RouteContext } from '@/lib/api-middleware'

export const POST = withTenant<any>(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    const batchIdIndex = pathParts.indexOf('batches') + 1
    const batchId = pathParts[batchIdIndex] || (ctx as any).params?.id

    console.log('[TRANSFER_CONDITIONING] Batch ID:', batchId)

    if (!batchId) {
      return NextResponse.json({ error: 'Batch ID is required' }, { status: 400 })
    }

    const body = await req.json().catch(() => ({}))
    const { 
      targetTankId, 
      finalGravity, 
      temperature, 
      notes, 
      stayInSameTank,
      isSplit,
      allocations,
      isBlend,
      blendWithAssignmentId,
    } = body

    console.log('[TRANSFER_CONDITIONING] Body:', body)

    // Find batch
    const batch = await prisma.batch.findFirst({
      where: { id: batchId, tenantId: ctx.tenantId },
    })

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
    }

    console.log('[TRANSFER_CONDITIONING] Found batch:', batch.batchNumber, 'status:', batch.status)

    // ═══════════════════════════════════════════════════════════
    // 🔀 გაყოფის რეჟიმი
    // ═══════════════════════════════════════════════════════════
    if (isSplit && Array.isArray(allocations) && allocations.length > 0) {
      console.log('[TRANSFER_CONDITIONING] 🔀 SPLIT MODE -', allocations.length, 'tanks')
      
      // პირველ ტანკზე - მთავარი ბაჩი
      const firstAllocation = allocations[0]
      
      await prisma.batch.update({
        where: { id: batchId },
        data: {
          status: 'CONDITIONING',
          conditioningStartedAt: new Date(),
          finalGravity: finalGravity ? parseFloat(String(finalGravity)) : batch.finalGravity,
          volume: firstAllocation.volume,
          notes: `${batch.notes || ''}\nგაყოფილი კონდიცირებაზე: ${allocations.length} ავზში`,
          updatedAt: new Date(),
        },
      })

      // Equipment განახლება - პირველი ავზი
      await prisma.equipment.updateMany({
        where: { id: firstAllocation.tankId, tenantId: ctx.tenantId },
        data: { currentBatchId: batchId },
      }).catch(() => {})

      // ძველი ავზის გათავისუფლება თუ განსხვავდება
      if (batch.tankId && batch.tankId !== firstAllocation.tankId) {
        await prisma.equipment.updateMany({
          where: { id: batch.tankId, tenantId: ctx.tenantId },
          data: { currentBatchId: null, status: 'OPERATIONAL' },
        }).catch(() => {})
      }

      // დამატებითი ბაჩების შექმნა - CONDITIONING სტატუსით!
      for (let i = 1; i < allocations.length; i++) {
        const alloc = allocations[i]
        
        const newBatch = await prisma.batch.create({
          data: {
            tenantId: ctx.tenantId,
            batchNumber: `${batch.batchNumber}-${String.fromCharCode(65 + i)}`,
            recipeId: batch.recipeId,
            status: 'CONDITIONING', // ✅ CONDITIONING, არა FERMENTING!
            fermentationStartedAt: batch.fermentationStartedAt,
            conditioningStartedAt: new Date(),
            originalGravity: batch.originalGravity,
            finalGravity: finalGravity ? parseFloat(String(finalGravity)) : batch.finalGravity,
            targetOg: batch.targetOg,
            volume: alloc.volume,
            notes: `გაყოფილი ${batch.batchNumber}-დან (კონდიცირება)`,
            plannedDate: batch.plannedDate,
            createdBy: ctx.userId || 'system',
          },
        })

        // Equipment განახლება
        await prisma.equipment.updateMany({
          where: { id: alloc.tankId, tenantId: ctx.tenantId },
          data: { currentBatchId: newBatch.id },
        }).catch(() => {})

        console.log('[TRANSFER_CONDITIONING] Created split batch:', newBatch.batchNumber, '- CONDITIONING')
      }

      // Timeline
      await prisma.batchTimeline.create({
        data: {
          batchId: batchId,
          type: 'CONDITIONING_STARTED',
          title: 'კონდიცირება დაიწყო (გაყოფილი)',
          description: `გაყოფილია ${allocations.length} ავზში`,
          data: { allocations, finalGravity, temperature },
          createdBy: ctx.userId || 'system',
        },
      }).catch(() => {})

      // ✅ Create gravity reading for split conditioning start
      if (finalGravity || temperature) {
        await prisma.gravityReading.create({
          data: {
            batchId: batchId,
            gravity: finalGravity ? parseFloat(String(finalGravity)) : 1.000,
            temperature: temperature ? parseFloat(String(temperature)) : 0,
            notes: '❄️ კონდიცირებაზე გადასვლა - საბოლოო სიმკვრივე (FG)',
            recordedBy: ctx.userId || 'system',
            recordedAt: new Date(),
          },
        }).catch(() => {})
      }

      return NextResponse.json({
        success: true,
        message: `გაყოფილია ${allocations.length} ავზში (კონდიცირება)`,
        batchId,
      })
    }

    // ═══════════════════════════════════════════════════════════
    // 🔄 შერევის რეჟიმი
    // ═══════════════════════════════════════════════════════════
    if (isBlend && blendWithAssignmentId) {
      console.log('[TRANSFER_CONDITIONING] 🔄 BLEND MODE')
      
      await prisma.batch.update({
        where: { id: batchId },
        data: {
          status: 'CONDITIONING',
          conditioningStartedAt: new Date(),
          finalGravity: finalGravity ? parseFloat(String(finalGravity)) : batch.finalGravity,
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
    // 📦 ჩვეულებრივი რეჟიმი
    // ═══════════════════════════════════════════════════════════
    console.log('[TRANSFER_CONDITIONING] 📦 NORMAL MODE')

    const updateData: any = {
      status: 'CONDITIONING',
      conditioningStartedAt: new Date(),
      updatedAt: new Date(),
    }

    if (finalGravity) {
      updateData.finalGravity = parseFloat(String(finalGravity))
    }

    const updatedBatch = await prisma.batch.update({
      where: { id: batchId },
      data: updateData,
      include: {
        recipe: { select: { id: true, name: true, style: true } },
      },
    })

    console.log('[TRANSFER_CONDITIONING] ✅ Batch updated:', updatedBatch.batchNumber)

    // Equipment განახლება
    if (targetTankId && targetTankId !== batch.tankId) {
      // ძველი გათავისუფლება
      if (batch.tankId) {
        await prisma.equipment.updateMany({
          where: { id: batch.tankId, tenantId: ctx.tenantId },
          data: { currentBatchId: null, status: 'OPERATIONAL' },
        }).catch(() => {})
      }
      // ახალი მინიჭება
      await prisma.equipment.updateMany({
        where: { id: targetTankId, tenantId: ctx.tenantId },
        data: { currentBatchId: batchId },
      }).catch(() => {})
    }

    // Timeline
    await prisma.batchTimeline.create({
      data: {
        batchId: batchId,
        type: 'CONDITIONING_STARTED',
        title: 'კონდიცირება დაიწყო',
        description: notes || 'გადავიდა კონდიცირების ფაზაზე',
        data: { targetTankId, temperature, finalGravity },
        createdBy: ctx.userId || 'system',
      },
    }).catch(() => {})

    // ✅ Create gravity reading for conditioning start (FG measurement)
    if (finalGravity || temperature) {
      await prisma.gravityReading.create({
        data: {
          batchId: batchId,
          gravity: finalGravity ? parseFloat(String(finalGravity)) : 1.000,
          temperature: temperature ? parseFloat(String(temperature)) : 0,
          notes: '❄️ კონდიცირებაზე გადასვლა - საბოლოო სიმკვრივე (FG)',
          recordedBy: ctx.userId || 'system',
          recordedAt: new Date(),
        },
      }).catch((err) => {
        console.error('[TRANSFER_CONDITIONING] Failed to create gravity reading:', err.message)
      })
      console.log('[TRANSFER_CONDITIONING] ✅ Gravity reading created: FG=', finalGravity, 'Temp=', temperature)
    }

    return NextResponse.json({
      success: true,
      batchId,
      batch: updatedBatch,
      batchNumber: updatedBatch.batchNumber,
    })

  } catch (error: any) {
    console.error('[TRANSFER_CONDITIONING] ❌ Error:', error.message)

    return NextResponse.json(
      { error: 'Failed to transfer', details: error.message },
      { status: 500 }
    )
  }
})