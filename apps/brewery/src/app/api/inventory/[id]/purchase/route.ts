import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@saas-platform/database'
import { z } from 'zod'
import { withPermission, parseBody, RouteContext } from '@/lib/api-middleware'

const purchaseSchema = z.object({
  quantity: z.number().positive('რაოდენობა უნდა იყოს დადებითი'),
  costPerUnit: z.number().optional(),
  supplier: z.string().optional(),
  lotNumber: z.string().optional(),
  notes: z.string().optional(),
})

// POST /api/inventory/:id/purchase - Record purchase (requires inventory:update)
export const POST = withPermission('inventory:update', async (
  req: NextRequest,
  ctx: RouteContext
) => {
  try {
    const id = req.url.split('/').slice(-2)[0] // Get id from /inventory/[id]/purchase
    const input = await parseBody(req, purchaseSchema)
    
    // Verify item exists and belongs to tenant
    const item = await prisma.inventoryItem.findUnique({
      where: { id, tenantId: ctx.tenantId }
    })
    
    if (!item) {
      return NextResponse.json({ error: 'მარაგი ვერ მოიძებნა' }, { status: 404 })
    }
    
    // Create ledger entry (trigger will update cachedBalance)
    const entry = await prisma.inventoryLedger.create({
      data: {
        tenantId: ctx.tenantId,
        itemId: id,
        quantity: input.quantity, // Positive for purchase
        type: 'PURCHASE',
        notes: input.notes,
        createdBy: ctx.userId,
      }
    })
    
    // Update cost if provided
    if (input.costPerUnit !== undefined) {
      await prisma.inventoryItem.update({
        where: { id },
        data: { 
          costPerUnit: input.costPerUnit,
          ...(input.supplier && { supplier: input.supplier }),
        }
      })
    }
    
    // HACCP INCOMING_CONTROL ავტომატური სინქრონი
    try {
      await prisma.haccpJournal.create({
        data: {
          tenantId: ctx.tenantId,
          type: 'INCOMING_CONTROL',
          data: {
            source: 'auto',
            product: item.name,
            quantity: String(input.quantity),
            unit: item.unit,
            supplier: input.supplier || item.supplier || null,
            lotNumber: input.lotNumber || null,
            temperature: null,
            notes: input.notes || null,
            autoTag: `მარაგებიდან | ${item.name} × ${input.quantity} ${item.unit}`,
          },
          recordedBy: ctx.userId,
          recordedAt: new Date(),
        },
      })
    } catch (syncErr) {
      console.error('[Purchase/id] HACCP sync error:', syncErr)
    }

    // Fetch updated item
    const updatedItem = await prisma.inventoryItem.findUnique({
      where: { id }
    })
    
    return NextResponse.json({
      entry,
      newBalance: Number(updatedItem?.cachedBalance)
    }, { status: 201 })
  } catch (error) {
    console.error('Purchase error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'შესყიდვის ჩაწერა ვერ მოხერხდა' }, { status: 500 })
  }
})









