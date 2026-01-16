import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@saas-platform/database'
import { withTenant, RouteContext } from '@/lib/api-middleware'

// GET - Single equipment with full details
export const GET = withTenant(async (
  req: NextRequest,
  ctx: RouteContext
) => {
  try {
    // Extract id from URL: /api/equipment/[id]
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    const idIndex = pathParts.indexOf('equipment') + 1
    const equipmentId = pathParts[idIndex]
    
    if (!equipmentId || equipmentId === 'equipment') {
      return NextResponse.json(
        { error: 'Equipment ID is required' },
        { status: 400 }
      )
    }
    
    // Verify equipment belongs to tenant
    const equipment = await prisma.equipment.findFirst({
      where: {
        id: equipmentId,
        tenantId: ctx.tenantId,
      },
    })
    
    if (!equipment) {
      return NextResponse.json(
        { error: 'აღჭურვილობა ვერ მოიძებნა' },
        { status: 404 }
      )
    }
    
    // Get related data separately to avoid relation errors
    // Note: MaintenanceLog, CIPLog, ProblemReport don't have tenantId field
    // Equipment is already filtered by tenantId, so we're safe to use equipmentId only
    const [maintenanceLogs, cipLogs, problemReports] = await Promise.all([
      prisma.maintenanceLog.findMany({
        where: { equipmentId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }).catch(() => []),
      prisma.cIPLog.findMany({
        where: { equipmentId },
        orderBy: { date: 'desc' },
        take: 10,
      }).catch(() => []),
      prisma.problemReport.findMany({
        where: { equipmentId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }).catch(() => []),
    ])
    
    return NextResponse.json({
      ...equipment,
      maintenanceLogs,
      cipLogs,
      problemReports,
      tankAssignments: [],
    })
  } catch (error: any) {
    console.error('[GET /api/equipment/:id] Error:', error)
    return NextResponse.json(
      { error: 'აღჭურვილობის მიღება ვერ მოხერხდა', details: error.message },
      { status: 500 }
    )
  }
})

// PUT - Update equipment
export const PUT = withTenant(async (
  req: NextRequest,
  ctx: RouteContext
) => {
  try {
    // Extract id from URL: /api/equipment/[id]
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    const idIndex = pathParts.indexOf('equipment') + 1
    const equipmentId = pathParts[idIndex]
    
    if (!equipmentId || equipmentId === 'equipment') {
      return NextResponse.json(
        { error: 'Equipment ID is required' },
        { status: 400 }
      )
    }
    
    // Verify equipment belongs to tenant
    const existing = await prisma.equipment.findFirst({
      where: {
        id: equipmentId,
        tenantId: ctx.tenantId,
      },
    })
    
    if (!existing) {
      return NextResponse.json(
        { error: 'აღჭურვილობა ვერ მოიძებნა' },
        { status: 404 }
      )
    }
    
    const body = await req.json()
    
    // Convert capabilities to uppercase if provided
    const capabilities = body.capabilities 
      ? body.capabilities.map((cap: string) => cap.toUpperCase())
      : undefined
    
    const equipment = await prisma.equipment.update({
      where: { id: equipmentId },
      data: {
        name: body.name,
        type: body.type?.toUpperCase(),
        status: body.status?.toUpperCase(),
        capacity: body.capacity ? parseInt(String(body.capacity)) : null,
        model: body.model || null,
        manufacturer: body.manufacturer || null,
        serialNumber: body.serialNumber || null,
        location: body.location || null,
        workingPressure: body.workingPressure ? parseFloat(String(body.workingPressure)) : null,
        capabilities: capabilities,
        cipIntervalDays: body.cipIntervalDays,
        inspectionIntervalDays: body.inspectionIntervalDays,
        notes: body.notes || null,
        updatedAt: new Date(),
      }
    })
    
    return NextResponse.json({ equipment })
  } catch (error: any) {
    console.error('[PUT /api/equipment/:id] Error:', error)
    return NextResponse.json(
      { error: 'აღჭურვილობის განახლება ვერ მოხერხდა', details: error.message },
      { status: 500 }
    )
  }
})

// PATCH - Update equipment
export const PATCH = withTenant(async (
  req: NextRequest,
  ctx: RouteContext
) => {
  try {
    // Extract id from URL: /api/equipment/[id]
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    const idIndex = pathParts.indexOf('equipment') + 1
    const equipmentId = pathParts[idIndex]
    
    if (!equipmentId || equipmentId === 'equipment') {
      return NextResponse.json(
        { error: 'Equipment ID is required' },
        { status: 400 }
      )
    }
    
    // Verify equipment belongs to tenant
    const existing = await prisma.equipment.findFirst({
      where: {
        id: equipmentId,
        tenantId: ctx.tenantId,
      },
    })
    
    if (!existing) {
      return NextResponse.json(
        { error: 'აღჭურვილობა ვერ მოიძებნა' },
        { status: 404 }
      )
    }
    
    const body = await req.json()
    
    // Convert capabilities to uppercase if provided
    const capabilities = body.capabilities 
      ? body.capabilities.map((cap: string) => cap.toUpperCase())
      : undefined
    
    const equipment = await prisma.equipment.update({
      where: { id: equipmentId },
      data: {
        name: body.name,
        type: body.type?.toUpperCase(),
        status: body.status?.toUpperCase(),
        capacity: body.capacity ? parseInt(String(body.capacity)) : null,
        model: body.model || null,
        manufacturer: body.manufacturer || null,
        serialNumber: body.serialNumber || null,
        location: body.location || null,
        workingPressure: body.workingPressure ? parseFloat(String(body.workingPressure)) : null,
        capabilities: capabilities,
        cipIntervalDays: body.cipIntervalDays,
        inspectionIntervalDays: body.inspectionIntervalDays,
        notes: body.notes || null,
        updatedAt: new Date(),
      }
    })
    
    return NextResponse.json({ equipment })
  } catch (error: any) {
    console.error('[PATCH /api/equipment/:id] Error:', error)
    return NextResponse.json(
      { error: 'აღჭურვილობის განახლება ვერ მოხერხდა', details: error.message },
      { status: 500 }
    )
  }
})

// DELETE - Remove equipment
export const DELETE = withTenant(async (
  req: NextRequest,
  ctx: RouteContext
) => {
  try {
    // Extract id from URL: /api/equipment/[id]
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    const idIndex = pathParts.indexOf('equipment') + 1
    const equipmentId = pathParts[idIndex]
    
    if (!equipmentId || equipmentId === 'equipment') {
      return NextResponse.json(
        { error: 'Equipment ID is required' },
        { status: 400 }
      )
    }
    
    // Verify equipment belongs to tenant
    const existing = await prisma.equipment.findFirst({
      where: {
        id: equipmentId,
        tenantId: ctx.tenantId,
      },
    })
    
    if (!existing) {
      return NextResponse.json(
        { error: 'აღჭურვილობა ვერ მოიძებნა' },
        { status: 404 }
      )
    }

    // Delete related records first (if onDelete: Cascade is not set)
    // Note: MaintenanceLog, CIPLog, ProblemReport don't have tenantId field
    // Equipment is already filtered by tenantId, so we're safe to use equipmentId only
    await Promise.all([
      prisma.cIPLog.deleteMany({ where: { equipmentId } }).catch(() => {}),
      prisma.maintenanceLog.deleteMany({ where: { equipmentId } }).catch(() => {}),
      prisma.problemReport.deleteMany({ where: { equipmentId } }).catch(() => {}),
      prisma.tankAssignment.deleteMany({ where: { tankId: equipmentId, tenantId: ctx.tenantId } }).catch(() => {}),
    ])

    // Delete equipment
    await prisma.equipment.delete({ where: { id: equipmentId } })

    console.log('[DELETE /api/equipment/:id] Deleted:', existing.name)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[DELETE /api/equipment/:id] Error:', error)
    return NextResponse.json(
      { error: 'აღჭურვილობის წაშლა ვერ მოხერხდა', details: error.message },
      { status: 500 }
    )
  }
})