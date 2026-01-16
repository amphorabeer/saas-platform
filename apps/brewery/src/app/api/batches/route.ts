import { NextRequest, NextResponse } from 'next/server'
import { withPermission, RouteContext } from '@/lib/api-middleware'
import { prisma } from '@saas-platform/database'

// GET /api/batches - List batches (requires batch:read)
export const GET = withPermission('batch:read', async (req: NextRequest, ctx: RouteContext) => {
  try {
    console.log('[BATCHES API] Starting request...')
    console.log('[BATCHES API] Tenant ID:', ctx.tenantId)
    
    const { searchParams } = new URL(req.url)
    const statusParam = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')
    const includeCompleted = searchParams.get('includeCompleted') === 'true'
    
    console.log('[BATCHES API] Status param:', statusParam)
    console.log('[BATCHES API] Limit:', limit)
    console.log('[BATCHES API] Include completed:', includeCompleted)
    
    // Parse status parameter - can be comma-separated
    let statusFilter: any = undefined
    if (statusParam) {
      const statuses = statusParam.split(',').map(s => s.trim().toUpperCase())
      console.log('[BATCHES API] Parsed statuses:', statuses)
      if (statuses.length === 1) {
        statusFilter = statuses[0]
      } else {
        statusFilter = { in: statuses }
      }
    }
    
    console.log('[BATCHES API] Status filter:', JSON.stringify(statusFilter))
    
    const batches = await prisma.batch.findMany({
      where: {
        tenantId: ctx.tenantId,
        ...(statusFilter && { status: statusFilter }),
      },
      include: {
        recipe: {
          include: {
            ingredients: {
              include: {
                inventoryItem: true,
              },
            },
          },
        },
        tank: true,
        // ✅ Get ALL LotBatch entries (batch might be in multiple lots during transitions)
        LotBatch: {
          include: {
            Lot: {
              include: {
                TankAssignment: {
                  // ✅ Include COMPLETED for history
                  where: { status: { in: ['PLANNED', 'ACTIVE', 'COMPLETED'] } },
                  orderBy: { createdAt: 'desc' },
                  // ✅ REMOVED take: 1 - need all assignments for history
                  include: {
                    // ✅ FIX: Use Equipment (not Tank) - this is the relation name in schema
                    Equipment: { select: { id: true, name: true, type: true } },
                  },
                },
                // ✅ ADD: Count how many batches are in this lot
                _count: {
                  select: { 
                    LotBatch: true,
                    other_Lot: true  // ✅ Count child lots to identify parent lots
                  }
                }
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
    
    console.log('[BATCHES API] Found batches:', batches.length)
    
    // ✅ Filter out batches where ALL lots are completed (unless includeCompleted=true)
    const activeBatches = includeCompleted ? batches : batches.filter((batch: any) => {
      // If batch has no lots, use batch status
      if (!batch.LotBatch || batch.LotBatch.length === 0) {
        return batch.status !== 'COMPLETED'
      }
      
      // If batch has lots, check if ANY lot is still active
      // ✅ FIX: Skip parent lots - only check child lots (with -A, -B suffix)
      const hasActiveLot = batch.LotBatch.some((lb: any) => {
        if (!lb.Lot) return false
        
        const lotCode = lb.Lot.lotCode || ''
        
        // Check if this is a parent lot by looking for child lots with same base + suffix
        if (lotCode && !lotCode.match(/-[A-Z]$/)) {
          // This might be a parent lot - check if child lots exist
          const hasChildLots = batch.LotBatch.some((other: any) => 
            other.Lot?.lotCode?.startsWith(lotCode + '-')
          )
          if (hasChildLots) {
            // Skip parent lot - we'll check children instead
            console.log(`[BATCHES API] Skipping parent lot: ${lotCode}`)
            return false
          }
        }
        
        return lb.Lot.status !== 'COMPLETED'
      })
      
      // ✅ FIX: Only show batch if it has at least one active lot
      // This prevents completed split batches from reappearing
      return hasActiveLot
    })
    
    console.log('[BATCHES API] Active batches (after filtering completed lots):', activeBatches.length)
    
    const transformedBatches = activeBatches.map((batch: any) => {
      const batchStatus = batch.status?.toUpperCase()
      const lotBatches = batch.LotBatch || []
      
      // ✅ Build ALL lots array for split batches
      const allLots = lotBatches.map((lb: any) => {
        const assignments = lb?.Lot?.TankAssignment || []
        const ta = assignments[0] // First assignment for current tank
        // ✅ FIX: Use Equipment (not Tank)
        const equipment = ta?.Equipment
        
        // ✅ Build all assignments array for history
        const allAssignments = assignments.map((a: any) => ({
          id: a.id,
          tankId: a.tankId,
          // ✅ FIX: Use Equipment (not Tank)
          tankName: a.Equipment?.name,
          tankType: a.Equipment?.type,
          phase: a.phase,     // ✅ FERMENTATION or CONDITIONING
          status: a.status,   // ✅ ACTIVE or COMPLETED
          plannedStart: a.plannedStart,
          plannedEnd: a.plannedEnd,
          actualEnd: a.actualEnd || a.endTime,  // ✅ FIX: Check both fields (actualEnd || endTime)
          createdAt: a.createdAt,
        }))
        
        return {
          id: lb.Lot?.id,
          lotCode: lb.Lot?.lotCode,
          phase: lb.Lot?.phase,
          status: lb.Lot?.status,
          volume: lb.Lot?.actualVolume || lb.Lot?.plannedVolume,
          tank: equipment ? { id: equipment.id, name: equipment.name, type: equipment.type } : null,
          assignments: allAssignments,  // ✅ All assignments for history
          parentLotId: (lb.Lot as any)?.parentLotId || null,  // ✅ Add parentLotId for parent detection
          batchCount: lb.Lot?._count?.LotBatch || 0,  // ✅ ADD batch count
          isBlendResult: (lb.Lot as any)?.isBlendResult || false,  // ✅ ADD blend flag
        }
      })
      
      const isSplit = allLots.length > 1
      
      // Don't show tank for COMPLETED batches
      if (batchStatus === 'COMPLETED') {
        return { 
          ...batch, 
          tankName: null,
          allLots,
          isSplit,
        }
      }
      
      // ✅ Map batch status to expected TankAssignment phase
      const statusToPhase: Record<string, string> = {
        'FERMENTING': 'FERMENTATION',
        'CONDITIONING': 'CONDITIONING', 
        'READY': 'BRIGHT',
        'PACKAGING': 'PACKAGING',
      }
      const expectedPhase = statusToPhase[batchStatus]
      
      // ✅ Search through ALL LotBatch entries to find correct tank
      let tankName: string | null = null
      
      for (const lotBatch of lotBatches) {
        const assignments = lotBatch.Lot?.TankAssignment || []
        
        // Find assignment with matching phase that's not completed
        const matchingAssignment = assignments.find((ta: any) => 
          ta.phase === expectedPhase && ta.status !== 'COMPLETED'
        )
        
        // ✅ FIX: Use Equipment (not Tank)
        if (matchingAssignment?.Equipment?.name) {
          tankName = matchingAssignment.Equipment.name
          break
        }
        
        // Fallback: find ANY active assignment
        if (!tankName) {
          const activeAssignment = assignments.find((ta: any) => 
            ta.status === 'ACTIVE' || ta.status === 'PLANNED'
          ) as any
          // ✅ FIX: Use Equipment (not Tank)
          if (activeAssignment?.Equipment?.name) {
            tankName = activeAssignment.Equipment.name
          }
        }
      }
      
      // Final fallback to direct tank relation
      if (!tankName) {
        tankName = batch.tank?.name || null
      }
      
      console.log(`[BATCHES API] ${batch.batchNumber}: status=${batchStatus}, phase=${expectedPhase}, tank=${tankName}, isSplit=${isSplit}, lots=${allLots.length}`)
      
      // ✅ Find currentLot - prefer CHILD lots (with -A, -B suffix) over parent
      // Split batch structure: parent lot + child lots, we want to work with child lots
      let currentLot = null
      
      // First, look for active CHILD lots (have -A, -B etc. suffix)
      for (const lot of allLots) {
        if (lot.status === 'ACTIVE' && 
            lot.phase !== 'COMPLETED' && 
            lot.lotCode?.match(/-[A-Z]$/)) {  // Child lots have -A, -B suffix
          currentLot = lot
          break
        }
      }
      
      // If no active child lot found, look for any active lot
      if (!currentLot) {
        for (const lot of allLots) {
          if (lot.status === 'ACTIVE' && lot.phase !== 'COMPLETED') {
            currentLot = lot
            break
          }
        }
      }
      
      // Final fallback to first lot
      if (!currentLot && allLots.length > 0) {
        currentLot = allLots[0]
      }
      
      if (currentLot) {
        console.log(`[BATCHES API] ${batch.batchNumber}: currentLot = ${currentLot.lotCode} (id: ${currentLot.id})`)
      }
      
      // ✅ Get currentTank from active assignment on currentLot (or first assignment)
      const activeAssignment = (currentLot?.assignments || []).find((a: any) => a.status === 'ACTIVE') 
        || (currentLot?.assignments || [])[0]
      const currentTank = activeAssignment ? {
        id: activeAssignment.tankId,
        name: activeAssignment.tankName,
        type: activeAssignment.tankType,
      } : null
      
      return { 
        ...batch, 
        volume: Number(batch.volume) || 0, // ✅ Convert Decimal to Number for JSON serialization
        packagedVolume: Number(batch.packagedVolume) || 0, // ✅ Convert Decimal to Number for JSON serialization
        tankName,
        allLots,
        isSplit,
        currentLot,   // ✅ Add currentLot for modal
        currentTank,  // ✅ Added for Unitank detection in UI
      }
    })
    
    return NextResponse.json({ batches: transformedBatches })
  } catch (error) {
    console.error('[BATCHES API] Error:', error)
    console.error('[BATCHES API] Error stack:', error instanceof Error ? error.stack : 'No stack')
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
})

// POST /api/batches - Create batch (requires batch:create)
export const POST = withPermission('batch:create', async (req: NextRequest, ctx: RouteContext) => {
  try {
    const body = await req.json()
    
    console.log('[POST /api/batches] Starting batch creation...')
    console.log('[POST /api/batches] Tenant ID:', ctx.tenantId)
    console.log('[POST /api/batches] Request body:', JSON.stringify(body, null, 2))

    const { recipeId, volume, plannedDate, notes, batchPrefix } = body
    // ❌ tankId არ ვიყენებთ! Tank მინიჭება ხდება StartFermentationModalV2-ით

    if (!recipeId) {
      return NextResponse.json({ error: 'Recipe ID is required' }, { status: 400 })
    }

    // Verify recipe exists
    const recipe = await prisma.recipe.findFirst({
      where: { id: recipeId, tenantId: ctx.tenantId },
    })

    if (!recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
    }

    // Generate batch number - use prefix from settings (default to 'BRW-')
    const prefix = batchPrefix || 'BRW-'
    const today = new Date()
    const year = today.getFullYear()
    
    const lastBatch = await prisma.batch.findFirst({
      where: {
        tenantId: ctx.tenantId,
        batchNumber: { startsWith: `${prefix}${year}-` },
      },
      orderBy: { batchNumber: 'desc' },
      select: { batchNumber: true },
    })
    
    let nextNumber = 1
    if (lastBatch?.batchNumber) {
      // Extract number from format like "BRW-2025-0018" or custom prefix
      const prefixEscaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape regex special chars
      const match = lastBatch.batchNumber.match(new RegExp(`${prefixEscaped}\\d{4}-(\\d+)`))
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1
      }
    }
    
    const batchNumber = `${prefix}${year}-${String(nextNumber).padStart(4, '0')}`
    
    console.log('[POST /api/batches] Generated batch number:', batchNumber)

    // Create batch WITHOUT tankId
    const batch = await prisma.batch.create({
      data: {
        tenantId: ctx.tenantId,
        batchNumber,
        recipeId,
        volume: parseFloat(String(volume || recipe.batchSize || 100)),
        plannedDate: plannedDate ? new Date(plannedDate) : new Date(),
        status: 'PLANNED',
        // ❌ tankId არ ვაყენებთ!
        targetOg: recipe.og ? parseFloat(String(recipe.og)) : null,
        notes: notes || null,
        createdBy: ctx.userId || 'system',
      },
      include: {
        recipe: {
          select: { id: true, name: true, style: true },
        },
      },
    })

    console.log('[POST /api/batches] ✅ Created batch:', batch.batchNumber)

    return NextResponse.json(batch, { status: 201 })

  } catch (error: any) {
    console.error('[POST /api/batches] ❌ Error:', error.message)
    return NextResponse.json(
      { error: 'Failed to create batch', details: error.message },
      { status: 500 }
    )
  }
})
