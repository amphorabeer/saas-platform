import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@saas-platform/database'
import { withTenant, RouteContext } from '@/lib/api-middleware'
import { Decimal } from '@prisma/client/runtime/library'
import { randomUUID } from 'crypto'

// Test type configuration
const TEST_TYPE_CONFIG: Record<string, { name: string; unit: string }> = {
  GRAVITY: { name: 'სიმკვრივე (SG)', unit: 'SG' },
  TEMPERATURE: { name: 'ტემპერატურა', unit: '°C' },
  PH: { name: 'pH დონე', unit: 'pH' },
  DISSOLVED_O2: { name: 'გახსნილი O₂', unit: 'ppb' },
  TURBIDITY: { name: 'სიმღვრივე', unit: 'NTU' },
  COLOR: { name: 'ფერი (SRM)', unit: 'SRM' },
  BITTERNESS: { name: 'სიმწარე (IBU)', unit: 'IBU' },
  ALCOHOL: { name: 'ალკოჰოლი (ABV)', unit: '%' },
  CARBONATION: { name: 'კარბონიზაცია', unit: 'vol CO₂' },
  APPEARANCE: { name: 'გარეგნობა', unit: '' },
  AROMA: { name: 'არომატი', unit: '' },
  TASTE: { name: 'გემო', unit: '' },
  MICROBIOLOGICAL: { name: 'მიკრობიოლოგიური', unit: '' },
}

// Auto-calculate status based on result and min/max values
function calculateStatus(
  result: number | null,
  minValue: number | null,
  maxValue: number | null
): 'PASSED' | 'WARNING' | 'FAILED' {
  if (!result || minValue === null || maxValue === null) {
    return 'PASSED' // Default if no range defined
  }

  const range = maxValue - minValue
  const tolerance = range * 0.1 // 10% tolerance

  if (result >= minValue && result <= maxValue) {
    return 'PASSED'
  }

  const deviation = result < minValue ? minValue - result : result - maxValue
  if (deviation <= tolerance) {
    return 'WARNING'
  }

  return 'FAILED'
}

// GET /api/quality - List all QC tests with stats
export const GET = withTenant(async (req: NextRequest, ctx: RouteContext) => {
  try {
    console.log('[QUALITY API] GET request, tenantId:', ctx.tenantId)
    
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const batchId = searchParams.get('batchId')
    const lotId = searchParams.get('lotId')

    const where: any = {
      tenantId: ctx.tenantId,
    }

    if (status) {
      where.status = status.toUpperCase()
    }
    if (batchId) {
      where.batchId = batchId
    }
    if (lotId) {
      where.lotId = lotId
    }

    console.log('[QUALITY API] Query where:', JSON.stringify(where, null, 2))
    console.log('[QUALITY API] Attempting to query prisma.qCTest...')
    console.log('[QUALITY API] Prisma client has qCTest?', typeof prisma.qCTest !== 'undefined')
    console.log('[QUALITY API] Available Prisma models:', Object.keys(prisma).filter(k => !k.startsWith('_') && !k.startsWith('$')).join(', '))

    const tests = await prisma.qCTest.findMany({
      where,
      include: {
        batch: {
          select: {
            id: true,
            batchNumber: true,
            recipe: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        lot: {
          select: {
            id: true,
            lotCode: true,
          },
        },
      },
      orderBy: [
        { scheduledDate: 'desc' },
        { createdAt: 'desc' },
      ],
    })

    // Calculate stats
    const total = tests.length
    const passed = tests.filter(t => t.status === 'PASSED').length
    const warning = tests.filter(t => t.status === 'WARNING').length
    const failed = tests.filter(t => t.status === 'FAILED').length
    const pending = tests.filter(t => 
      t.status === 'SCHEDULED' || t.status === 'IN_PROGRESS'
    ).length

    // Transform tests with readable names
    const transformedTests = tests.map(test => ({
      id: test.id,
      batchId: test.batchId,
      lotId: test.lotId,
      batchNumber: test.batch.batchNumber,
      recipeName: test.batch.recipe?.name || '',
      lotCode: test.lot?.lotCode || null,
      testType: test.testType,
      testName: TEST_TYPE_CONFIG[test.testType]?.name || test.testType,
      status: test.status,
      priority: test.priority,
      scheduledDate: test.scheduledDate.toISOString(),
      completedDate: test.completedDate?.toISOString() || null,
      minValue: test.minValue ? Number(test.minValue) : null,
      maxValue: test.maxValue ? Number(test.maxValue) : null,
      targetValue: test.targetValue ? Number(test.targetValue) : null,
      result: test.result ? Number(test.result) : null,
      unit: test.unit || TEST_TYPE_CONFIG[test.testType]?.unit || '',
      notes: test.notes,
      performedBy: test.performedBy,
      createdBy: test.createdBy,
      createdAt: test.createdAt.toISOString(),
      updatedAt: test.updatedAt.toISOString(),
    }))

    return NextResponse.json({
      tests: transformedTests,
      stats: {
        total,
        passed,
        warning,
        failed,
        pending,
      },
    })
  } catch (error: any) {
    console.error('[QUALITY API] GET error:', error)
    console.error('[QUALITY API] Error name:', error?.name)
    console.error('[QUALITY API] Error message:', error?.message)
    console.error('[QUALITY API] Error stack:', error instanceof Error ? error.stack : 'No stack')
    console.error('[QUALITY API] Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2))
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch QC tests', 
        details: error instanceof Error ? error.message : String(error),
        errorName: error?.name,
      },
      { status: 500 }
    )
  }
})

// POST /api/quality - Create new QC test
export const POST = withTenant(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const body = await req.json()
    const {
      batchId,
      lotId,
      testType,
      priority = 'MEDIUM',
      scheduledDate,
      minValue,
      maxValue,
      targetValue,
      unit,
      notes,
    } = body

    // Validate required fields
    if (!batchId || !testType || !scheduledDate) {
      return NextResponse.json(
        { error: 'Missing required fields: batchId, testType, scheduledDate' },
        { status: 400 }
      )
    }

    // Validate test type
    if (!TEST_TYPE_CONFIG[testType]) {
      return NextResponse.json(
        { error: `Invalid test type: ${testType}` },
        { status: 400 }
      )
    }

    // Verify batch exists and belongs to tenant
    const batch = await prisma.batch.findFirst({
      where: {
        id: batchId,
        tenantId: ctx.tenantId,
      },
    })

    if (!batch) {
      return NextResponse.json(
        { error: 'Batch not found' },
        { status: 404 }
      )
    }

    // Verify lot if provided
    if (lotId) {
      const lot = await prisma.lot.findFirst({
        where: {
          id: lotId,
          tenantId: ctx.tenantId,
        },
      })

      if (!lot) {
        return NextResponse.json(
          { error: 'Lot not found' },
          { status: 404 }
        )
      }
    }

    // Create test
    console.log('[QUALITY API] Creating test with data:', JSON.stringify({
      tenantId: ctx.tenantId,
      batchId,
      lotId: lotId || null,
      testType: testType.toUpperCase(),
      status: 'SCHEDULED',
      priority: priority.toUpperCase(),
      scheduledDate: new Date(scheduledDate),
      minValue: minValue != null ? new Decimal(minValue) : null,
      maxValue: maxValue != null ? new Decimal(maxValue) : null,
      targetValue: targetValue != null ? new Decimal(targetValue) : null,
      unit: unit || TEST_TYPE_CONFIG[testType]?.unit || null,
      notes: notes || null,
      createdBy: ctx.userId,
    }, null, 2))
    
    const test = await prisma.qCTest.create({
      data: {
        id: randomUUID(),
        tenantId: ctx.tenantId,
        batchId,
        lotId: lotId || null,
        testType: testType.toUpperCase(),
        status: 'SCHEDULED',
        priority: priority.toUpperCase(),
        scheduledDate: new Date(scheduledDate),
        minValue: minValue != null ? new Decimal(minValue) : null,
        maxValue: maxValue != null ? new Decimal(maxValue) : null,
        targetValue: targetValue != null ? new Decimal(targetValue) : null,
        unit: unit || TEST_TYPE_CONFIG[testType]?.unit || null,
        notes: notes || null,
        createdBy: ctx.userId,
        updatedAt: new Date(),
      },
      include: {
        batch: {
          select: {
            id: true,
            batchNumber: true,
            recipe: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        lot: {
          select: {
            id: true,
            lotCode: true,
          },
        },
      },
    })

    return NextResponse.json({
      id: test.id,
      batchId: test.batchId,
      lotId: test.lotId,
      batchNumber: test.batch.batchNumber,
      recipeName: test.batch.recipe?.name || '',
      lotCode: test.lot?.lotCode || null,
      testType: test.testType,
      testName: TEST_TYPE_CONFIG[test.testType]?.name || test.testType,
      status: test.status,
      priority: test.priority,
      scheduledDate: test.scheduledDate.toISOString(),
      completedDate: test.completedDate?.toISOString() || null,
      minValue: test.minValue ? Number(test.minValue) : null,
      maxValue: test.maxValue ? Number(test.maxValue) : null,
      targetValue: test.targetValue ? Number(test.targetValue) : null,
      result: test.result ? Number(test.result) : null,
      unit: test.unit || TEST_TYPE_CONFIG[test.testType]?.unit || '',
      notes: test.notes,
      performedBy: test.performedBy,
      createdBy: test.createdBy,
      createdAt: test.createdAt.toISOString(),
      updatedAt: test.updatedAt.toISOString(),
    })
  } catch (error: any) {
    console.error('[QUALITY API] POST error:', error)
    console.error('[QUALITY API] Error name:', error?.name)
    console.error('[QUALITY API] Error message:', error?.message)
    console.error('[QUALITY API] Error stack:', error instanceof Error ? error.stack : 'No stack')
    console.error('[QUALITY API] Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2))
    
    return NextResponse.json(
      { 
        error: 'Failed to create QC test', 
        details: error instanceof Error ? error.message : String(error),
        errorName: error?.name,
      },
      { status: 500 }
    )
  }
})

// PATCH /api/quality - Update test result (auto-calculates status)
export const PATCH = withTenant(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const body = await req.json()
    const { id, result, performedBy, notes, status } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      )
    }

    // Find test
    const test = await prisma.qCTest.findFirst({
      where: {
        id,
        tenantId: ctx.tenantId,
      },
    })

    if (!test) {
      return NextResponse.json(
        { error: 'QC test not found' },
        { status: 404 }
      )
    }

    // Prepare update data
    const updateData: any = {}

    if (result !== undefined) {
      updateData.result = new Decimal(result)
      updateData.completedDate = new Date()

      // Auto-calculate status if min/max values exist
      if (test.minValue !== null && test.maxValue !== null) {
        const calculatedStatus = calculateStatus(
          result,
          Number(test.minValue),
          Number(test.maxValue)
        )
        updateData.status = calculatedStatus
      } else if (status) {
        // Use provided status if no range defined
        updateData.status = status.toUpperCase()
      } else {
        updateData.status = 'PASSED' // Default
      }
    }

    if (performedBy !== undefined) {
      updateData.performedBy = performedBy
    }

    if (notes !== undefined) {
      updateData.notes = notes
    }

    if (status !== undefined && result === undefined) {
      // Allow manual status update if no result provided
      updateData.status = status.toUpperCase()
    }

    // Update test
    const updatedTest = await prisma.qCTest.update({
      where: { id },
      data: updateData,
      include: {
        batch: {
          select: {
            id: true,
            batchNumber: true,
            recipe: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        lot: {
          select: {
            id: true,
            lotCode: true,
          },
        },
      },
    })

    return NextResponse.json({
      id: updatedTest.id,
      batchId: updatedTest.batchId,
      lotId: updatedTest.lotId,
      batchNumber: updatedTest.batch.batchNumber,
      recipeName: updatedTest.batch.recipe?.name || '',
      lotCode: updatedTest.lot?.lotCode || null,
      testType: updatedTest.testType,
      testName: TEST_TYPE_CONFIG[updatedTest.testType]?.name || updatedTest.testType,
      status: updatedTest.status,
      priority: updatedTest.priority,
      scheduledDate: updatedTest.scheduledDate.toISOString(),
      completedDate: updatedTest.completedDate?.toISOString() || null,
      minValue: updatedTest.minValue ? Number(updatedTest.minValue) : null,
      maxValue: updatedTest.maxValue ? Number(updatedTest.maxValue) : null,
      targetValue: updatedTest.targetValue ? Number(updatedTest.targetValue) : null,
      result: updatedTest.result ? Number(updatedTest.result) : null,
      unit: updatedTest.unit || TEST_TYPE_CONFIG[updatedTest.testType]?.unit || '',
      notes: updatedTest.notes,
      performedBy: updatedTest.performedBy,
      createdBy: updatedTest.createdBy,
      createdAt: updatedTest.createdAt.toISOString(),
      updatedAt: updatedTest.updatedAt.toISOString(),
    })
  } catch (error: any) {
    console.error('[QUALITY API] PATCH error:', error)
    console.error('[QUALITY API] Error name:', error?.name)
    console.error('[QUALITY API] Error message:', error?.message)
    console.error('[QUALITY API] Error stack:', error instanceof Error ? error.stack : 'No stack')
    console.error('[QUALITY API] Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2))
    
    return NextResponse.json(
      { 
        error: 'Failed to update QC test', 
        details: error instanceof Error ? error.message : String(error),
        errorName: error?.name,
      },
      { status: 500 }
    )
  }
})

