import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@saas-platform/database'
import { withTenant, RouteContext } from '@/lib/api-middleware'
import { randomUUID } from 'crypto'

interface UsedSupply {
  supplyId: string
  name: string
  amount: number
  unit: string
}

// POST - Record a new CIP log and deduct cleaning supplies
export const POST = withTenant(async (
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
    
    const equipment = await prisma.equipment.findFirst({
      where: {
        id: equipmentId,
        tenantId: ctx.tenantId,
      },
    })
    
    if (!equipment) {
      return NextResponse.json(
        { error: 'Equipment not found' },
        { status: 404 }
      )
    }
    
    const body = await req.json()
    
    if (!body.performedBy) {
      return NextResponse.json(
        { error: 'performedBy is required' },
        { status: 400 }
      )
    }
    
    const now = new Date()
    const cipDate = new Date(now.getTime())
    
    const cipIntervalDays = equipment.cipIntervalDays || 14
    const nextCIPDate = new Date(now.getTime())
    nextCIPDate.setDate(nextCIPDate.getDate() + cipIntervalDays)
    
    console.log('[CIP] Creating CIP log:', {
      equipmentId,
      cipDate: cipDate.toISOString(),
      usedSupplies: body.usedSupplies,
    })
    
    // Create CIP log entry
    const cipLog = await prisma.cIPLog.create({
      data: {
        id: randomUUID(), // ✅ Generate UUID for CIP log
        equipmentId: equipmentId,
        cipType: body.cipType || 'FULL',
        date: cipDate,
        duration: parseInt(String(body.duration)) || 60,
        temperature: body.temperature ? parseFloat(String(body.temperature)) : null,
        causticConcentration: body.causticConcentration ? parseFloat(String(body.causticConcentration)) : null,
        performedBy: String(body.performedBy),
        result: body.result || 'PASS',
        notes: body.notes ? String(body.notes) : null,
      },
    })
    
    // Update equipment status (set to AVAILABLE after CIP)
    const updatedEquipment = await prisma.equipment.update({
      where: { id: equipmentId },
      data: {
        lastCIP: cipDate,
        nextCIP: nextCIPDate,
        status: 'OPERATIONAL',  // CIP დასრულების შემდეგ ავზი ხელმისაწვდომია
      },
    })
    
    // ========== DEDUCT CLEANING SUPPLIES ==========
    const usedSupplies: UsedSupply[] = body.usedSupplies || []
    const supplyUpdates: any[] = []
    const errors: string[] = []
    
    if (usedSupplies.length > 0) {
      console.log('[CIP] Processing cleaning supplies deduction:', usedSupplies)
      
      for (const supply of usedSupplies) {
        try {
          let inventoryItem = null
          
          // Strategy 1: Find by ID
          if (supply.supplyId && supply.supplyId.length > 10) {
            inventoryItem = await prisma.inventoryItem.findFirst({
              where: {
                id: supply.supplyId,
                tenantId: ctx.tenantId,
              },
            })
          }
          
          // Strategy 2: Find by exact name
          if (!inventoryItem) {
            inventoryItem = await prisma.inventoryItem.findFirst({
              where: {
                tenantId: ctx.tenantId,
                name: supply.name,
              },
            })
          }
          
          // Strategy 3: Find by partial name
          if (!inventoryItem) {
            inventoryItem = await prisma.inventoryItem.findFirst({
              where: {
                tenantId: ctx.tenantId,
                name: {
                  contains: supply.name.split(' ')[0],
                  mode: 'insensitive',
                },
                category: 'CONSUMABLE',
              },
            })
          }
          
          if (inventoryItem) {
            const currentStock = Number(inventoryItem.cachedBalance) || 0
            
            if (currentStock < supply.amount) {
              errors.push(`${supply.name}: მარაგი არ არის საკმარისი (${currentStock} < ${supply.amount})`)
              continue
            }
            
            // Create ledger entry for deduction
            await prisma.inventoryLedger.create({
              data: {
                itemId: inventoryItem.id,
                tenantId: ctx.tenantId,
                type: 'ADJUSTMENT',
                quantity: -supply.amount,
                notes: `CIP - ${equipment.name} - CIP ჩანაწერი: ${cipLog.id}`,
                createdBy: body.performedBy,
              },
            })
            
            // Update cachedBalance
            const updatedItem = await prisma.inventoryItem.update({
              where: { id: inventoryItem.id },
              data: {
                cachedBalance: {
                  decrement: supply.amount,
                },
                balanceUpdatedAt: new Date(),
              },
            })
            
            supplyUpdates.push({
              supplyId: supply.supplyId,
              inventoryItemId: inventoryItem.id,
              name: supply.name,
              deducted: supply.amount,
              unit: supply.unit,
              newBalance: Number(updatedItem.cachedBalance),
            })
            
            console.log(`[CIP] ✅ Deducted ${supply.amount} ${supply.unit} of ${supply.name}. New balance: ${updatedItem.cachedBalance}`)
          } else {
            errors.push(`${supply.name}: ვერ მოიძებნა მარაგებში`)
            console.log(`[CIP] ⚠️ Item not found: ${supply.name}`)
          }
        } catch (supplyError) {
          console.error(`[CIP] Error deducting ${supply.name}:`, supplyError)
          errors.push(`${supply.name}: შეცდომა`)
        }
      }
    }
    
    console.log(`[CIP] Done. Updates: ${supplyUpdates.length}, Errors: ${errors.length}`)
    
    return NextResponse.json({
      cipLog,
      equipment: updatedEquipment,
      supplyUpdates,
      errors: errors.length > 0 ? errors : undefined,
      message: supplyUpdates.length > 0 
        ? `CIP ჩაიწერა, ${supplyUpdates.length} საშუალება შემცირდა` 
        : 'CIP ჩაიწერა',
    })
  } catch (error) {
    console.error('[POST /api/equipment/:id/cip] Error:', error)
    return NextResponse.json(
      { error: 'Failed to record CIP' },
      { status: 500 }
    )
  }
})

// GET - Get CIP logs for equipment
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
    
    const equipment = await prisma.equipment.findFirst({
      where: {
        id: equipmentId,
        tenantId: ctx.tenantId,
      },
    })
    
    if (!equipment) {
      return NextResponse.json(
        { error: 'Equipment not found' },
        { status: 404 }
      )
    }
    
    const cipLogs = await prisma.cIPLog.findMany({
      where: { equipmentId },
      orderBy: { date: 'desc' },
      take: 20,
    })
    
    return NextResponse.json(cipLogs)
  } catch (error) {
    console.error('[GET /api/equipment/:id/cip] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch CIP logs' },
      { status: 500 }
    )
  }
})