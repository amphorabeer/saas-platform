import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@saas-platform/database'
import { withPermission, RouteContext } from '@/lib/api-middleware'

// GET /api/inventory/[id]/specs - Get specs for an item
export const GET = withPermission('inventory:read', async (
  req: NextRequest,
  ctx: RouteContext
) => {
  const url = new URL(req.url)
  const pathParts = url.pathname.split('/').filter(Boolean)
  const identifier = pathParts[pathParts.length - 2] // Get id from /api/inventory/[id]/specs
  
  try {
    // Find item by id or sku
    const item = await prisma.inventoryItem.findFirst({
      where: {
        tenantId: ctx.tenantId,
        OR: [
          { id: identifier },
          { sku: identifier },
        ],
      },
      select: {
        id: true,
        specs: true,
      },
    })
    
    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }
    
    return NextResponse.json({ 
      specs: item.specs || null 
    })
  } catch (error: any) {
    console.error('[GET /api/inventory/[id]/specs] Error:', error)
    return NextResponse.json(
      { error: 'Failed to get specs', details: error.message || String(error) },
      { status: 500 }
    )
  }
})

// PUT /api/inventory/[id]/specs - Update specs for an item
export const PUT = withPermission('inventory:update', async (
  req: NextRequest,
  ctx: RouteContext
) => {
  const url = new URL(req.url)
  const pathParts = url.pathname.split('/').filter(Boolean)
  const identifier = pathParts[pathParts.length - 2] // Get id from /api/inventory/[id]/specs
  const body = await req.json()
  
  try {
    // Find item by id or sku
    const item = await prisma.inventoryItem.findFirst({
      where: {
        tenantId: ctx.tenantId,
        OR: [
          { id: identifier },
          { sku: identifier },
        ],
      },
    })
    
    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }
    
    // Update specs - only include non-null/non-undefined values
    const specsToSave: Record<string, any> = {}
    if (body.specs && typeof body.specs === 'object') {
      Object.keys(body.specs).forEach(key => {
        if (body.specs[key] !== null && body.specs[key] !== undefined && body.specs[key] !== '') {
          specsToSave[key] = body.specs[key]
        }
      })
    }
    
    // Update item with specs
    const updated = await prisma.inventoryItem.update({
      where: { id: item.id },
      data: {
        specs: Object.keys(specsToSave).length > 0 ? specsToSave : undefined,
      },
    })
    
    return NextResponse.json({ 
      success: true, 
      specs: updated.specs 
    })
  } catch (error: any) {
    console.error('[PUT /api/inventory/[id]/specs] Error:', error)
    return NextResponse.json(
      { error: 'Failed to update specs', details: error.message || String(error) },
      { status: 500 }
    )
  }
})





