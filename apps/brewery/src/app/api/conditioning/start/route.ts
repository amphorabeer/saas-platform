import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@brewery/database'
import { withTenant, RouteContext } from '@/lib/api-middleware'
import { randomUUID } from 'crypto'

// ✅ Disable caching to ensure fresh code execution
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
import { generateLotNumber, generateBlendLotCode, checkMultipleTanksAvailability } from '@/lib/lot-helpers'

interface StartConditioningRequest {
  sourceLotId?: string
  sourceTankId?: string
  batchId: string
  allocations?: { tankId: string; volume: number }[]
  plannedStart: string
  plannedEnd: string
  finalGravity?: number
  temperature?: number
  notes?: string
  stayInSameTank?: boolean
  isSplit?: boolean
  enableBlending?: boolean
  targetLotId?: string
}

export const POST = withTenant<any>(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const body: StartConditioningRequest = await req.json()
    
    console.log('[CONDITIONING/START] Request:', JSON.stringify(body, null, 2))

    const plannedStart = new Date(body.plannedStart)
    const plannedEnd = new Date(body.plannedEnd)

    // Find batch
    const batch = await prisma.batch.findFirst({
      where: { id: body.batchId, tenantId: ctx.tenantId },
    })

    if (!batch) {
      return NextResponse.json({ error: 'ბაჩი ვერ მოიძებნა' }, { status: 404 })
    }

    // ═══════════════════════════════════════════════════════════
    // STAY IN SAME TANK
    // ═══════════════════════════════════════════════════════════
    if (body.stayInSameTank) {
      console.log('[CONDITIONING/START] Stay in same tank mode')

      // ✅ FIX: Use sourceLotId directly when provided
      const currentAssignment = await prisma.tankAssignment.findFirst({
        where: body.sourceLotId ? {
          lotId: body.sourceLotId,
          status: 'ACTIVE',
        } : {
          Lot: { LotBatch: { some: { batchId: body.batchId } } },
          status: 'ACTIVE',
        },
        include: { Lot: true },
      })

      if (currentAssignment) {
        // ✅ Conditioning starts from plannedStart date
        const conditioningStartTime = new Date(plannedStart)
        
        // Close fermentation assignment - ends when conditioning starts
        await prisma.tankAssignment.update({
          where: { id: currentAssignment.id },
          data: { 
            status: 'COMPLETED',
            actualEnd: conditioningStartTime,  // ✅ FIX: Use actualEnd instead of endTime
          },
        })

        // Update lot phase
        await prisma.lot.update({
          where: { id: currentAssignment.lotId },
          data: { phase: 'CONDITIONING', status: 'ACTIVE', updatedAt: new Date() },
        })

        // ✅ FIX: Update all batches in lot to CONDITIONING status
        const lotWithBatches = await prisma.lot.findUnique({
          where: { id: currentAssignment.lotId },
          include: { LotBatch: { select: { batchId: true } } }
        })
        
        if (lotWithBatches?.LotBatch && lotWithBatches.LotBatch.length > 0) {
          const batchIds = lotWithBatches.LotBatch.map(lb => lb.batchId)
          await prisma.batch.updateMany({
            where: { id: { in: batchIds } },
            data: { status: 'CONDITIONING' }
          })
          console.log('[CONDITIONING/START] ✅ Updated', batchIds.length, 'batches to CONDITIONING status')
        }

        // Create new conditioning assignment in same tank
        const newAssignment = await prisma.tankAssignment.create({
          data: {
            id: randomUUID(),
            tenantId: ctx.tenantId,
            tankId: currentAssignment.tankId,
            lotId: currentAssignment.lotId,
            plannedVolume: currentAssignment.plannedVolume,
            phase: 'CONDITIONING',
            status: 'ACTIVE',
            plannedStart: conditioningStartTime,  // ✅ Added
            plannedEnd: plannedEnd,               // ✅ Added
            createdBy: ctx.userId,                // ✅ Added
          } as any,
        })
        console.log('[CONDITIONING/START] ✅ Created assignment:', {
          id: newAssignment.id,
          phase: 'CONDITIONING',
          plannedStart: conditioningStartTime.toISOString(),
          plannedEnd: plannedEnd.toISOString(),
          durationDays: Math.round((plannedEnd.getTime() - conditioningStartTime.getTime()) / (1000*60*60*24)),
        })

        // Create transfer record
        await prisma.transfer.create({
          data: {
            id: randomUUID(),
            tenantId: ctx.tenantId,
            transferCode: `COND-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            transferType: 'FERMENT_TO_CONDITION',  // ✅ Changed from 'CONDITIONING'
            sourceLotId: currentAssignment.lotId,
            destLotId: currentAssignment.lotId,
            sourceTankId: currentAssignment.tankId,
            destTankId: currentAssignment.tankId,
            volume: currentAssignment.plannedVolume || 0,
            plannedAt: conditioningStartTime,  // ✅ Changed from new Date()
            executedAt: new Date(),
            status: 'COMPLETED',
            notes: 'Phase transition in same tank (Unitank)',
            performedBy: ctx.userId,
          } as any,
        })

        // ✅ Added: Update Tank.currentPhase to CONDITIONING
        await prisma.tank.update({
          where: { id: currentAssignment.tankId },
          data: { currentPhase: 'CONDITIONING' },
        }).catch(() => {
          console.log('[CONDITIONING/START] Tank table update skipped')
        })

        // ✅ Update Batch status
        await prisma.batch.update({
          where: { id: body.batchId },
          data: { status: 'CONDITIONING' },
        })

        // Timeline
        await prisma.batchTimeline.create({
          data: {
            id: randomUUID(),
            batchId: body.batchId,
            type: 'CONDITIONING_STARTED',
            title: 'კონდიცირება დაიწყო',
            description: `ლოტი: ${currentAssignment.Lot.id}`,
            data: {
              lotId: currentAssignment.lotId,
              tankId: currentAssignment.tankId,
              volume: currentAssignment.plannedVolume,
            },
            createdBy: ctx.userId || 'system',
          },
        })

        // ✅ Create gravity reading for conditioning start (FG measurement)
        // Only create gravity reading if we have actual gravity data
        if (body.finalGravity) {
          await prisma.gravityReading.create({
            data: {
              batchId: body.batchId,
              gravity: parseFloat(String(body.finalGravity)),
              temperature: body.temperature ? parseFloat(String(body.temperature)) : 20,
              notes: '❄️ კონდიცირებაზე გადასვლა - საბოლოო სიმკვრივე (FG)',
              recordedBy: ctx.userId || 'system',
              recordedAt: new Date(),
            },
          }).catch((err) => {
            console.error('[CONDITIONING/START] Failed to create gravity reading:', err.message)
          })
          console.log('[CONDITIONING/START] ✅ Gravity reading created (same tank): FG=', body.finalGravity, 'Temp=', body.temperature)
        }

        return NextResponse.json({
          success: true,
          message: 'იმავე ავზში გადავიდა კონდიცირებაზე',
          lotId: currentAssignment.lotId,
          assignmentId: newAssignment.id,
        })
      }
    }

    // ═══════════════════════════════════════════════════════════
    // BLEND MODE
    // ═══════════════════════════════════════════════════════════
    if (body.enableBlending && body.targetLotId) {
      console.log('[CONDITIONING/START] Blend mode')

      // ✅ ჯერ ძველი ავზები გავათავისუფლოთ!
      const oldAssignments = await prisma.tankAssignment.findMany({
        where: {
          Lot: {
            LotBatch: { some: { batchId: body.batchId } }
          },
          phase: 'FERMENTATION',
          status: { in: ['PLANNED', 'ACTIVE'] },
        },
      })

      console.log('[CONDITIONING/START] Found old fermentation assignments:', oldAssignments.length)

      // ✅ FIX: Define conditioning start time for actualEnd
      const blendModeConditioningStart = new Date(body.plannedStart)

      for (const assignment of oldAssignments) {
        await prisma.tankAssignment.update({
          where: { id: assignment.id },
          data: { 
            status: 'COMPLETED',
            actualEnd: blendModeConditioningStart,  // ✅ FIX: Use actualEnd instead of endTime
          },
        })
        
        await prisma.equipment.update({
          where: { id: assignment.tankId },
          data: { 
            status: 'NEEDS_CIP',
            currentBatchId: null,
            nextCIP: new Date(),
          },
        })
        
        // ✅ FIX: Also update Tank table to clear batch info
        await prisma.tank.update({
          where: { id: assignment.tankId },
          data: {
            status: 'AVAILABLE',
            currentLotId: null,
            currentPhase: null,
          },
        }).catch(() => {
          // Tank table might not exist, ignore error
        })
        
        console.log('[CONDITIONING/START] Released fermentation tank:', assignment.tankId)
      }

      const targetLot = await prisma.lot.findUnique({
        where: { id: body.targetLotId },
        include: { TankAssignment: { where: { status: { in: ['PLANNED', 'ACTIVE'] } } } },
      })

      if (!targetLot) {
        return NextResponse.json({ error: 'სამიზნე ლოტი ვერ მოიძებნა' }, { status: 404 })
      }

      // Get volume from current lot
      const currentLotBatch = await prisma.lotBatch.findFirst({
        where: { batchId: body.batchId },
      })

      const volume = currentLotBatch?.volumeContribution || 0
      const sourceLotId = currentLotBatch?.lotId
      const blendConditioningStartTime = new Date(body.plannedStart)  // ✅ FIX: Define for blend mode

      // ✅ FIX: Mark source lot as COMPLETED and remove old LotBatch
      if (sourceLotId && sourceLotId !== body.targetLotId) {
        // Mark source lot as completed (fermentation is done)
        await prisma.lot.update({
          where: { id: sourceLotId },
          data: { 
            status: 'COMPLETED',
            updatedAt: new Date(),
          },
        })
        console.log('[CONDITIONING/START] ✅ Marked source lot as COMPLETED:', sourceLotId)
        
        // Complete any remaining assignments on source lot
        const sourceAssignments = await prisma.tankAssignment.findMany({
          where: { lotId: sourceLotId, status: { in: ['PLANNED', 'ACTIVE'] } },
        })
        
        for (const sa of sourceAssignments) {
          await prisma.tankAssignment.update({
            where: { id: sa.id },
            data: { status: 'COMPLETED', actualEnd: blendConditioningStartTime },  // ✅ FIX: Use proper time
          })
        }
        
        // ✅ Keep old LotBatch for fermentation history!
        // Batch now has TWO lots: fermentation (COMPLETED) + conditioning blend (ACTIVE)
        console.log('[CONDITIONING/START] ✅ Kept old LotBatch for fermentation history:', sourceLotId)
      }

      // Add batch to target lot
      await prisma.lotBatch.create({
        data: {
          id: randomUUID(),
          lotId: body.targetLotId,
          batchId: body.batchId,
          volumeContribution: volume,
          batchPercentage: 50, // Will be recalculated
        },
      })

      // ✅ Update target lot to BLEND code format if not already
      if (targetLot && !targetLot.lotCode?.startsWith('BLEND-')) {
        const blendCode = await generateBlendLotCode(ctx.tenantId)
        await prisma.lot.update({
          where: { id: body.targetLotId },
          data: {
            lotCode: blendCode,
            isBlendResult: true,
            blendedAt: new Date(),
          },
        })
        console.log('[CONDITIONING/START] ✅ Updated target lot to BLEND code:', blendCode)
      }

      // ✅ CAPACITY CHECK for blend mode
      if (targetLot.TankAssignment[0]) {
        const assignment = targetLot.TankAssignment[0]
        const currentVolume = parseFloat(assignment.plannedVolume?.toString() || assignment.actualVolume?.toString() || '0')
        const addingVolume = parseFloat(volume.toString())
        const totalAfterBlend = currentVolume + addingVolume
        
        // Get tank capacity
        const blendTank = await prisma.equipment.findUnique({
          where: { id: assignment.tankId },
          select: { name: true, capacity: true },
        })
        
        const tankCapacity = parseFloat(blendTank?.capacity?.toString() || '0')
        
        console.log(`[CONDITIONING/START] Blend capacity check: tank=${blendTank?.name}, capacity=${tankCapacity}L, current=${currentVolume}L, adding=${addingVolume}L, total=${totalAfterBlend}L`)
        
        if (totalAfterBlend > tankCapacity) {
          return NextResponse.json(
            { 
              error: `ტანკი "${blendTank?.name}" გადაივსება შერევის შემდეგ!`,
              details: `ტევადობა: ${tankCapacity}L, შერევის შემდეგ: ${totalAfterBlend}L (უკვე არის ${currentVolume}L + ახალი ${addingVolume}L)`,
              code: 'TANK_OVERFLOW'
            },
            { status: 400 }
          )
        }
        
        // Update assignment volume
        await prisma.tankAssignment.update({
          where: { id: assignment.id },
          data: { plannedVolume: { increment: addingVolume } },
        })
      }

      // ✅ Update Batch status
      await prisma.batch.update({
        where: { id: body.batchId },
        data: { status: 'CONDITIONING' },
      })

      // Timeline
      await prisma.batchTimeline.create({
        data: {
          id: randomUUID(),
          batchId: body.batchId,
          type: 'NOTE',
          title: 'ბაჩი შეერია',
          description: `შეერია ლოტში: ${targetLot.id}`,
          data: { lotId: body.targetLotId, volume },
          createdBy: ctx.userId || 'system',
        },
      })

      // ✅ Create gravity reading for blend conditioning start (FG measurement)
      // Only create gravity reading if we have actual gravity data
      if (body.finalGravity) {
        await prisma.gravityReading.create({
          data: {
            batchId: body.batchId,
            gravity: parseFloat(String(body.finalGravity)),
            temperature: body.temperature ? parseFloat(String(body.temperature)) : 20,
            notes: '❄️ კონდიცირებაზე გადასვლა (შერევა) - საბოლოო სიმკვრივე (FG)',
            recordedBy: ctx.userId || 'system',
            recordedAt: new Date(),
          },
        }).catch((err) => {
          console.error('[CONDITIONING/START] Failed to create gravity reading:', err.message)
        })
        console.log('[CONDITIONING/START] ✅ Gravity reading created (blend): FG=', body.finalGravity, 'Temp=', body.temperature)
      }

      return NextResponse.json({
        success: true,
        message: 'შეერია კონდიცირების ლოტს',
        lotId: body.targetLotId,
      })
    }

    // ═══════════════════════════════════════════════════════════
    // SPLIT OR SIMPLE MODE
    // ═══════════════════════════════════════════════════════════
    if (!body.allocations || body.allocations.length === 0) {
      return NextResponse.json({ error: 'ავზები სავალდებულოა' }, { status: 400 })
    }

    // Check availability
    const availCheck = await checkMultipleTanksAvailability(body.allocations, plannedStart, plannedEnd)
    if (!availCheck.allAvailable) {
      return NextResponse.json({ error: 'ზოგიერთი ავზი დაკავებულია', code: 'TANKS_UNAVAILABLE' }, { status: 400 })
    }

    const totalVolume = body.allocations.reduce((sum, a) => sum + a.volume, 0)

    // Get tank info including capacity
    const tankIds = body.allocations.map(a => a.tankId)
    const tanks = await prisma.equipment.findMany({
      where: { id: { in: tankIds } },
      select: { id: true, name: true, capacity: true }
    })
    const tankMap = new Map(tanks.map(t => [t.id, t]))

    // ════════════════════════════════════════════════════════════════
    // ✅ CAPACITY VALIDATION - Check each tank has enough capacity
    // ════════════════════════════════════════════════════════════════
    for (const allocation of body.allocations) {
      const tank = tankMap.get(allocation.tankId)
      if (!tank) {
        return NextResponse.json(
          { error: `ტანკი ვერ მოიძებნა: ${allocation.tankId}` },
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
      
      console.log(`[CONDITIONING/START] Tank ${tank.name}: capacity=${tankCapacity}L, current=${currentVolumeInTank}L, adding=${requestedVolume}L, total=${totalAfterTransfer}L`)
      
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

    console.log('[CONDITIONING/START] ✅ All tanks have sufficient capacity')
    // ════════════════════════════════════════════════════════════════

    // ════════════════════════════════════════════════════════════════
    // ✅ TANK OCCUPANCY CHECK - Prevent transfer to occupied tanks
    // ════════════════════════════════════════════════════════════════
        const sourceLotId = body.sourceLotId || (body as any).lotId
    
    for (const allocation of body.allocations) {
      const tank = tankMap.get(allocation.tankId)
      
      // Check if tank has ACTIVE assignment from a DIFFERENT lot
      const occupyingAssignment = await prisma.tankAssignment.findFirst({
        where: {
          tankId: allocation.tankId,
          status: 'ACTIVE',
          // Exclude source lot (we're moving from there)
          ...(sourceLotId ? { lotId: { not: sourceLotId } } : {}),
        },
        include: {
          Lot: {
            select: { id: true, lotCode: true, phase: true },
          },
        },
      })
      
      if (occupyingAssignment) {
        const occupyingLotCode = occupyingAssignment.Lot?.lotCode || occupyingAssignment.lotId
        
        console.log(`[CONDITIONING/START] ❌ Tank ${tank?.name} is occupied by lot: ${occupyingLotCode}`)
        
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
    
    console.log('[CONDITIONING/START] ✅ All tanks are available (not occupied by other lots)')
    // ════════════════════════════════════════════════════════════════

    const lotNumber = await generateLotNumber(ctx.tenantId, 'CONDITIONING')

    // Get tank names for timeline
    const tankNameMap = new Map(tanks.map(t => [t.id, t.name]))
    const tankNames = body.allocations.map(a => tankNameMap.get(a.tankId) || a.tankId).join(', ')

    console.log('[CONDITIONING/START] ========== ENTERING TRANSACTION ==========')

    // ✅ Conditioning starts from conditioningStartedAt date (when user transfers)
    const conditioningStartTime = new Date(plannedStart) // Use plannedStart as conditioning start time

    const result = await prisma.$transaction(async (tx) => {
      console.log('[CONDITIONING/START] ⚡⚡⚡ INSIDE TRANSACTION - conditioningStartTime:', conditioningStartTime.toISOString())
      
      // ✅ Check if source lot is a blend (has multiple batches)
      const sourceLotBatch = await tx.lotBatch.findFirst({
        where: { batchId: body.batchId },
        include: {
          Lot: {
            include: {
              LotBatch: {
                include: { Batch: true },
              },
            },
          },
        },
      })

      const isBlend = sourceLotBatch && sourceLotBatch.Lot.LotBatch.length > 1
      let lot: any

      if (isBlend && sourceLotBatch) {
        // ✅ BLEND MODE: Update existing lot instead of creating new one
        console.log('[CONDITIONING/START] Blend detected - updating existing lot:', sourceLotBatch.Lot.id)
        
        const sourceLot = sourceLotBatch.Lot
        
        // Update existing lot to CONDITIONING phase, keep ACTIVE status
        // ✅ Also update lotCode to BLEND format if not already
        const needsBlendCode = !sourceLot.lotCode?.startsWith('BLEND-')
        let updateData: any = {
          phase: 'CONDITIONING',
          status: 'ACTIVE', // ✅ Keep ACTIVE, don't set to COMPLETED
          notes: body.notes || sourceLot.notes,
          updatedAt: new Date(),
        }
        
        if (needsBlendCode) {
          const blendCode = await generateBlendLotCode(ctx.tenantId)
          updateData.lotCode = blendCode
          updateData.isBlendResult = true
          updateData.blendedAt = new Date()
          console.log('[CONDITIONING/START] ✅ Generating BLEND code for existing blend lot:', blendCode)
        }
        
        lot = await tx.lot.update({
          where: { id: sourceLot.id },
          data: updateData,
        })

        // ✅ Update ALL batches in the lot to CONDITIONING status
        for (const lotBatch of sourceLot.LotBatch) {
          await tx.batch.update({
            where: { id: lotBatch.batchId },
            data: { status: 'CONDITIONING' },
          })
        }

        console.log('[CONDITIONING/START] Updated', sourceLot.LotBatch.length, 'batches to CONDITIONING')
        
        // ✅ FIX: Complete old FERMENTATION TankAssignments for ALL batches in the blend
        // This includes both blend lot assignments AND original fermentation lot assignments
        const allBatchIds = sourceLot.LotBatch.map(lb => lb.batchId)
        
        // 1. Find all fermentation lots that were used for these batches (before blending)
        const allFermentationLots = await tx.lot.findMany({
          where: {
            LotBatch: {
              some: {
                batchId: { in: allBatchIds },
                // Exclude the blend lot itself
                lotId: { not: sourceLot.id },
              },
            },
            phase: 'FERMENTATION',
            status: { in: ['ACTIVE', 'COMPLETED'] },
          },
          include: {
            TankAssignment: {
              where: {
                phase: 'FERMENTATION',
                status: { in: ['PLANNED', 'ACTIVE'] },
              },
            },
          },
        })
        
        console.log('[CONDITIONING/START] Found', allFermentationLots.length, 'original fermentation lots for blend batches')
        
        // 2. Complete assignments from original fermentation lots
        for (const fermLot of allFermentationLots) {
          console.log('[CONDITIONING/START] Completing assignments for fermentation lot:', fermLot.id, fermLot.lotCode)
          for (const assignment of fermLot.TankAssignment) {
            await tx.tankAssignment.update({
              where: { id: assignment.id },
              data: { 
                status: 'COMPLETED',
                actualEnd: conditioningStartTime,  // ✅ FIX: Use proper time
              },
            })
            
            // Free old tanks (set to NEEDS_CIP) - but only if not in new allocations
            const isInNewAllocations = body.allocations?.some(a => a.tankId === assignment.tankId)
            if (!isInNewAllocations) {
              await tx.equipment.update({
                where: { id: assignment.tankId },
                data: { 
                  status: 'NEEDS_CIP',
                  currentBatchId: null,
                  nextCIP: new Date(),
                },
              })
              
              // Also update Tank table
              await tx.tank.update({
                where: { id: assignment.tankId },
                data: {
                  status: 'AVAILABLE',
                  currentLotId: null,
                  currentPhase: null,
                },
              }).catch(() => {})
              
              console.log('[CONDITIONING/START] ✅ Freed fermentation tank:', assignment.tankId)
            }
          }
        }
        
        // 3. Also complete any FERMENTATION assignments on the blend lot itself (if any)
        const blendOldAssignments = await tx.tankAssignment.findMany({
          where: {
            lotId: sourceLot.id,
            phase: 'FERMENTATION',
            status: { in: ['PLANNED', 'ACTIVE'] },
          },
        })
        
        console.log('[CONDITIONING/START] Found', blendOldAssignments.length, 'old fermentation assignments on blend lot')
        
        for (const assignment of blendOldAssignments) {
          await tx.tankAssignment.update({
            where: { id: assignment.id },
            data: { 
              status: 'COMPLETED',
              actualEnd: conditioningStartTime,  // ✅ FIX: Use proper time
            },
          })
          
          // Free old tanks (set to NEEDS_CIP) - but only if not in new allocations
          const isInNewAllocations = body.allocations?.some(a => a.tankId === assignment.tankId)
          if (!isInNewAllocations) {
            await tx.equipment.update({
              where: { id: assignment.tankId },
              data: { 
                status: 'NEEDS_CIP',
                currentBatchId: null,
                nextCIP: new Date(),
              },
            })
            
            // Also update Tank table
            await tx.tank.update({
              where: { id: assignment.tankId },
              data: {
                status: 'AVAILABLE',
                currentLotId: null,
                currentPhase: null,
              },
            }).catch(() => {})
          }
        }
      } else {
        // ✅ SINGLE BATCH MODE: Update existing fermentation lot OR create new one
        
        // ✅ CRITICAL: If sourceLotId is provided, use it directly!
        // This happens when user transfers a specific split lot (e.g., FERM-...-A)
        if (body.sourceLotId) {
          console.log('[CONDITIONING/START] sourceLotId provided:', body.sourceLotId)
          
          const sourceLot = await tx.lot.findUnique({
            where: { id: body.sourceLotId },
            include: {
              TankAssignment: {
                where: { status: { in: ['ACTIVE', 'PLANNED'] }, phase: 'FERMENTATION' },
              },
            },
          })
          
          if (sourceLot && sourceLot.phase === 'FERMENTATION') {
            // ✅ Check if this is a PARENT lot with CHILD lots
            console.log('[CONDITIONING/START] sourceLot.phase =', sourceLot.phase, '→ checking for child lots')
            
            // First, check ALL child lots (for debugging)
            const allChildLots = await tx.lot.findMany({
              where: { parentLotId: body.sourceLotId },
            })
            console.log('[CONDITIONING/START] ALL child lots count:', allChildLots.length)
            if (allChildLots.length > 0) {
              console.log('[CONDITIONING/START] Child lots details:', JSON.stringify(allChildLots.map(l => ({ id: l.id, code: l.lotCode, phase: l.phase, status: l.status }))))
            }
            
            // ✅ Use allChildLots directly instead of filtered query
            // Filter in code to avoid potential Prisma query issues
            const childLots = allChildLots.filter(l => 
              l.phase === 'FERMENTATION' && 
              (l.status === 'ACTIVE' || l.status === 'PLANNED')
            )
            
            console.log('[CONDITIONING/START] Filtered child lots count:', childLots.length)
            
            if (childLots.length > 0) {
              // ✅ This is a PARENT lot - process only FIRST CHILD lot
              const firstChild = childLots[0]
              console.log('[CONDITIONING/START] Processing FIRST child lot:', firstChild.lotCode, 'id:', firstChild.id)
              
              // Get the child lot's TankAssignment
              const childAssignments = await tx.tankAssignment.findMany({
                where: {
                  lotId: firstChild.id,
                  phase: 'FERMENTATION',
                  status: { in: ['ACTIVE', 'PLANNED'] },
                },
              })
              console.log('[CONDITIONING/START] Child lot has', childAssignments.length, 'fermentation assignments')
              
              // Update ONLY the first child lot to CONDITIONING
              lot = await tx.lot.update({
                where: { id: firstChild.id },
                data: {
                  phase: 'CONDITIONING',
                  status: 'ACTIVE',
                  notes: body.notes || firstChild.notes,
                  updatedAt: new Date(),
                },
              })
              console.log('[CONDITIONING/START] ✅ Updated child lot to CONDITIONING:', firstChild.lotCode)
              
              // Complete ONLY the first child's TankAssignment(s)
              for (const fermAssignment of childAssignments) {
                console.log('[CONDITIONING/START] Completing CHILD fermentation assignment:', fermAssignment.id, 'tankId:', fermAssignment.tankId)
                
                await tx.tankAssignment.update({
                  where: { id: fermAssignment.id },
                  data: { 
                    status: 'COMPLETED',
                    actualEnd: conditioningStartTime,
                  },
                })
                
                const newTankId = body.allocations?.[0]?.tankId
                if (fermAssignment.tankId !== newTankId) {
                  await tx.equipment.update({
                    where: { id: fermAssignment.tankId },
                    data: { 
                      status: 'NEEDS_CIP',
                      currentBatchId: null,
                      nextCIP: new Date(),
                    },
                  }).catch((e) => console.log('[CONDITIONING/START] Equipment update error:', e.message))
                  
                  // Also update Tank table
                  await tx.tank.update({
                    where: { id: fermAssignment.tankId },
                    data: {
                      status: 'AVAILABLE',
                      currentLotId: null,
                      currentPhase: null,
                    },
                  }).catch(() => {})
                  
                  console.log('[CONDITIONING/START] ✅ Released ONLY first child tank:', fermAssignment.tankId)
                }
              }
              
              // ✅ Mark as processed - skip the second block
              (body as any)._fermCompletedFor = lot.id
              
            } else {
              // ✅ This is a LEAF lot (no children) - process it directly
              console.log('[CONDITIONING/START] ✅ Updating source lot:', sourceLot.lotCode, '→ CONDITIONING')
              
              lot = await tx.lot.update({
                where: { id: body.sourceLotId },
                data: {
                  phase: 'CONDITIONING',
                  status: 'ACTIVE',
                  notes: body.notes || sourceLot.notes,
                  updatedAt: new Date(),
                },
              })
              
              // Complete fermentation TankAssignment(s) and free tank(s)
              for (const fermAssignment of (sourceLot.TankAssignment || [])) {
                console.log('[CONDITIONING/START] Completing fermentation assignment:', fermAssignment.id)
                
                await tx.tankAssignment.update({
                  where: { id: fermAssignment.id },
                  data: { 
                    status: 'COMPLETED',
                    actualEnd: conditioningStartTime,
                  },
                })
                
                const newTankId = body.allocations?.[0]?.tankId
                if (fermAssignment.tankId !== newTankId) {
                  await tx.equipment.update({
                    where: { id: fermAssignment.tankId },
                    data: { 
                      status: 'NEEDS_CIP',
                      currentBatchId: null,
                      nextCIP: new Date(),
                    },
                  }).catch((e) => console.log('[CONDITIONING/START] Equipment update error:', e.message))
                  
                  await tx.tank.update({
                    where: { id: fermAssignment.tankId },
                    data: {
                      status: 'AVAILABLE',
                      currentLotId: null,
                      currentPhase: null,
                    },
                  }).catch(() => {})
                  
                  console.log('[CONDITIONING/START] ✅ Released fermentation tank:', fermAssignment.tankId)
                }
              }
              
              // ✅ Mark that we've already handled fermentation completion
              (body as any)._fermCompletedFor = body.sourceLotId
            }
          } else {
            // sourceLot not found or not in FERMENTATION - fall through to other logic
            console.log('[CONDITIONING/START] sourceLot not found or not FERMENTATION, falling back...')
          }
        }
        
        // ✅ If lot wasn't set from sourceLotId, check for child lots or create new
        if (!lot) {
          // Check if there are CHILD lots (split fermentation)
          const childLots = await tx.lot.findMany({
            where: {
              LotBatch: { some: { batchId: body.batchId } },
              phase: 'FERMENTATION',
              status: { in: ['ACTIVE', 'PLANNED'] },
              lotCode: { contains: '-' }, // Child lots have -A, -B suffix
            },
            orderBy: { lotCode: 'asc' },
          })
          
          if (childLots.length > 0) {
            console.log('[CONDITIONING/START] Found', childLots.length, 'child lots:', childLots.map(l => l.lotCode))
            
            // Use the parent lot or first child as reference
            const parentLotBatch = await tx.lotBatch.findFirst({
              where: { 
                batchId: body.batchId,
                Lot: { 
                  phase: 'FERMENTATION',
                  lotCode: { not: { contains: '-' } }
                }
              },
              include: { Lot: true },
            })
            
            if (parentLotBatch) {
              lot = await tx.lot.update({
                where: { id: parentLotBatch.lotId },
                data: { status: 'COMPLETED', updatedAt: new Date() },
              })
              console.log('[CONDITIONING/START] Marked parent lot as COMPLETED:', lot.lotCode)
            } else {
              // ✅ FIX: Update the first child lot to CONDITIONING phase
              lot = await tx.lot.update({
                where: { id: childLots[0].id },
                data: {
                  phase: 'CONDITIONING',
                  status: 'ACTIVE',
                  updatedAt: new Date(),
                },
              })
              console.log('[CONDITIONING/START] ✅ Updated child lot to CONDITIONING:', lot.lotCode)
              
              // ✅ Mark parent lot as COMPLETED if it exists
              if (childLots[0].parentLotId) {
                await tx.lot.update({
                  where: { id: childLots[0].parentLotId },
                  data: { 
                    status: 'COMPLETED',
                    updatedAt: new Date(),
                  },
                }).catch(() => {
                  console.log('[CONDITIONING/START] Parent lot update skipped (might not exist)')
                })
              }
              
              // ✅ Mark as processed to skip duplicate processing below
              (body as any)._fermCompletedFor = lot.id
            }
          } else {
            // No child lots - try to find existing FERMENTATION lot for this batch
            const existingFermLot = await tx.lotBatch.findFirst({
              where: { 
                batchId: body.batchId,
                Lot: { phase: 'FERMENTATION' }
              },
              include: { Lot: true },
            })
            
            if (existingFermLot) {
              console.log('[CONDITIONING/START] Single batch - updating existing fermentation lot:', existingFermLot.Lot.lotCode)
              
              lot = await tx.lot.update({
                where: { id: existingFermLot.lotId },
                data: {
                  phase: 'CONDITIONING',
                  status: 'ACTIVE',
                  notes: body.notes || existingFermLot.Lot.notes,
                  updatedAt: new Date(),
                },
              })
            } else {
              console.log('[CONDITIONING/START] Single batch - creating new lot (no fermentation lot found)')
              
              lot = await tx.lot.create({
                data: {
                  id: randomUUID(),
                  tenantId: ctx.tenantId,
                  lotCode: lotNumber,
                  phase: 'CONDITIONING',
                  status: 'ACTIVE',
                  notes: body.notes,
                  createdBy: ctx.userId,
                  updatedAt: new Date(),
                  plannedVolume: totalVolume,
                } as any,
              })

              await tx.lotBatch.create({
                data: {
                  id: randomUUID(),
                  lotId: lot.id,
                  batchId: body.batchId,
                  volumeContribution: totalVolume,
                  batchPercentage: 100,
                },
              })
            }
          }
        }
      }

      // ✅ Complete old fermentation assignment & free old tank FIRST
      // ✅ Store previous assignment endTimes to use as new startTimes
      const previousEndTimes = new Map<string, Date>()
      
      // ✅ CRITICAL FIX: If sourceLot was already processed, skip this block
      // This prevents releasing ALL child lot tanks when only ONE should be released
      const alreadyProcessed = (body as any)._fermCompletedFor === lot?.id
      
      if (!body.stayInSameTank && !alreadyProcessed) {
        // ✅ FIX: If sourceTankId is provided (specific split lot transfer), 
        // only release that one tank, not all child lots
        if (body.sourceTankId) {
          console.log('[CONDITIONING/START] Specific sourceTankId provided:', body.sourceTankId)
          
          // Find only the assignment for this specific tank
          const specificAssignment = await tx.tankAssignment.findFirst({
            where: {
              tankId: body.sourceTankId,
              phase: 'FERMENTATION',
              status: { in: ['PLANNED', 'ACTIVE'] },
            },
          })
          
          if (specificAssignment) {
            const fermentationEndTime = conditioningStartTime
            previousEndTimes.set(specificAssignment.tankId, fermentationEndTime)
            
            await tx.tankAssignment.update({
              where: { id: specificAssignment.id },
              data: { 
                status: 'COMPLETED',
                actualEnd: fermentationEndTime,
              },
            })
            
            await tx.equipment.update({
              where: { id: specificAssignment.tankId },
              data: { 
                status: 'NEEDS_CIP',
                currentBatchId: null,
                nextCIP: new Date(),
              },
            })
            
            console.log('[CONDITIONING/START] Released ONLY source tank:', body.sourceTankId)
          }
        } else {
          // ✅ Original logic for non-split or when sourceTankId not provided
          const lotIdToSearch = lot.id
          
          // ✅ CRITICAL: Check if this lot has children - if so, don't release child tanks!
          const hasChildLots = await tx.lot.count({
            where: { parentLotId: lotIdToSearch },
          })
          
          console.log('[CONDITIONING/START] Searching for fermentation assignments of lot:', lotIdToSearch, 'hasChildLots:', hasChildLots)
          
          // Find fermentation assignments - but NOT child lot assignments if this is parent!
          const oldAssignments = await tx.tankAssignment.findMany({
            where: {
              // ✅ Only search for THIS lot's assignments, not children
              lotId: lotIdToSearch,
              phase: 'FERMENTATION',
              status: { in: ['PLANNED', 'ACTIVE'] },
            },
          })
          
          console.log('[CONDITIONING/START] Found old fermentation assignments:', oldAssignments.length)
          
          for (const assignment of oldAssignments) {
            const fermentationEndTime = conditioningStartTime
            previousEndTimes.set(assignment.tankId, fermentationEndTime)
            
            await tx.tankAssignment.update({
              where: { id: assignment.id },
              data: { 
                status: 'COMPLETED',
                actualEnd: fermentationEndTime,
              },
            })
            
            await tx.equipment.update({
              where: { id: assignment.tankId },
              data: { 
                status: 'NEEDS_CIP',
                currentBatchId: null,
                nextCIP: new Date(),
              },
            })
            
            console.log('[CONDITIONING/START] Released fermentation tank:', assignment.tankId)
          }
          
          // ✅ Only complete child lots if this is NOT a parent lot and NOT a blend
          if (!isBlend && hasChildLots === 0) {
            await tx.lot.updateMany({
              where: {
                parentLotId: lotIdToSearch,
                phase: 'FERMENTATION',
              },
              data: { status: 'COMPLETED', updatedAt: new Date() },
            })
          }
        }
      } else {
        console.log('[CONDITIONING/START] Skipping tank release - already processed or stayInSameTank')
      }

      // Create assignments
      const assignments = []
      
      // ✅ If sourceLotId was provided and processed, the lot is already updated
      // Just create the new conditioning assignment
      // FIX: Check if _fermCompletedFor is set (to child lot id), not if it equals parent lot id
      const sourceLotAlreadyProcessed = !!(body as any)._fermCompletedFor
      
      if (sourceLotAlreadyProcessed) {
        console.log('[CONDITIONING/START] sourceLot already processed, creating assignments for lot:', lot.id, lot.lotCode)
        
        // ✅ FIX: If isSplit=true and multiple allocations, create CHILD LOTS
        if (body.isSplit && body.allocations!.length > 1) {
          console.log('[CONDITIONING/START] 🔀 SPLIT MODE with', body.allocations!.length, 'allocations - creating child lots')
          
          // Get lot number from source lot
          const baseLotCode = lot.lotCode || `COND-${Date.now()}`
          
          for (let i = 0; i < body.allocations!.length; i++) {
            const alloc = body.allocations![i]
            const suffix = String.fromCharCode(65 + i) // A, B, C...
            const childLotCode = `${baseLotCode}-${suffix}`
            
            // Create child lot
            const childLot = await tx.lot.create({
              data: {
                id: randomUUID(),
                tenantId: ctx.tenantId,
                lotCode: childLotCode,
                phase: 'CONDITIONING',
                status: 'ACTIVE',
                parentLotId: lot.id,
                createdBy: ctx.userId,
                updatedAt: new Date(),
                plannedVolume: alloc.volume,
              } as any,
            })
            console.log('[CONDITIONING/START] ✅ Created child lot:', childLotCode, 'id:', childLot.id)
            
            // Create LotBatch for child lot
            await tx.lotBatch.create({
              data: {
                id: randomUUID(),
                lotId: childLot.id,
                batchId: body.batchId,
                volumeContribution: alloc.volume,
                batchPercentage: Math.round((alloc.volume / totalVolume) * 100),
              },
            })
            
            // Create assignment for child lot
            const assignment = await tx.tankAssignment.create({
              data: {
                id: randomUUID(),
                tenantId: ctx.tenantId,
                tankId: alloc.tankId,
                lotId: childLot.id,
                plannedVolume: alloc.volume,
                phase: 'CONDITIONING',
                status: 'ACTIVE',
                plannedStart: conditioningStartTime,
                plannedEnd: plannedEnd,
                createdBy: ctx.userId,
              } as any,
            })
            console.log('[CONDITIONING/START] ✅ Created conditioning assignment:', assignment.id, 'for child lot:', childLotCode)
            assignments.push(assignment)
            
            // Update tank status
            await tx.equipment.update({
              where: { id: alloc.tankId },
              data: { status: 'OPERATIONAL', currentBatchId: body.batchId },
            }).catch(() => {})
            
            await tx.tank.update({
              where: { id: alloc.tankId },
              data: { status: 'OCCUPIED', currentLotId: childLot.id, currentPhase: 'CONDITIONING' },
            }).catch(() => {})
          }
          
          // Mark parent lot as COMPLETED (child lots are now ACTIVE)
          await tx.lot.update({
            where: { id: lot.id },
            data: { status: 'COMPLETED', updatedAt: new Date() },
          })
          console.log('[CONDITIONING/START] ✅ Marked parent lot as COMPLETED:', lot.id)
          
        } else {
          // Single allocation for the source lot (no split)
          const alloc = body.allocations![0]
          
          const assignment = await tx.tankAssignment.create({
            data: {
              id: randomUUID(),
              tenantId: ctx.tenantId,
              tankId: alloc.tankId,
              lotId: lot.id, // Use the updated source lot
              plannedVolume: alloc.volume,
              phase: 'CONDITIONING',
              status: 'ACTIVE',
              plannedStart: conditioningStartTime,
              plannedEnd: plannedEnd,
              createdBy: ctx.userId,
            } as any,
          })
          
          console.log('[CONDITIONING/START] ✅ Created conditioning assignment:', assignment.id, 'for lot:', lot.id)
          assignments.push(assignment)
          
          // Update tank status
          await tx.equipment.update({
            where: { id: alloc.tankId },
            data: { status: 'OPERATIONAL', currentBatchId: body.batchId },
          })
          
          await tx.tank.update({
            where: { id: alloc.tankId },
            data: { status: 'OCCUPIED', currentLotId: lot.id, currentPhase: 'CONDITIONING' },
          }).catch(() => {})
        }
        
      } else {
        // ✅ Standard flow: check for existing FERMENTATION child lots
        const existingFermChildLots = await tx.lot.findMany({
          where: {
            LotBatch: { some: { batchId: body.batchId } },
            phase: 'FERMENTATION',
            status: { in: ['ACTIVE', 'PLANNED'] },
            parentLotId: { not: null },
          },
          include: {
            TankAssignment: {
              where: { 
                phase: 'FERMENTATION',
                status: { in: ['ACTIVE', 'PLANNED'] } 
              },
            },
          },
          orderBy: { lotCode: 'asc' },
        })
        
        console.log('[CONDITIONING/START] 🔍 Found existing fermentation child lots:', 
          existingFermChildLots.length, 
          existingFermChildLots.map(l => `${l.lotCode} (tank: ${l.TankAssignment?.[0]?.tankId || 'none'})`))
        
        const hasExistingFermLots = existingFermChildLots.length > 0
        
        const hasExistingFermChildLots = existingFermChildLots.length > 0
        
        // ✅ FIX: If NO existing child lots AND isSplit=true, create ALL new child lots
        if (!hasExistingFermChildLots && body.isSplit && body.allocations!.length > 1) {
          console.log('[CONDITIONING/START] 🔀 SPLIT from single lot - creating ALL new child lots')
          
          // 1. Mark the existing fermentation lot as COMPLETED (parent)
          await tx.lot.update({
            where: { id: lot.id },
            data: { status: 'COMPLETED', updatedAt: new Date() },
          })
          console.log('[CONDITIONING/START] ✅ Marked fermentation lot as COMPLETED (parent):', lot.lotCode)
          
          // 2. Complete fermentation assignment and release tank
          const parentFermAssignments = await tx.tankAssignment.findMany({
            where: {
              lotId: lot.id,
              phase: 'FERMENTATION',
              status: { in: ['ACTIVE', 'PLANNED'] },
            },
          })
          
          for (const fermAssignment of parentFermAssignments) {
            await tx.tankAssignment.update({
              where: { id: fermAssignment.id },
              data: { status: 'COMPLETED', actualEnd: conditioningStartTime },
            })
            
            await tx.equipment.update({
              where: { id: fermAssignment.tankId },
              data: { status: 'NEEDS_CIP', currentBatchId: null, nextCIP: new Date() },
            }).catch(() => {})
            
            await tx.tank.update({
              where: { id: fermAssignment.tankId },
              data: { status: 'AVAILABLE', currentLotId: null, currentPhase: null },
            }).catch(() => {})
            
            console.log('[CONDITIONING/START] Released fermentation tank:', fermAssignment.tankId)
          }
          
          // 3. Create ALL child lots (A, B, C...)
          for (let i = 0; i < body.allocations!.length; i++) {
            const alloc = body.allocations![i]
            const suffix = String.fromCharCode(65 + i) // A, B, C...
            const childLotCode = `${lotNumber}-${suffix}`
            
            const childLot = await tx.lot.create({
              data: {
                id: randomUUID(),
                tenantId: ctx.tenantId,
                lotCode: childLotCode,
                phase: 'CONDITIONING',
                status: 'ACTIVE',
                parentLotId: lot.id,
                createdBy: ctx.userId,
                updatedAt: new Date(),
                plannedVolume: alloc.volume,
              } as any,
            })
            console.log('[CONDITIONING/START] ✅ Created child lot:', childLotCode)
            
            await tx.lotBatch.create({
              data: {
                id: randomUUID(),
                lotId: childLot.id,
                batchId: body.batchId,
                volumeContribution: alloc.volume,
                batchPercentage: Math.round((alloc.volume / totalVolume) * 100),
              },
            })
            
            const assignment = await tx.tankAssignment.create({
              data: {
                id: randomUUID(),
                tenantId: ctx.tenantId,
                tankId: alloc.tankId,
                lotId: childLot.id,
                plannedVolume: alloc.volume,
                phase: 'CONDITIONING',
                status: 'ACTIVE',
                plannedStart: conditioningStartTime,
                plannedEnd: plannedEnd,
                createdBy: ctx.userId,
              } as any,
            })
            assignments.push(assignment)
            
            await tx.equipment.update({
              where: { id: alloc.tankId },
              data: { status: 'OPERATIONAL', currentBatchId: body.batchId },
            }).catch(() => {})
            
            await tx.tank.update({
              where: { id: alloc.tankId },
              data: { status: 'OCCUPIED', currentLotId: childLot.id, currentPhase: 'CONDITIONING' },
            }).catch(() => {})
            
            await tx.transfer.create({
              data: {
                id: randomUUID(),
                tenantId: ctx.tenantId,
                transferCode: `SPLIT-${Date.now()}-${i}`,
                transferType: 'SPLIT',
                sourceLotId: lot.id,
                destLotId: childLot.id,
                sourceTankId: parentFermAssignments[0]?.tankId || alloc.tankId,
                destTankId: alloc.tankId,
                volume: alloc.volume,
                plannedAt: conditioningStartTime,
                executedAt: new Date(),
                status: 'COMPLETED',
                performedBy: ctx.userId,
              } as any,
            })
          }
          
        } else {
          // Existing logic for when child lots already exist or not a split
          for (let i = 0; i < body.allocations!.length; i++) {
          const alloc = body.allocations![i]

          let assignmentLot = lot
          
          const existingChildLot = hasExistingFermLots ? existingFermChildLots[i] : null
          
          if (existingChildLot) {
            console.log('[CONDITIONING/START] ✅ Updating existing fermentation lot:', 
              existingChildLot.lotCode, '→ CONDITIONING (keeping same lotCode!)')
            
            assignmentLot = await tx.lot.update({
              where: { id: existingChildLot.id },
              data: {
                phase: 'CONDITIONING',
                status: 'ACTIVE',
                plannedVolume: alloc.volume,
                updatedAt: new Date(),
              },
            })
            
            for (const fermAssignment of (existingChildLot.TankAssignment || [])) {
              console.log('[CONDITIONING/START] Completing fermentation assignment:', fermAssignment.id, 
                'on tank:', fermAssignment.tankId)
            
            await tx.tankAssignment.update({
              where: { id: fermAssignment.id },
              data: { 
                status: 'COMPLETED',
                actualEnd: conditioningStartTime, // ✅ Set end time to when conditioning starts
              },
            })
            
            // ✅ Free old tank - set to NEEDS_CIP (only if different from new tank)
            if (fermAssignment.tankId !== alloc.tankId) {
              await tx.equipment.update({
                where: { id: fermAssignment.tankId },
                data: { 
                  status: 'NEEDS_CIP',
                  currentBatchId: null,
                  nextCIP: new Date(),
                },
              }).catch((e) => console.log('[CONDITIONING/START] Equipment update error:', e.message))
              
              // ✅ Also update Tank table
              await tx.tank.update({
                where: { id: fermAssignment.tankId },
                data: {
                  status: 'AVAILABLE',
                  currentLotId: null,
                  currentPhase: null,
                },
              }).catch(() => {})
              
              console.log('[CONDITIONING/START] ✅ Released fermentation tank:', fermAssignment.tankId)
            }
          }
        } else if (body.isSplit && body.allocations!.length > 1) {
          // Create NEW child lot for split (no existing lot found)
          console.log('[CONDITIONING/START] Creating NEW child lot for split (index:', i, ')')
          
          assignmentLot = await tx.lot.create({
            data: {
              id: randomUUID(),
              tenantId: ctx.tenantId,
              lotCode: `${lotNumber}-${String.fromCharCode(65 + i)}`,
              phase: 'CONDITIONING',
              status: 'ACTIVE',
              parentLotId: lot.id,
              createdBy: ctx.userId,
              updatedAt: new Date(),
              plannedVolume: alloc.volume,
            } as any,
          })

          // ✅ Create LotBatch for child lot to link it to batch
          await tx.lotBatch.create({
            data: {
              id: randomUUID(),
              lotId: assignmentLot.id,
              batchId: body.batchId,
              volumeContribution: alloc.volume,
              batchPercentage: Math.round((alloc.volume / totalVolume) * 100),
            },
          })
          console.log('[CONDITIONING/START] ✅ Created NEW LotBatch for child lot:', assignmentLot.id)

          // Transfer record
          await tx.transfer.create({
            data: {
              id: randomUUID(),
              tenantId: ctx.tenantId,
              transferCode: `SPLIT-${Date.now()}-${i}`,
              transferType: 'SPLIT',
              sourceLotId: lot.id,
              destLotId: assignmentLot.id,
              sourceTankId: alloc.tankId,
              destTankId: alloc.tankId,
              volume: alloc.volume,
              plannedAt: conditioningStartTime,
              executedAt: new Date(),
              status: 'COMPLETED',
              performedBy: ctx.userId,
            } as any,
          })
        }

        // ✅ Use conditioning start time (from plannedStart / conditioningStartedAt)
        const actualConditioningStart = conditioningStartTime
        
        console.log('[CONDITIONING/START] ⚡ Creating assignment with startTime:', actualConditioningStart.toISOString(), 'for tank:', alloc.tankId)
        
        const assignment = await tx.tankAssignment.create({
          data: {
            id: randomUUID(),
            tenantId: ctx.tenantId,
            tankId: alloc.tankId,
            lotId: assignmentLot.id,
            plannedVolume: alloc.volume,
            phase: 'CONDITIONING',
            status: 'ACTIVE',
            plannedStart: actualConditioningStart,
            plannedEnd: plannedEnd,
            createdBy: ctx.userId,
          } as any,
        })
        assignments.push(assignment)

        // ✅ Update new tank status
        await tx.tank.update({
          where: { id: alloc.tankId },
          data: { 
            status: 'OCCUPIED',
            currentLotId: assignmentLot.id,
            currentPhase: 'CONDITIONING',
          },
        })
        
        // ✅ დაამატე: Also update Equipment table for UI display
        await tx.equipment.update({
          where: { id: alloc.tankId },
          data: { 
            status: 'OPERATIONAL',
            currentBatchId: batch.id,
            currentBatchNumber: batch.batchNumber,
          },
        }).catch(() => {
          console.log('[CONDITIONING/START] Equipment update skipped')
        })
        }
        } // ✅ End of for loop
        
        // ✅ Mark parent lot as COMPLETED if this is a split with new child lots created
        if (body.isSplit && body.allocations!.length > 1 && !hasExistingFermChildLots) {
          await tx.lot.update({
            where: { id: lot.id },
            data: { 
              status: 'COMPLETED',
              updatedAt: new Date(),
            },
          })
          console.log('[CONDITIONING/START] ✅ Marked parent lot as COMPLETED after creating new child lots:', lot.id)
        }
      } // ✅ End of else block (standard flow)

      // ❌ REMOVED: Duplicate parent COMPLETED marking - already handled in new if block above

      // Close source fermentation if exists (legacy support)
      // ✅ Skip if already processed above OR if sourceLotId is the blend lot
      const alreadyProcessedLegacy = (body as any)._fermCompletedFor === body.sourceLotId
      if (body.sourceLotId && !alreadyProcessedLegacy && (!isBlend || body.sourceLotId !== lot.id)) {
        const oldAssignments = await tx.tankAssignment.findMany({
          where: { lotId: body.sourceLotId, status: 'ACTIVE' },
        })

        await tx.tankAssignment.updateMany({
          where: { lotId: body.sourceLotId, status: 'ACTIVE' },
          data: { 
            status: 'COMPLETED',
            actualEnd: conditioningStartTime,  // ✅ FIX: დაამატე endTime
          },
        })

        // Free old tanks (set to NEEDS_CIP)
        for (const assignment of oldAssignments) {
          await tx.equipment.update({
            where: { id: assignment.tankId },
            data: { 
              status: 'NEEDS_CIP',
              currentBatchId: null,
              nextCIP: new Date(),
            },
          })
        }

        // ✅ Only complete lot if NOT a blend (blends stay ACTIVE)
        if (!isBlend) {
          await tx.lot.update({
            where: { id: body.sourceLotId },
            data: { status: 'COMPLETED', updatedAt: new Date() },
          })
        }

        // Transfer from fermentation (only if not a blend AND we have source tank)
        if (!isBlend && oldAssignments.length > 0 && body.allocations && body.allocations.length > 0) {
          await tx.transfer.create({
            data: {
              id: randomUUID(),
              tenantId: ctx.tenantId,
              transferCode: `COND-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              transferType: 'FERMENT_TO_CONDITION',  // ✅ Changed from 'CONDITIONING'
              sourceLotId: body.sourceLotId,
              destLotId: lot.id,
              sourceTankId: oldAssignments[0].tankId,
              destTankId: body.allocations[0].tankId,
              volume: totalVolume,
              plannedAt: conditioningStartTime,
              executedAt: new Date(),
              status: 'COMPLETED',
              performedBy: ctx.userId,
            } as any,
          })
        }
      }

      // ✅ Update Batch status - but check if other lots are still in FERMENTATION
      if (!isBlend) {
        // Check if there are still lots in FERMENTATION phase for this batch
        // This includes direct lots AND child lots of parent lots
        const batchLots = await tx.lot.findMany({
          where: {
            LotBatch: { some: { batchId: body.batchId } },
          },
          select: { id: true },
        })
        const batchLotIds = batchLots.map(l => l.id)
        
        // Find remaining fermentation lots (both direct and child lots)
        const remainingFermLots = await tx.lot.findMany({
          where: {
            OR: [
              // Direct lots linked to batch
              {
                LotBatch: { some: { batchId: body.batchId } },
                phase: 'FERMENTATION',
                status: { in: ['ACTIVE', 'PLANNED'] },
              },
              // Child lots of parent lots linked to batch
              {
                parentLotId: { in: batchLotIds },
                phase: 'FERMENTATION',
                status: { in: ['ACTIVE', 'PLANNED'] },
              },
            ],
          },
        })
        
        console.log('[CONDITIONING/START] Remaining FERMENTATION lots for batch:', remainingFermLots.length, remainingFermLots.map(l => l.lotCode))
        
        if (remainingFermLots.length > 0) {
          console.log('[CONDITIONING/START] Batch still has', remainingFermLots.length, 'lots in FERMENTATION, keeping status FERMENTING')
          // Don't change batch status - other lots are still fermenting
        } else {
          // All lots are in CONDITIONING or beyond
          await tx.batch.update({
            where: { id: body.batchId },
            data: { status: 'CONDITIONING' },
          })
          console.log('[CONDITIONING/START] All lots done with FERMENTATION, updating batch to CONDITIONING')
        }
      }

      // Timeline
      await tx.batchTimeline.create({
        data: {
          id: randomUUID(),
          batchId: body.batchId,
          type: 'CONDITIONING_STARTED',
          title: 'კონდიცირება დაიწყო',
          description: `ავზი: ${tankNames}`,
          data: { 
            lotId: lot.id, 
            finalGravity: body.finalGravity, 
            temperature: body.temperature 
          },
          createdBy: ctx.userId || 'system',
        },
      })

      return { lot, assignments }
    })

    console.log('[CONDITIONING/START] ✅ Success:', result.lot.id)

    // ✅ Create gravity reading for conditioning start (FG measurement)
    // Only create gravity reading if we have actual gravity data
    if (body.finalGravity) {
      await prisma.gravityReading.create({
        data: {
          batchId: body.batchId,
          gravity: parseFloat(String(body.finalGravity)),
          temperature: body.temperature ? parseFloat(String(body.temperature)) : 20,
          notes: '❄️ კონდიცირებაზე გადასვლა - საბოლოო სიმკვრივე (FG)',
          recordedBy: ctx.userId || 'system',
          recordedAt: new Date(),
        },
      }).catch((err) => {
        console.error('[CONDITIONING/START] Failed to create gravity reading:', err.message)
      })
      console.log('[CONDITIONING/START] ✅ Gravity reading created: FG=', body.finalGravity, 'Temp=', body.temperature)
    }

    return NextResponse.json({
      success: true,
      lot: result.lot,
      assignments: result.assignments,
      message: body.isSplit ? `გაყოფილია ${body.allocations.length} ავზში` : 'კონდიცირება დაგეგმილია',
    })

  } catch (error: any) {
    console.error('[CONDITIONING/START] ❌ Error:', error.message)
    return NextResponse.json({ error: 'შეცდომა', details: error.message }, { status: 500 })
  }
})