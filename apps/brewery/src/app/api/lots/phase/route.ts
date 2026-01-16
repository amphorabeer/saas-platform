import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@saas-platform/database'
import { withTenant, RouteContext } from '@/lib/api-middleware'

// ═══════════════════════════════════════════════════════════
// PATCH /api/lots/phase
// Update lot phase and optionally status
// ✅ Now records phase changes in gravity readings for timeline
// ═══════════════════════════════════════════════════════════

export const PATCH = withTenant(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const body = await req.json()
    const { lotId, phase, status } = body
    
    console.log('[LOTS/PHASE PATCH] Request:', { lotId, phase, status })
    
    if (!lotId) {
      return NextResponse.json({ error: 'lotId is required' }, { status: 400 })
    }
    
    // Find the lot first
    const lot = await prisma.lot.findFirst({
      where: {
        id: lotId,
        tenantId: ctx.tenantId,
      },
      include: {
        LotBatch: {
          include: {
            Batch: {
              select: {
                id: true,
                batchNumber: true,
                status: true,
              }
            }
          }
        },
        TankAssignment: {
          where: { status: { not: 'COMPLETED' } },
          orderBy: { createdAt: 'desc' },
          take: 1,
        }
      }
    })
    
    if (!lot) {
      return NextResponse.json({ error: 'Lot not found' }, { status: 404 })
    }
    
    const oldPhase = lot.phase
    const updateData: any = {}
    
    if (phase) {
      updateData.phase = phase
    }
    
    if (status) {
      updateData.status = status
    }
    
    // Update lot
    const updatedLot = await prisma.lot.update({
      where: { id: lotId },
      data: updateData,
    })
    console.log('[LOTS/PHASE PATCH] Lot updated: phase=' + updatedLot.phase)
    
    // Update tank assignment phase if exists
    if (phase && lot.TankAssignment?.[0]) {
      await prisma.tankAssignment.update({
        where: { id: lot.TankAssignment[0].id },
        data: { phase },
      })
      console.log('[LOTS/PHASE PATCH] TankAssignment phase updated:', lot.TankAssignment[0].id)
      
      // NOTE: Equipment doesn't have currentPhase field - phase is tracked via TankAssignment
    }
    
    // ✅ NEW: Record phase change in gravity readings for timeline history
    // Only record BRIGHT and PACKAGING transitions (FERMENTATION and CONDITIONING are already recorded)
    if (phase && (phase === 'BRIGHT' || phase === 'PACKAGING')) {
      const phaseLabels: Record<string, string> = {
        'BRIGHT': 'მზადაა - ფაზის შეცვლა',
        'PACKAGING': 'დაფასოება დაიწყო',
      }
      
      const phaseIcons: Record<string, string> = {
        'BRIGHT': '✨',
        'PACKAGING': '📦',
      }
      
      // Get first batch to record the phase change marker
      const firstBatch = lot.LotBatch?.[0]?.Batch
      if (firstBatch) {
        // Create a gravity reading marker (no actual gravity value, just notes)
        await prisma.gravityReading.create({
          data: {
            batch: { connect: { id: firstBatch.id } },
            gravity: 0, // Marker - no actual reading
            temperature: 0, // Required field - 0 for phase markers
            notes: `${phaseIcons[phase]} ${phaseLabels[phase]} (${oldPhase} → ${phase})`,
            recordedAt: new Date(),
            recordedBy: 'System', // Required field
            // readingType removed - doesn't exist in GravityReading schema
          }
        })
        console.log('[LOTS/PHASE PATCH] Phase change marker created:', phaseLabels[phase])
      }
    }
    
    // ✅ FIX: Update all batches in lot to new status based on phase
    if (phase) {
      const batchStatus = 
        phase === 'CONDITIONING' ? 'CONDITIONING' :
        phase === 'BRIGHT' ? 'READY' : 
        phase === 'PACKAGING' ? 'PACKAGING' : null
      
      if (batchStatus && lot.LotBatch) {
        const batchIds = lot.LotBatch.map(lb => lb.batchId)
        const updateResult = await prisma.batch.updateMany({
          where: { id: { in: batchIds } },
          data: { status: batchStatus }
        })
        console.log('[LOTS/PHASE PATCH] Updated', updateResult.count, 'batches to', batchStatus)
      }
    }
    
    // If status is COMPLETED, complete all batches
    if (status === 'COMPLETED' && lot.LotBatch) {
      const batchIds = lot.LotBatch.map(lb => lb.batchId)
      
      // Update batches
      await prisma.batch.updateMany({
        where: { id: { in: batchIds } },
        data: { 
          status: 'COMPLETED',
          completedAt: new Date(),
        }
      })
      console.log('[LOTS/PHASE PATCH] Completed', batchIds.length, 'batches')
      
      // Complete tank assignment
      if (lot.TankAssignment?.[0]) {
        await prisma.tankAssignment.update({
          where: { id: lot.TankAssignment[0].id },
          data: { 
            status: 'COMPLETED',
            actualEnd: new Date(),
          }
        })
        
        // Clear tank - only fields that exist in Equipment schema
        await prisma.equipment.update({
          where: { id: lot.TankAssignment[0].tankId },
          data: {
            currentBatchId: null,
            currentBatchNumber: null,
            status: 'NEEDS_CIP',
          }
        })
        console.log('[LOTS/PHASE PATCH] Tank cleared:', lot.TankAssignment[0].tankId)
      }
      
      // ✅ Record completion marker
      const firstBatch = lot.LotBatch?.[0]?.Batch
      if (firstBatch) {
        await prisma.gravityReading.create({
          data: {
            batch: { connect: { id: firstBatch.id } },
            gravity: 0,
            temperature: 0, // Required field - 0 for phase markers
            notes: '✅ ლოტი დასრულდა',
            recordedAt: new Date(),
            recordedBy: 'System', // Required field
            // readingType removed - doesn't exist in GravityReading schema
          }
        })
        console.log('[LOTS/PHASE PATCH] Completion marker created')
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      lot: updatedLot,
      phaseChanged: phase ? `${oldPhase} → ${phase}` : null,
    })
  } catch (error) {
    console.error('[LOTS/PHASE PATCH] Error:', error)
    return NextResponse.json({ error: 'Failed to update lot phase' }, { status: 500 })
  }
})