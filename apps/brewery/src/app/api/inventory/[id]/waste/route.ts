import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@saas-platform/database'
import { z } from 'zod'
import { withPermission, parseBody, RouteContext } from '@/lib/api-middleware'

const wasteSchema = z.object({
  quantity: z.number().positive('რაოდენობა უნდა იყოს დადებითი'),
  reason: z.string().min(1, 'მიზეზი სავალდებულოა'),
})

// POST /api/inventory/:id/waste - Record waste/spoilage (requires inventory:adjust)
export const POST = withPermission('inventory:adjust', async (
  req: NextRequest,
  ctx: RouteContext
) => {
  try {
    const id = req.url.split('/').slice(-2)[0] // Get id from /inventory/[id]/waste
    const input = await parseBody(req, wasteSchema)
    
    // Get current balance
    const item = await prisma.inventoryItem.findUnique({
      where: { id, tenantId: ctx.tenantId }
    })
    
    if (!item) {
      return NextResponse.json({ error: 'მარაგი ვერ მოიძებნა' }, { status: 404 })
    }
    
    const currentBalance = Number(item.cachedBalance)
    
    if (currentBalance < input.quantity) {
      return NextResponse.json({ 
        error: 'არასაკმარისი მარაგი დანაკარგის ჩასაწერად',
        available: currentBalance,
        requested: input.quantity
      }, { status: 400 })
    }
    
    // Create waste entry
    const entry = await prisma.inventoryLedger.create({
      data: {
        tenantId: ctx.tenantId,
        itemId: id,
        quantity: -input.quantity, // Negative for waste
        type: 'WASTE',
        notes: input.reason,
        createdBy: ctx.userId,
      }
    })
    
    // Fetch updated item
    const updatedItem = await prisma.inventoryItem.findUnique({
      where: { id }
    })
    
    return NextResponse.json({
      entry,
      previousBalance: currentBalance,
      newBalance: Number(updatedItem?.cachedBalance),
    }, { status: 201 })
  } catch (error) {
    console.error('Waste error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'დანაკარგის ჩაწერა ვერ მოხერხდა' }, { status: 500 })
  }
})









