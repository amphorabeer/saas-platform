import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@saas-platform/database'
import { generateBlendLotCode } from '@/lib/lot-helpers'

// POST /api/batches/blend - Create a blend from lots or batches
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      type,           // 'lots' | 'batches'
      sourceIds,      // Array of lot IDs or batch IDs
      name,           // Name for the blend batch
      targetTankId,   // Optional tank to assign
      notes           // Optional notes
    } = body

    console.log('[BLEND] Request:', { type, sourceIds, name, targetTankId })

    if (!type || !sourceIds || !Array.isArray(sourceIds) || sourceIds.length < 2) {
      return NextResponse.json(
        { error: 'Type and at least 2 source IDs required' },
        { status: 400 }
      )
    }

    if (!name) {
      return NextResponse.json(
        { error: 'Blend name is required' },
        { status: 400 }
      )
    }

    let sourceLots: any[] = []
    let sourceRecipeId: string | null = null
    let totalVolume = 0

    // Get source lots based on type
    if (type === 'lots') {
      // Direct lot IDs provided
      sourceLots = await prisma.lot.findMany({
        where: { id: { in: sourceIds } },
        include: {
          LotBatch: {
            include: {
              Batch: {
                include: { recipe: true }
              }
            }
          },
          TankAssignment: {
            where: { status: 'ACTIVE' },
            include: { Tank: true } as any
          }
        }
      })

      if (sourceLots.length !== sourceIds.length) {
        return NextResponse.json(
          { error: 'Some lots not found' },
          { status: 404 }
        )
      }

      // Get recipe from first lot's batch
      sourceRecipeId = sourceLots[0]?.LotBatch?.[0]?.Batch?.recipeId || null
      totalVolume = sourceLots.reduce((sum, lot) => sum + (lot.volume || 0), 0)

    } else if (type === 'batches') {
      // Batch IDs provided - get their active lots
      const batches = await prisma.batch.findMany({
        where: { id: { in: sourceIds } },
        include: {
          recipe: true,
          LotBatch: {
            include: {
              Lot: {
                include: {
                  TankAssignment: {
                    where: { status: 'ACTIVE' },
                    include: { Tank: true } as any
                  }
                }
              }
            }
          }
        }
      })

      if (batches.length !== sourceIds.length) {
        return NextResponse.json(
          { error: 'Some batches not found' },
          { status: 404 }
        )
      }

      // Get all active lots from these batches
      for (const batch of batches) {
        for (const lotBatch of batch.LotBatch) {
          if (lotBatch.Lot && lotBatch.Lot.status !== 'COMPLETED') {
            sourceLots.push(lotBatch.Lot)
          }
        }
      }

      if (sourceLots.length < 2) {
        return NextResponse.json(
          { error: 'Not enough active lots found in selected batches' },
          { status: 400 }
        )
      }

      // Get recipe from first batch
      sourceRecipeId = batches[0]?.recipeId || null
      totalVolume = sourceLots.reduce((sum, lot) => sum + (lot.volume || 0), 0)

    } else {
      return NextResponse.json(
        { error: 'Invalid type. Use "lots" or "batches"' },
        { status: 400 }
      )
    }

    console.log('[BLEND] Source lots:', sourceLots.length, 'Total volume:', totalVolume)

    // Get tenantId from first source lot
    const tenantId = sourceLots[0]?.tenantId
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID not found in source lots' },
        { status: 400 }
      )
    }

    // Generate blend batch number
    const today = new Date()
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')
    const existingBlends = await prisma.batch.count({
      where: {
        batchNumber: { startsWith: `BLD-${dateStr}` }
      }
    })
    const batchNumber = `BLD-${dateStr}-${String(existingBlends + 1).padStart(3, '0')}`

    // ✅ Generate BLEND lot code
    const blendLotCode = await generateBlendLotCode(tenantId)

    // Create the blend batch and lot in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create new Blend Batch
      const newBatch = await tx.batch.create({
        data: {
          tenantId,
          batchNumber,
          recipeId: sourceRecipeId || undefined,
          volume: totalVolume,
          status: 'CONDITIONING',  // Blends typically start in conditioning
          brewedAt: new Date(),
          notes: notes || `Blend from ${sourceLots.length} lots`,
        } as any
      })

      console.log('[BLEND] Created batch:', newBatch.id)

      // 2. Create new Blend Lot with BLEND code
      const newLot = await tx.lot.create({
        data: {
          tenantId,
          lotCode: blendLotCode,  // ✅ BLEND-2026-0001
          plannedVolume: totalVolume,
          status: 'ACTIVE',
          phase: 'CONDITIONING',
          isBlendResult: true,
          isBlendTarget: true,
          blendedAt: new Date(),
        } as any
      })

      console.log('[BLEND] Created lot:', newLot.id)

      // 3. Link blend lot to blend batch
      await tx.lotBatch.create({
        data: {
          id: `lotbatch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          lotId: newLot.id,
          batchId: newBatch.id,
          batchPercentage: 100,
          volumeContribution: totalVolume,
        }
      })

      // 4. Mark source lots as COMPLETED (blended)
      for (const sourceLot of sourceLots) {
        await tx.lot.update({
          where: { id: sourceLot.id },
          data: { 
            status: 'COMPLETED',
            // Link to blend lot as parent
            parentLotId: newLot.id,
          }
        })

        // End any active tank assignments for source lots
        await tx.tankAssignment.updateMany({
          where: { 
            lotId: sourceLot.id,
            status: 'ACTIVE'
          },
          data: {
            status: 'COMPLETED',
            actualEnd: new Date(),  // ✅ Use actualEnd instead of endTime for updateMany
          }
        })
        
        // ✅ FIX: Release source tanks
        const sourceAssignments = await tx.tankAssignment.findMany({
          where: { lotId: sourceLot.id },
          select: { tankId: true }
        })
        
        for (const assignment of sourceAssignments) {
          await tx.tank.update({
            where: { id: assignment.tankId },
            data: {
              status: 'AVAILABLE',
              currentLotId: null,
              currentPhase: null,
            }
          }).catch(() => {})
          
          await tx.equipment.update({
            where: { id: assignment.tankId },
            data: {
              status: 'NEEDS_CIP',
              currentBatchId: null,
              currentBatchNumber: null,
              nextCIP: new Date(),
            }
          }).catch(() => {})
        }
      }

      // 5. If target tank specified, create assignment
      if (targetTankId) {
        await tx.tankAssignment.create({
          data: {
            id: `tankassign-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            lotId: newLot.id,
            tankId: targetTankId,
            phase: 'CONDITIONING',
            status: 'ACTIVE',
            createdBy: 'system',
          } as any
        })

        // Update tank status
        await tx.equipment.update({
          where: { id: targetTankId },
          data: { status: 'OPERATIONAL' }
        })
      }

      // 6. Create timeline entry
      await tx.batchTimeline.create({
        data: {
          batchId: newBatch.id,
          type: 'BLEND_CREATED',
          title: 'ბლენდი შექმნილია',
          description: `Blend created from ${sourceLots.length} lots`,
          createdBy: 'system',
        } as any
      })

      return { batch: newBatch, lot: newLot }
    })

    console.log('[BLEND] Success:', result)

    return NextResponse.json({
      success: true,
      batch: result.batch,
      lot: result.lot,
      message: `Blend created from ${sourceLots.length} lots`
    })

  } catch (error) {
    console.error('[BLEND] Error:', error)
    return NextResponse.json(
      { error: 'Failed to create blend', details: String(error) },
      { status: 500 }
    )
  }
}

// GET /api/batches/blend - Get available lots/batches for blending
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'lots'

    if (type === 'lots') {
      // Get all active lots in CONDITIONING or BRIGHT phase (ready for blending)
      const lots = await prisma.lot.findMany({
        where: {
          status: 'ACTIVE',
          phase: { in: ['CONDITIONING', 'BRIGHT'] },
        },
        include: {
          LotBatch: {
            include: {
              Batch: {
                include: { recipe: true }
              }
            }
          },
          TankAssignment: {
            where: { status: 'ACTIVE' },
            include: { Tank: true } as any
          }
        },
        orderBy: { createdAt: 'desc' }
      })

      return NextResponse.json({ lots })

    } else if (type === 'batches') {
      // Get batches in CONDITIONING or READY status
      const batches = await prisma.batch.findMany({
        where: {
          status: { in: ['CONDITIONING', 'READY'] },
        },
        include: {
          recipe: true,
          LotBatch: {
            include: {
              Lot: {
                include: {
                  TankAssignment: {
                    where: { status: 'ACTIVE' },
                    include: { Tank: true } as any
                  }
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })

      return NextResponse.json({ batches })
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })

  } catch (error) {
    console.error('[BLEND GET] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch blend candidates' },
      { status: 500 }
    )
  }
}
