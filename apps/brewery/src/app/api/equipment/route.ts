import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@saas-platform/database'
import { withTenant, RouteContext } from '@/lib/api-middleware'

// Tank types that need a corresponding Tank record
const TANK_TYPES = ['FERMENTER', 'BRITE', 'UNITANK']

// GET - List all equipment (with Tank data for phase)
export const GET = withTenant(async (
  req: NextRequest,
  ctx: RouteContext
) => {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type')
    const status = searchParams.get('status')
    
    const where: any = {
        tenantId: ctx.tenantId,
    }
    
    if (type && type !== 'all') {
      where.type = type.toUpperCase()
    }
    
    if (status && status !== 'all') {
      where.status = status.toUpperCase()
    }
    
    // Get equipment
    const equipment = await prisma.equipment.findMany({
      where,
      orderBy: { name: 'asc' },
    })
    
    // ✅ Get Tank data (for currentPhase)
    const tankTypes = ['FERMENTER', 'BRITE', 'UNITANK']
    const equipmentIds = equipment
      .filter((eq: any) => tankTypes.includes(eq.type))
      .map((eq: any) => eq.id)
    
    const tanks = equipmentIds.length > 0 ? await prisma.tank.findMany({
      where: { id: { in: equipmentIds } },
      select: { 
        id: true, 
        currentPhase: true, 
        currentLotId: true,
        status: true,
      },
    }) : []
    const tankMap = new Map(tanks.map(t => [t.id, t]))
    
    // ✅ NEW: Get TankAssignments with volume and batch info
    const tankAssignments = equipmentIds.length > 0 ? await prisma.tankAssignment.findMany({
          where: {
        tankId: { in: equipmentIds },
            status: { in: ['PLANNED', 'ACTIVE'] },
          },
      include: {
            Lot: {
          include: {
                LotBatch: {
              include: {
                Batch: {
                  select: {
                    id: true,
                        batchNumber: true,
                        status: true,
                        volume: true,
                        currentGravity: true,
                        originalGravity: true,
                        finalGravity: true,
                        // ✅ Include gravity readings
                        gravityReadings: {
                          orderBy: { recordedAt: 'desc' },
                          take: 10,
                          select: {
                            gravity: true,
                            temperature: true,
                            recordedAt: true,
                            notes: true,
                          },
                        },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }) : []
    
    // Group assignments by tankId
    const assignmentMap = new Map<string, any[]>()
    for (const assignment of tankAssignments) {
      const existing = assignmentMap.get(assignment.tankId) || []
      existing.push(assignment)
      assignmentMap.set(assignment.tankId, existing)
    }
    
    // Transform response
    const transformed = equipment.map((eq: any) => {
      const tankData = tankMap.get(eq.id)
      const assignments = assignmentMap.get(eq.id) || []
      
      // ✅ Transform assignments to frontend format
      const tankAssignmentsFormatted = assignments.map((ta: any) => {
        const batch = ta.Lot?.LotBatch?.[0]?.Batch
        const gravityReadings = batch?.gravityReadings || []
        
        // Sort readings by date ascending to get first reading for OG
        const readingsSorted = [...gravityReadings].sort((a: any, b: any) => 
          new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
        )
        
        // OG = first reading (earliest) OR one with "OG" in notes
        const ogReading = readingsSorted.find((r: any) => r.notes?.toLowerCase().includes('og')) || readingsSorted[0]
        // SG = latest reading (most recent)
        const latestReading = gravityReadings[0] // Already ordered desc, so first is latest
        
        // Use batch fields first, fallback to readings
        const og = batch?.originalGravity ? Number(batch.originalGravity) : (ogReading?.gravity ? Number(ogReading.gravity) : null)
        const sg = batch?.currentGravity ? Number(batch.currentGravity) : (latestReading?.gravity ? Number(latestReading.gravity) : null)
        
        return {
          id: ta.id,
          phase: ta.phase,
          status: ta.status,
          plannedVolume: ta.plannedVolume ? Number(ta.plannedVolume) : null,
          actualVolume: ta.actualVolume ? Number(ta.actualVolume) : null,
          startedAt: ta.startedAt,
          createdAt: ta.createdAt,
          lot: ta.Lot ? {
            id: ta.Lot.id,
            lotNumber: ta.Lot.lotCode || ta.Lot.lotNumber,
            lotCode: ta.Lot.lotCode,
            lotBatches: ta.Lot.LotBatch?.map((lb: any) => {
              const b = lb.Batch
              const readings = b?.gravityReadings || []
              // Sort readings by date ascending to get first reading for OG
              const readingsSorted = [...readings].sort((a: any, b: any) => 
                new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
              )
              // OG = first reading (earliest) OR one with "OG" in notes
              const ogR = readingsSorted.find((r: any) => r.notes?.toLowerCase().includes('og')) || readingsSorted[0]
              // SG = latest reading (most recent)
              const latestR = readings[0] // Already ordered desc, so first is latest
              
              return {
                Batch: {
                  id: b?.id,
                  batchNumber: b?.batchNumber,
                  status: b?.status,
                  volume: b?.volume ? Number(b.volume) : null,
                  currentGravity: b?.currentGravity ? Number(b.currentGravity) : (latestR?.gravity ? Number(latestR.gravity) : null),
                  originalGravity: b?.originalGravity ? Number(b.originalGravity) : (ogR?.gravity ? Number(ogR.gravity) : null),
                  gravityReadings: readings.map((r: any) => ({
                    gravity: Number(r.gravity),
                    temperature: r.temperature ? Number(r.temperature) : null,
                    recordedAt: r.recordedAt,
                  })),
                },
              }
            }) || [],
          } : null,
        }
      })
      
      // ✅ Get active assignment for current volume
      const activeAssignment = assignments.find((a: any) => a.status === 'ACTIVE')
      const currentVolume = activeAssignment?.actualVolume 
        ? Number(activeAssignment.actualVolume) 
        : activeAssignment?.plannedVolume 
          ? Number(activeAssignment.plannedVolume) 
          : null
      
      // ✅ Get current batch number and gravity from active assignment
      const currentBatch = activeAssignment?.Lot?.LotBatch?.[0]?.Batch
      const currentBatchNumber = currentBatch?.batchNumber || null
      
      // ✅ Get gravity from batch fields OR gravityReadings
      const gravityReadings = currentBatch?.gravityReadings || []
      
      // Sort readings by date ascending to get first reading for OG
      const readingsSorted = [...gravityReadings].sort((a: any, b: any) => 
        new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
      )
      
      // OG = first reading (earliest) OR one with "OG" in notes
      const ogReading = readingsSorted.find((r: any) => r.notes?.toLowerCase().includes('og')) || readingsSorted[0]
      // SG = latest reading (most recent)
      const latestReading = gravityReadings[0] // Already ordered desc, so first is latest
      
      const originalGravity = currentBatch?.originalGravity
        ? Number(currentBatch.originalGravity).toFixed(3)
        : ogReading?.gravity
          ? Number(ogReading.gravity).toFixed(3)
          : null
      
      const currentGravity = currentBatch?.currentGravity 
        ? Number(currentBatch.currentGravity).toFixed(3)
        : latestReading?.gravity
          ? Number(latestReading.gravity).toFixed(3)
          : null
      
      // ✅ Calculate fermentation/conditioning progress based on gravity
      let progress: number | null = null
      if (originalGravity && currentGravity && currentBatch?.finalGravity) {
        const og = Number(originalGravity)
        const sg = Number(currentGravity)
        const fg = Number(currentBatch.finalGravity) || 1.010
        if (og > fg) {
          progress = Math.round(((og - sg) / (og - fg)) * 100)
          progress = Math.max(0, Math.min(100, progress)) // Clamp between 0-100
        }
      }
      
      // ✅ Calculate conditioning progress (time-based)
      let conditioningProgress: number | null = null
      let conditioningDaysRemaining: number | null = null
      
      if (tankData?.currentPhase === 'CONDITIONING' && activeAssignment) {
        // Typically conditioning takes 7-14 days
        const conditioningDays = 7
        const startDate = new Date(activeAssignment.startedAt || activeAssignment.createdAt)
        const now = new Date()
        const daysPassed = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        conditioningProgress = Math.min(100, Math.round((daysPassed / conditioningDays) * 100))
        conditioningDaysRemaining = Math.max(0, conditioningDays - daysPassed)
      }
      
      // ✅ Get temp and set target based on phase
      // PRIORITY: Use batch gravity reading temperature first, then Equipment.currentTemp
      let currentTemp: number | null = latestReading?.temperature != null 
        ? Number(latestReading.temperature) 
        : (eq.currentTemp != null ? Number(eq.currentTemp) : null)
      let targetTemp: number | null = null
      
      // Set target temp based on phase
      if (tankData?.currentPhase === 'FERMENTATION') {
        targetTemp = 18  // Fermentation temp
      } else if (tankData?.currentPhase === 'CONDITIONING') {
        targetTemp = 4   // Cold conditioning temp
      }
      
      return {
        ...eq,
        capacity: eq.capacity ? Number(eq.capacity) : null,
        // ✅ Include currentPhase from Tank table
        currentPhase: tankData?.currentPhase || null,
        currentLotId: tankData?.currentLotId || null,
        // ✅ Include tankAssignments with volume data
        tankAssignments: tankAssignmentsFormatted,
        // ✅ NEW: Include current batch and volume info
        currentBatchNumber,
        currentVolume,
        currentTemp,
        targetTemp,
        currentGravity,
        originalGravity,
        progress,
        conditioningProgress,
        conditioningDaysRemaining,
      }
    })
    
    return NextResponse.json(transformed)
  } catch (error) {
    console.error('[GET /api/equipment] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch equipment' },
      { status: 500 }
    )
  }
})

// POST - Create new equipment
export const POST = withTenant(async (
  req: NextRequest,
  ctx: RouteContext
) => {
  try {
    const body = await req.json()

    const existing = await prisma.equipment.findFirst({
      where: {
        tenantId: ctx.tenantId,
        name: body.name,
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'ამ სახელით აღჭურვილობა უკვე არსებობს' },
        { status: 400 }
      )
    }
    
    const nextCIP = new Date()
    nextCIP.setDate(nextCIP.getDate() + (body.cipIntervalDays || 7))
    
    const capabilities = (body.capabilities || []).map((cap: string) => cap.toUpperCase())
    const equipmentType = body.type?.toUpperCase() || 'FERMENTER'
    
    // Use transaction to create both Equipment and Tank (if applicable)
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Equipment
      const equipmentId = crypto.randomUUID()
      const equipment = await tx.equipment.create({
      data: {
          id: equipmentId,
        tenantId: ctx.tenantId,
        name: body.name,
          type: equipmentType,
        status: body.status?.toUpperCase() || 'OPERATIONAL',
        capacity: body.capacity ? parseInt(String(body.capacity)) : null,
        model: body.model || null,
        manufacturer: body.manufacturer || null,
        serialNumber: body.serialNumber || null,
        location: body.location || null,
        workingPressure: body.workingPressure ? parseFloat(String(body.workingPressure)) : null,
        capabilities,
        installationDate: body.installationDate ? new Date(body.installationDate) : null,
        warrantyDate: body.warrantyDate ? new Date(body.warrantyDate) : null,
        cipIntervalDays: body.cipIntervalDays || 7,
        inspectionIntervalDays: body.inspectionIntervalDays || 30,
        annualMaintenanceDays: body.annualMaintenanceDays || 365,
        nextCIP,
        notes: body.notes || null,
        updatedAt: new Date(),
        } as any
      })
      
      // 2. If it's a tank type, also create Tank record with same ID
      if (TANK_TYPES.includes(equipmentType)) {
        await tx.tank.create({
          data: {
            id: equipmentId,  // Same ID as Equipment
            tenantId: ctx.tenantId,
            name: body.name,
            type: equipmentType as 'FERMENTER' | 'BRITE' | 'UNITANK',
            capacity: body.capacity ? parseInt(String(body.capacity)) : 0,
            status: 'AVAILABLE',
            location: body.location || null,
            capabilities,
      }
        })
        console.log(`[POST /api/equipment] Created Tank record for ${equipmentType}: ${equipmentId}`)
      }
      
      return equipment
    })
    
    return NextResponse.json(result, { status: 201 })
  } catch (error: any) {
    console.error('[POST /api/equipment] Error:', error.message)
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'ამ სახელით აღჭურვილობა უკვე არსებობს' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to create equipment', details: error.message },
      { status: 500 }
    )
  }
})