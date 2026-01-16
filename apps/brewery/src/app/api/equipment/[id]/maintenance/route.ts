import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@saas-platform/database'
import { withTenant, RouteContext } from '@/lib/api-middleware'

// POST - Add maintenance log
export const POST = withTenant(async (
  req: NextRequest,
  ctx: RouteContext
) => {
  try {
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    const equipmentId = pathParts[pathParts.length - 2] // maintenance is last, equipmentId is before it
    
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
        { error: 'Equipment not found' },
        { status: 404 }
      )
    }
    
    const body = await req.json()
    
    const maintenanceLog = await prisma.maintenanceLog.create({
      data: {
        id: `maint-${Date.now()}`,
        equipmentId: equipmentId,
        type: body.type,
        status: body.status,
        priority: body.priority || null,
        scheduledDate: body.scheduledDate ? new Date(body.scheduledDate) : null,
        completedDate: body.completedDate ? new Date(body.completedDate) : null,
        duration: body.duration ? parseInt(String(body.duration)) : null,
        performedBy: body.performedBy || null,
        cost: body.cost ? parseFloat(String(body.cost)) : null,
        partsUsed: body.partsUsed || [],
        description: body.description || null,
        updatedAt: new Date(),
      }
    })
    
    // Update equipment status and dates if completed
    if (body.status === 'completed' && body.completedDate) {
      await prisma.equipment.update({
        where: { id: equipmentId },
        data: {
          updatedAt: new Date(),
          
        }
      })
    }
    
    // If scheduled, update equipment status to under_maintenance if high priority
    if (body.status === 'scheduled' && body.priority === 'high') {
      await prisma.equipment.update({
        where: { id: equipmentId },
        data: {
        id: `maint-${Date.now()}`,
          status: 'NEEDS_MAINTENANCE',
        }
      })
    }
    
    return NextResponse.json(maintenanceLog, { status: 201 })
  } catch (error) {
    console.error('[POST /api/equipment/:id/maintenance] Error:', error)
    return NextResponse.json(
      { error: 'Failed to create maintenance log' },
      { status: 500 }
    )
  }
})

// GET - List maintenance logs for equipment
export const GET = withTenant(async (
  req: NextRequest,
  ctx: RouteContext
) => {
  try {
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    const equipmentId = pathParts[pathParts.length - 2]
    
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
        { error: 'Equipment not found' },
        { status: 404 }
      )
    }
    
    const maintenanceLogs = await prisma.maintenanceLog.findMany({
      where: { equipmentId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    
    return NextResponse.json(maintenanceLogs)
  } catch (error) {
    console.error('[GET /api/equipment/:id/maintenance] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch maintenance logs' },
      { status: 500 }
    )
  }
})