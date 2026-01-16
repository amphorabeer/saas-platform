import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@saas-platform/database'
import { z } from 'zod'
import { withPermission, parseBody, RouteContext } from '@/lib/api-middleware'

const adjustSchema = z.object({
  newQuantity: z.number().min(0, 'რაოდენობა არ შეიძლება იყოს უარყოფითი'),
  reason: z.string().min(1, 'მიზეზი სავალდებულოა'),
})

// POST /api/inventory/:id/adjust - Manual adjustment (requires inventory:adjust)
export const POST = withPermission('inventory:adjust', async (
  req: NextRequest,
  ctx: RouteContext
) => {
  try {
    const id = req.url.split('/').slice(-2)[0] // Get id from /inventory/[id]/adjust
    const input = await parseBody(req, adjustSchema)
    
    // Get current balance
    const item = await prisma.inventoryItem.findUnique({
      where: { id, tenantId: ctx.tenantId }
    })
    
    if (!item) {
      return NextResponse.json({ error: 'მარაგი ვერ მოიძებნა' }, { status: 404 })
    }
    
    const currentBalance = Number(item.cachedBalance)
    const difference = input.newQuantity - currentBalance
    
    if (difference === 0) {
      return NextResponse.json({ 
        message: 'ბალანსი უკვე სწორია',
        newBalance: currentBalance 
      })
    }
    
    // Create adjustment entry
    const entry = await prisma.inventoryLedger.create({
      data: {
        tenantId: ctx.tenantId,
        itemId: id,
        quantity: difference, // Can be positive or negative
        type: difference > 0 ? 'ADJUSTMENT_ADD' : 'ADJUSTMENT_REMOVE',
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
      adjustment: difference,
    }, { status: 201 })
  } catch (error) {
    console.error('Adjustment error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'კორექტირება ვერ მოხერხდა' }, { status: 500 })
  }
})









