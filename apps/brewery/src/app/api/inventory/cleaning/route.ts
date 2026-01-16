import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@saas-platform/database'
import { withTenant, RouteContext } from '@/lib/api-middleware'

// GET - Fetch cleaning supplies from inventory
export const GET = withTenant(async (
  req: NextRequest,
  ctx: RouteContext
) => {
  try {
    console.log('[GET /api/inventory/cleaning] Fetching cleaning supplies for tenant:', ctx.tenantId)
    
    // Fetch inventory items that are cleaning supplies
    const cleaningSupplies = await prisma.inventoryItem.findMany({
      where: {
        tenantId: ctx.tenantId,
        OR: [
          { category: 'CONSUMABLE' },
          { name: { contains: 'caustic', mode: 'insensitive' } },
          { name: { contains: 'კაუსტიკ', mode: 'insensitive' } },
          { name: { contains: 'acid', mode: 'insensitive' } },
          { name: { contains: 'მჟავა', mode: 'insensitive' } },
          { name: { contains: 'sanitizer', mode: 'insensitive' } },
          { name: { contains: 'სანიტაიზ', mode: 'insensitive' } },
          { name: { contains: 'star san', mode: 'insensitive' } },
          { name: { contains: 'pbw', mode: 'insensitive' } },
          { name: { contains: 'cip', mode: 'insensitive' } },
          { name: { contains: 'detergent', mode: 'insensitive' } },
          { name: { contains: 'cleaner', mode: 'insensitive' } },
          { name: { contains: 'naoh', mode: 'insensitive' } },
          { name: { contains: 'paa', mode: 'insensitive' } },
        ],
      },
      orderBy: { name: 'asc' },
    })
    
    console.log('[GET /api/inventory/cleaning] Found items:', cleaningSupplies.length)
    
    // Transform to cleaning supply format
    const supplies = cleaningSupplies.map(item => {
      // Detect type from name
      let type = 'other'
      const lowerName = (item.name || '').toLowerCase()
      
      if (lowerName.includes('caustic') || lowerName.includes('naoh') || lowerName.includes('კაუსტიკ')) {
        type = 'caustic'
      } else if (lowerName.includes('acid') || lowerName.includes('მჟავა') || lowerName.includes('phosphoric')) {
        type = 'acid'
      } else if (lowerName.includes('sanitizer') || lowerName.includes('star san') || lowerName.includes('paa') || lowerName.includes('სანიტაიზ')) {
        type = 'sanitizer'
      } else if (lowerName.includes('pbw') || lowerName.includes('detergent') || lowerName.includes('wash')) {
        type = 'detergent'
      } else if (lowerName.includes('rinse')) {
        type = 'rinse_aid'
      }
      
      return {
        id: item.id,
        name: item.name,
        type,
        currentStock: Number(item.cachedBalance) || 0, // Use cachedBalance!
        minStock: Number(item.reorderPoint) || 0,
        unit: item.unit || 'კგ',
        supplier: item.supplier || '',
        pricePerUnit: Number(item.costPerUnit) || 0,
        location: item.location || '',
      }
    })
    
    console.log('[GET /api/inventory/cleaning] Returning supplies:', supplies.length)
    return NextResponse.json(supplies)
  } catch (error) {
    console.error('[GET /api/inventory/cleaning] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch cleaning supplies', details: String(error) },
      { status: 500 }
    )
  }
})

// POST - Create a new cleaning supply item
export const POST = withTenant(async (
  req: NextRequest,
  ctx: RouteContext
) => {
  try {
    const body = await req.json()
    console.log('[POST /api/inventory/cleaning] Creating:', body)
    
    if (!body.name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }
    
    const sku = `CLEAN-${Date.now()}`
    
    const item = await prisma.inventoryItem.create({
      data: {
        tenantId: ctx.tenantId,
        sku,
        name: body.name,
        category: 'CONSUMABLE',
        unit: body.unit || 'კგ',
        cachedBalance: body.currentStock || 0, // Use cachedBalance!
        reorderPoint: body.minStock || 0,
        costPerUnit: body.pricePerUnit || 0,
        supplier: body.supplier || null,
        location: body.location || null,
      },
    })
    
    console.log('[POST /api/inventory/cleaning] Created:', item.id)
    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    console.error('[POST /api/inventory/cleaning] Error:', error)
    return NextResponse.json(
      { error: 'Failed to create cleaning supply', details: String(error) },
      { status: 500 }
    )
  }
})



