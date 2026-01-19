import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { prisma } from '@saas-platform/database'
import { withTenant, RouteContext } from '@/lib/api-middleware'
import {
  generateLotNumber,
  generateBlendLotCode,
  checkMultipleTanksAvailability,
  validateBlendingCompatibility,
  determineFermentationScenario,
} from '@/lib/lot-helpers'

// ✅ Disable caching to ensure fresh code execution
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// ═══════════════════════════════════════════════════════════
// REQUEST INTERFACE
// ═══════════════════════════════════════════════════════════

interface StartFermentationRequest {
  batchIds: string[]
  allocations: {
    tankId: string
    volume: number
  }[]
  plannedStart: string
  plannedEnd: string
  enableBlending?: boolean
  targetLotId?: string
  notes?: string
  actualOG?: number
  temperature?: number
}

// ═══════════════════════════════════════════════════════════
// POST /api/fermentation/start
// ═══════════════════════════════════════════════════════════

export const POST = withTenant<any>(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const body: StartFermentationRequest = await req.json()
    
    console.log('[FERMENTATION/START] Request:', JSON.stringify(body, null, 2))
    console.log('[FERMENTATION/START] Tenant:', ctx.tenantId)

    // ═══════════════════════════════════════════════════════════
    // 1. VALIDATION
    // ═══════════════════════════════════════════════════════════

    if (!body.batchIds || body.batchIds.length === 0) {
      return NextResponse.json(
        { error: 'მინიმუმ ერთი ბაჩი სავალდებულოა', code: 'MISSING_BATCHES' },
        { status: 400 }
      )
    }

    if (!body.allocations || body.allocations.length === 0) {
      return NextResponse.json(
        { error: 'მინიმუმ ერთი ავზი სავალდებულოა', code: 'MISSING_ALLOCATIONS' },
        { status: 400 }
      )
    }

    const totalVolume = body.allocations.reduce((sum, a) => sum + a.volume, 0)
    if (totalVolume <= 0) {
      return NextResponse.json(
        { error: 'მოცულობა უნდა იყოს დადებითი', code: 'INVALID_VOLUME' },
        { status: 400 }
      )
    }

    const plannedStart = new Date(body.plannedStart)
    const plannedEnd = new Date(body.plannedEnd)

    if (plannedStart >= plannedEnd) {
      return NextResponse.json(
        { error: 'დაწყების თარიღი უნდა იყოს დასრულების თარიღამდე', code: 'INVALID_DATES' },
        { status: 400 }
      )
    }

    if (body.batchIds.length > 1 && body.allocations.length > 1) {
      return NextResponse.json(
        { error: 'შეუძლებელია ერთდროულად გაყოფა და შერევა', code: 'INVALID_COMBINATION' },
        { status: 400 }
      )
    }

    // ✅ Allow blending without targetLotId - will create new blend lot
    // if (body.enableBlending && !body.targetLotId) {
    //   return NextResponse.json(
    //     { error: 'შერევისთვის სამიზნე ლოტი სავალდებულოა', code: 'MISSING_TARGET_LOT' },
    //     { status: 400 }
    //   )
    // }

    if (body.targetLotId && !body.enableBlending) {
      return NextResponse.json(
        { error: 'enableBlending უნდა იყოს true როცა targetLotId მითითებულია', code: 'INVALID_BLEND_CONFIG' },
        { status: 400 }
      )
    }

    // Tank availability check - SKIP when blending to existing lot
    if (!body.enableBlending || !body.targetLotId) {
      const availabilityCheck = await checkMultipleTanksAvailability(
        body.allocations,
        plannedStart,
        plannedEnd
      )

      if (!availabilityCheck.allAvailable) {
        const unavailable = Array.from(availabilityCheck.results.entries())
          .filter(([_, result]) => !result.available)
          .map(([tankId, result]) => ({
            tankId,
            conflict: result.conflictingAssignment,
          }))

        return NextResponse.json(
          { 
            error: 'ზოგიერთი ავზი დაკავებულია არჩეულ პერიოდში',
            code: 'TANKS_UNAVAILABLE',
            unavailableTanks: unavailable,
          },
          { status: 400 }
        )
      }
    }

    // ════════════════════════════════════════════════════════════════
    // ✅ CAPACITY VALIDATION - Check each tank has enough capacity
    // ════════════════════════════════════════════════════════════════
    const tankIds = body.allocations.map(a => a.tankId)
    const tanks = await prisma.equipment.findMany({
      where: { id: { in: tankIds } },
      select: { id: true, name: true, capacity: true }
    })
    const tankMap = new Map(tanks.map(t => [t.id, t]))

    for (const allocation of body.allocations) {
      const tank = tankMap.get(allocation.tankId)
      if (!tank) {
        return NextResponse.json(
          { error: `ტანკი ვერ მოიძებნა: ${allocation.tankId}`, code: 'TANK_NOT_FOUND' },
          { status: 404 }
        )
      }
      
      const tankCapacity = parseFloat(tank.capacity?.toString() || '0')
      const requestedVolume = parseFloat(allocation.volume?.toString() || '0')
      
      // Get current volume in tank (from active assignments)
      const existingAssignments = await prisma.tankAssignment.findMany({
        where: {
          tankId: allocation.tankId,
          status: 'ACTIVE',
        },
        select: { plannedVolume: true, actualVolume: true },
      })
      
      const currentVolumeInTank = existingAssignments.reduce((sum, a) => {
        return sum + parseFloat(a.actualVolume?.toString() || a.plannedVolume?.toString() || '0')
      }, 0)
      
      const totalAfterTransfer = currentVolumeInTank + requestedVolume
      
      console.log(`[FERMENTATION/START] Tank ${tank.name}: capacity=${tankCapacity}L, current=${currentVolumeInTank}L, adding=${requestedVolume}L, total=${totalAfterTransfer}L`)
      
      if (totalAfterTransfer > tankCapacity) {
        return NextResponse.json(
          { 
            error: `ტანკი "${tank.name}" გადაივსება!`,
            details: `ტევადობა: ${tankCapacity}L, მოთხოვნილი: ${totalAfterTransfer}L (უკვე არის ${currentVolumeInTank}L + ახალი ${requestedVolume}L)`,
            code: 'TANK_OVERFLOW'
          },
          { status: 400 }
        )
      }
    }
    console.log('[FERMENTATION/START] ✅ All tanks have sufficient capacity')
    // ════════════════════════════════════════════════════════════════

    // ════════════════════════════════════════════════════════════════
    // ✅ TANK OCCUPANCY CHECK - Prevent transfer to occupied tanks
    // ════════════════════════════════════════════════════════════════
    // Skip when blending to existing lot (tank is already occupied by target lot)
    if (!body.enableBlending || !body.targetLotId) {
      for (const allocation of body.allocations) {
        const tank = tankMap.get(allocation.tankId)
        
        // Check if tank has ACTIVE assignment from ANY lot
        const occupyingAssignment = await prisma.tankAssignment.findFirst({
          where: {
            tankId: allocation.tankId,
            status: 'ACTIVE',
          },
          include: {
            Lot: {
              select: { id: true, lotCode: true, phase: true },
            },
          },
        })
        
        if (occupyingAssignment) {
          const occupyingLotCode = occupyingAssignment.Lot?.lotCode || occupyingAssignment.lotId
          
          console.log(`[FERMENTATION/START] ❌ Tank ${tank?.name} is occupied by lot: ${occupyingLotCode}`)
          
          return NextResponse.json(
            { 
              error: `ავზი "${tank?.name}" უკვე დაკავებულია!`,
              details: `ავზში უკვე არის ლოტი: ${occupyingLotCode} (ფაზა: ${occupyingAssignment.Lot?.phase || occupyingAssignment.phase})`,
              code: 'TANK_OCCUPIED',
              occupyingLotId: occupyingAssignment.lotId,
              occupyingLotCode: occupyingLotCode,
            },
            { status: 400 }
          )
        }
      }
      
      console.log('[FERMENTATION/START] ✅ All tanks are available (not occupied)')
    }
    // ════════════════════════════════════════════════════════════════

    // Verify batches exist
    const batches = await prisma.batch.findMany({
      where: {
        id: { in: body.batchIds },
        tenantId: ctx.tenantId,
      },
    })

    if (batches.length !== body.batchIds.length) {
      return NextResponse.json(
        { error: 'ზოგიერთი ბაჩი ვერ მოიძებნა', code: 'BATCHES_NOT_FOUND' },
        { status: 404 }
      )
    }

    // ═══════════════════════════════════════════════════════════
    // 2. DETERMINE SCENARIO
    // ═══════════════════════════════════════════════════════════

    const scenario = determineFermentationScenario(
      body.batchIds,
      body.allocations,
      body.enableBlending
    )

    // ✅ DEBUG: Log scenario selection
    console.log('[FERMENTATION/START] Request body:', {
      batchIds: body.batchIds,
      allocationsCount: body.allocations.length,
      enableBlending: body.enableBlending,
      targetLotId: body.targetLotId,
    })
    console.log('[FERMENTATION/START] Determined scenario:', scenario)
    
    const finalScenario = (body.enableBlending) ? 'BLEND' : scenario
    
    console.log('[FERMENTATION/START] Final scenario:', finalScenario)
    console.log('[FERMENTATION/START] enableBlending check:', body.enableBlending ? 'TRUE → BLEND' : 'FALSE → ' + scenario)

    // ═══════════════════════════════════════════════════════════
    // 3. EXECUTE SCENARIO
    // ═══════════════════════════════════════════════════════════

    let result: any

    switch (finalScenario) {
      case 'SIMPLE':
        result = await handleSimpleStart(ctx.tenantId, ctx.userId, body, batches[0])
        break
      case 'SPLIT':
        result = await handleSplitStart(ctx.tenantId, ctx.userId, body, batches[0])
        break
      case 'BLEND':
        result = await handleBlendStart(ctx.tenantId, ctx.userId, body, batches)
        break
    }

    console.log('[FERMENTATION/START] ✅ Success:', result.lot?.id || result.message)

    return NextResponse.json({
      success: true,
      scenario: finalScenario,
      ...result,
    })

  } catch (error: any) {
    console.error('[FERMENTATION/START] ❌ Error:', error.message)
    console.error('[FERMENTATION/START] Stack:', error.stack)

    return NextResponse.json(
      { error: 'ფერმენტაციის დაწყება ვერ მოხერხდა', details: error.message },
      { status: 500 }
    )
  }
})

// ═══════════════════════════════════════════════════════════
// SCENARIO A: SIMPLE START (1 Batch → 1 Tank)
// ═══════════════════════════════════════════════════════════

async function handleSimpleStart(
  tenantId: string,
  userId: string,
  body: StartFermentationRequest,
  batch: any
) {
  const alloc = body.allocations[0]
  const lotNumber = await generateLotNumber(tenantId, 'FERMENTATION')

  // Get tank name for timeline
  const tank = await prisma.equipment.findUnique({
    where: { id: alloc.tankId },
    select: { name: true }
  })
  const tankName = tank?.name || alloc.tankId

  const result = await prisma.$transaction(async (tx) => {
    // 1. Create Lot
    const lot = await tx.lot.create({
      data: {
        id: randomUUID(),
        tenantId,
        lotCode: lotNumber,  // ✅ FIX: lotNumber → lotCode
        phase: 'FERMENTATION',
        status: 'ACTIVE',
        notes: body.notes,
        createdBy: userId,
        updatedAt: new Date(),
        plannedVolume: alloc.volume || 0,
      } as any,
    })

    // 2. Create LotBatch
    await tx.lotBatch.create({
      data: {
        id: randomUUID(),
        lotId: lot.id,
        batchId: batch.id,
        volumeContribution: alloc.volume,
        batchPercentage: 100,
      },
    })

    // 3. Create TankAssignment
    const assignment = await tx.tankAssignment.create({
      data: {
        id: randomUUID(),
        tenantId,
        tankId: alloc.tankId,
        lotId: lot.id,
        plannedStart: new Date(body.plannedStart),
        plannedEnd: new Date(body.plannedEnd),
        plannedVolume: alloc.volume,
        phase: 'FERMENTATION',
        status: 'ACTIVE',
        updatedAt: new Date(),
        createdBy: userId || 'system',
      } as any,
    })

    // 4. Update Equipment table for UI display
    await tx.equipment.update({
      where: { id: alloc.tankId },
      data: { 
        status: 'OPERATIONAL',
        currentBatchId: batch.id,
        currentBatchNumber: batch.batchNumber,
      },
    }).catch(() => {
      console.log('[FERMENTATION/START] Equipment update skipped')
    })

    // 6. Update Batch status
    await tx.batch.update({
      where: { id: batch.id },
      data: { status: 'FERMENTING' },
    })

    // 7. Create Timeline Event
    await tx.batchTimeline.create({
      data: {
        id: randomUUID(),
        batchId: batch.id,
        type: 'FERMENTATION_STARTED',
        title: 'ფერმენტაცია დაიწყო',
        description: `ავზი: ${tankName}, მოცულობა: ${alloc.volume}L`,
        data: { 
          lotId: lot.id, 
          tankId: alloc.tankId,
          tankName,
          volume: alloc.volume,
          actualOG: body.actualOG,
          temperature: body.temperature,
        },
        createdBy: userId || 'system',
      },
    })

    // 8. Create OG gravity reading
    if (body.actualOG) {
      await tx.gravityReading.create({
        data: {
          id: randomUUID(),
          batchId: batch.id,
          gravity: body.actualOG,
          temperature: body.temperature || 20,
          recordedAt: new Date(),
          recordedBy: userId || 'system',
          notes: '🍺 ფერმენტაციის დაწყება - საწყისი სიმკვრივე (OG)',
        },
      })
      console.log('[FERMENTATION/START] ✅ Created OG reading:', body.actualOG)
    }

    return { lot, assignment, tankName }
  })

  return result
}

// ═══════════════════════════════════════════════════════════
// SCENARIO B: SPLIT START (1 Batch → N Tanks)
// ═══════════════════════════════════════════════════════════

async function handleSplitStart(
  tenantId: string,
  userId: string,
  body: StartFermentationRequest,
  batch: any
) {
  const totalVolume = body.allocations.reduce((sum, a) => sum + a.volume, 0)
  const parentLotNumber = await generateLotNumber(tenantId, 'FERMENTATION')

  // Get tank names
  const tankIds = body.allocations.map(a => a.tankId)
  const tanks = await prisma.equipment.findMany({
    where: { id: { in: tankIds } },
    select: { id: true, name: true }
  })
  const tankNameMap = new Map(tanks.map(t => [t.id, t.name]))

  const result = await prisma.$transaction(async (tx) => {
    // 1. Create Parent Lot
    const parentLot = await tx.lot.create({
      data: {
        id: randomUUID(),
        tenantId,
        lotCode: parentLotNumber,  // ✅ FIX: lotNumber → lotCode
        phase: 'FERMENTATION',
        status: 'ACTIVE',
        notes: `გაყოფილი ${body.allocations.length} ავზში. ${body.notes || ''}`,
        createdBy: userId,
        updatedAt: new Date(),
        plannedVolume: totalVolume,
      } as any,
    })

    // 2. Create LotBatch for parent
    await tx.lotBatch.create({
      data: {
        id: randomUUID(),
        lotId: parentLot.id,
        batchId: batch.id,
        volumeContribution: totalVolume,
        batchPercentage: 100,
      },
    })

    const childLots = []
    const assignments = []

    // 3. Create child lots and assignments
    for (let i = 0; i < body.allocations.length; i++) {
      const alloc = body.allocations[i]
      const tankName = tankNameMap.get(alloc.tankId) || alloc.tankId

      // Create child lot
      const childLot = await tx.lot.create({
        data: {
          id: randomUUID(),
          tenantId,
          lotCode: `${parentLotNumber}-${String.fromCharCode(65 + i)}`,  // ✅ FIX: lotNumber → lotCode
          phase: 'FERMENTATION',
          status: 'ACTIVE',
          parentLotId: parentLot.id,
          createdBy: userId,
          updatedAt: new Date(),
          plannedVolume: alloc.volume,
        } as any,
      })
      childLots.push(childLot)

      // ✅ Create LotBatch for child lot too (so it appears in API)
      await tx.lotBatch.create({
        data: {
          id: randomUUID(),
          lotId: childLot.id,
          batchId: batch.id,
          volumeContribution: alloc.volume || 0,
          batchPercentage: Math.round((alloc.volume / totalVolume) * 100),
        },
      })

      // Create TankAssignment
      const assignment = await tx.tankAssignment.create({
        data: {
          id: randomUUID(),
          tenantId,
          tankId: alloc.tankId,
          lotId: childLot.id,
          plannedStart: new Date(body.plannedStart),
          plannedEnd: new Date(body.plannedEnd),
          plannedVolume: alloc.volume,
          phase: 'FERMENTATION',
          status: 'ACTIVE',
          updatedAt: new Date(),
          createdBy: userId || 'system',
        } as any,
      })
      assignments.push(assignment)

      // Update Equipment
      await tx.equipment.update({
        where: { id: alloc.tankId },
        data: { 
          status: 'OPERATIONAL',
          currentBatchId: batch.id,
          currentBatchNumber: batch.batchNumber,
        },
      }).catch(() => {})

      // Transfer record
      await tx.transfer.create({
        data: {
          id: randomUUID(),
          tenantId,
          transferCode: `SPLIT-${Date.now()}-${i}`,
          transferType: 'SPLIT',
          sourceTankId: body.allocations[0].tankId,  // source tank
          destTankId: alloc.tankId,                   // destination tank
          sourceLotId: parentLot.id,
          destLotId: childLot.id,
          volume: alloc.volume,
          plannedAt: new Date(body.plannedStart),
          performedBy: userId || 'system',
          status: 'COMPLETED',
          executedAt: new Date(),
        } as any,
      })
    }

    // 4. Update Batch status
    await tx.batch.update({
      where: { id: batch.id },
      data: { status: 'FERMENTING' },
    })

    // 5. Timeline
    const tankNames = body.allocations.map(a => tankNameMap.get(a.tankId) || a.tankId).join(', ')
    await tx.batchTimeline.create({
      data: {
        id: randomUUID(),
        batchId: batch.id,
        type: 'FERMENTATION_STARTED',
        title: 'ფერმენტაცია დაიწყო (გაყოფილი)',
        description: `ავზები: ${tankNames}`,
        data: { 
          lotId: parentLot.id, 
          childLots: childLots.map(l => l.id),
          tankIds,
        },
        createdBy: userId || 'system',
      },
    })

    // 6. OG reading
    if (body.actualOG) {
      await tx.gravityReading.create({
        data: {
          id: randomUUID(),
          batchId: batch.id,
          gravity: body.actualOG,
          temperature: body.temperature || 20,
          recordedAt: new Date(),
          recordedBy: userId || 'system',
          notes: '🍺 ფერმენტაციის დაწყება - საწყისი სიმკვრივე (OG)',
        },
      })
    }

    return { lot: parentLot, childLots, assignments }
  })

  return {
    lot: result.lot,
    childLots: result.childLots,
    assignments: result.assignments,
    message: `გაყოფილია ${body.allocations.length} ავზში`,
  }
}

// ═══════════════════════════════════════════════════════════
// SCENARIO C: BLEND START (N Batches → 1 Tank via existing Lot)
// ═══════════════════════════════════════════════════════════

async function handleBlendStart(
  tenantId: string,
  userId: string,
  body: StartFermentationRequest,
  batches: any[]
) {
  // Validate blending compatibility
  const compatibility = await validateBlendingCompatibility(body.batchIds)
  if (!compatibility.compatible) {
    throw new Error(compatibility.errors.join('; '))
  }

  const alloc = body.allocations[0]
  const volumePerBatch = alloc.volume / batches.length

  console.log('[BLEND] Starting blend to lot:', body.targetLotId)
  console.log('[BLEND] Adding batches:', batches.map(b => b.batchNumber).join(', '))

  const result = await prisma.$transaction(async (tx) => {
    let targetLot: any
    let existingAssignment: any
    let targetTankId: string
    let targetTankName: string

    // ✅ If targetLotId provided, use existing lot
    if (body.targetLotId) {
      targetLot = await tx.lot.findUnique({
        where: { id: body.targetLotId },
        include: {
          TankAssignment: {
            where: { status: { in: ['PLANNED', 'ACTIVE'] } },
            take: 1,
            include: {
              Tank: { select: { id: true, name: true } }
            } as any
          },
        },
      })

      if (!targetLot) {
        throw new Error('სამიზნე ლოტი ვერ მოიძებნა')
      }

      existingAssignment = (targetLot.TankAssignment[0] as any)
      targetTankId = existingAssignment?.tankId
      targetTankName = existingAssignment?.Tank?.name
      
      console.log('[BLEND] Using existing lot:', targetLot.id)
      console.log('[BLEND] Target tank:', targetTankName)
    } else {
      // ✅ Create NEW blend lot with BLEND-2026-0001 code
      const blendCode = await generateBlendLotCode(tenantId)
      const internalLotNumber = await generateLotNumber(tenantId, 'FERMENTATION')

      console.log('[BLEND] Creating new blend lot with code:', blendCode)

      // Get tank from allocations
      targetTankId = alloc.tankId
      const targetTank = await tx.equipment.findUnique({
        where: { id: targetTankId },
        select: { name: true }
      })
      targetTankName = targetTank?.name || targetTankId

      // Create new blend lot
      targetLot = await tx.lot.create({
        data: {
          id: randomUUID(),
          tenantId,
          lotCode: blendCode,
          phase: 'FERMENTATION',
          status: 'ACTIVE',
          isBlendResult: true,
          isBlendTarget: true,  // ✅ Mark as blend target
          notes: body.notes || `შერეული ${batches.length} ბაჩი`,
          createdBy: userId,
          updatedAt: new Date(),
          plannedVolume: alloc.volume,
        } as any,
      })

      // Create tank assignment for new blend lot
      existingAssignment = await tx.tankAssignment.create({
        data: {
          id: randomUUID(),
          tenantId,
          tankId: targetTankId,
          lotId: targetLot.id,
          plannedStart: new Date(body.plannedStart),
          plannedEnd: new Date(body.plannedEnd),
          plannedVolume: alloc.volume,
          phase: 'FERMENTATION',
          status: 'ACTIVE',
          updatedAt: new Date(),
          createdBy: userId || 'system',
        } as any,
      })

      console.log('[BLEND] Created new blend lot:', blendCode)
      console.log('[BLEND] Target tank:', targetTankName)
    }

    // Add LotBatch records for each batch
    for (const batch of batches) {
      await tx.lotBatch.create({
        data: {
          id: randomUUID(),
          lotId: targetLot.id,
          batchId: batch.id,
          volumeContribution: volumePerBatch,
          batchPercentage: 100 / batches.length,
        },
      })
      console.log('[BLEND] Added batch to lot:', batch.batchNumber)

      // Update Batch status
      await tx.batch.update({
        where: { id: batch.id },
        data: { status: 'FERMENTING' },
      })

      // Timeline for each batch
      await tx.batchTimeline.create({
        data: {
          id: randomUUID(),
          batchId: batch.id,
          type: 'NOTE',
          title: 'ბაჩი შეერია',
          description: `შეერია ლოტში, ავზი: ${targetTankName || 'N/A'}`,
          data: { lotId: targetLot.id, volume: volumePerBatch, tankId: targetTankId },
          createdBy: userId || 'system',
        },
      })

      // OG reading for blended batch
      if (body.actualOG) {
        await tx.gravityReading.create({
          data: {
            id: randomUUID(),
            batchId: batch.id,
            gravity: body.actualOG,
            temperature: body.temperature || 20,
            recordedAt: new Date(),
            recordedBy: userId || 'system',
            notes: '🔄 შერევა - საწყისი სიმკვრივე (OG)',
          },
        })
      }
    }

    // ✅ Mark lot as blend result AND update lotCode to BLEND format
    if (batches.length > 0) {
      // Check if lot already has a BLEND code (avoid re-generating)
      const needsBlendCode = !targetLot.lotCode?.startsWith('BLEND-')
      
      let updateData: any = { 
        isBlendResult: true,
        blendedAt: new Date(),
      }
      
      // Generate BLEND code if this is the first time becoming a blend
      if (needsBlendCode) {
        const blendCode = await generateBlendLotCode(tenantId)
        updateData.lotCode = blendCode
        console.log('[BLEND] Generating new lotCode:', blendCode)
      }
      
      await tx.lot.update({
        where: { id: targetLot.id },
        data: updateData,
      })
      
      console.log('[BLEND] Marked lot as blend result:', targetLot.id, 'lotCode:', updateData.lotCode || targetLot.lotCode)
    }

    // ✅ CAPACITY CHECK for blend mode
    if (existingAssignment) {
      // Get current volume in the tank
      const currentVolume = parseFloat(existingAssignment.plannedVolume?.toString() || '0')
      const addingVolume = alloc.volume
      const totalAfterBlend = currentVolume + addingVolume
      
      // Get tank capacity
      const blendTank = await tx.equipment.findUnique({
        where: { id: existingAssignment.tankId },
        select: { name: true, capacity: true },
      })
      
      const tankCapacity = parseFloat(blendTank?.capacity?.toString() || '0')
      
      console.log(`[BLEND] Capacity check: tank=${blendTank?.name}, capacity=${tankCapacity}L, current=${currentVolume}L, adding=${addingVolume}L, total=${totalAfterBlend}L`)
      
      if (totalAfterBlend > tankCapacity) {
        throw new Error(
          `ტანკი "${blendTank?.name}" გადაივსება შერევის შემდეგ! ტევადობა: ${tankCapacity}L, შერევის შემდეგ: ${totalAfterBlend}L`
        )
      }
      
      // Update TankAssignment volume
      await tx.tankAssignment.update({
        where: { id: existingAssignment.id },
        data: {
          plannedVolume: { increment: addingVolume },
          updatedAt: new Date(),
        },
      })
      console.log('[BLEND] Updated TankAssignment volume by:', addingVolume)
    }

    // ❌ DO NOT release any tanks! Blended batches go into existing tank.

    return { lot: targetLot, tankName: targetTankName }
  })

  console.log('[BLEND] ✅ Success:', result.lot.id, 'in tank:', result.tankName)

  return {
    lot: result.lot,
    batchCount: batches.length,
    tankName: result.tankName,
    message: `${batches.length} ბაჩი შეერია ავზში ${result.tankName || 'N/A'}`,
    warnings: compatibility.warnings,
  }
}