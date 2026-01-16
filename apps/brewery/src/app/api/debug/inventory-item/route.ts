import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@saas-platform/database'

// DEBUG ONLY - Remove in production!
// GET /api/debug/inventory-item?sku=ING-xxxxx OR ?id=clxxxxx
// Shows item by SKU or ID without tenant filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sku = searchParams.get('sku')
    const id = searchParams.get('id')
    
    if (!sku && !id) {
      return NextResponse.json({ 
        error: 'Please provide either ?sku=ING-xxxxx or ?id=clxxxxx' 
      }, { status: 400 })
    }
    
    const identifier = id || sku
    
    // Search by EITHER id OR sku (no tenant filter)
    const item = await prisma.inventoryItem.findFirst({
      where: {
        OR: [
          { id: identifier || "" },
          { sku: identifier || "" },
        ],
      },
      include: {
        ledger: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
    })
    
    if (!item) {
      return NextResponse.json({
        found: false,
        searched: identifier,
        message: 'Item not found in database',
      }, { status: 404 })
    }
    
    // Also check if there are items with similar SKU
    const similarItems = await prisma.inventoryItem.findMany({
      where: {
        sku: {
          contains: sku || id || '',
        },
      },
      select: {
        id: true,
        sku: true,
        name: true,
        tenantId: true,
      },
      take: 10,
    })
    
    return NextResponse.json({
      found: true,
      searched: identifier,
      item: {
        id: item.id,
        sku: item.sku,
        name: item.name,
        tenantId: item.tenantId,
        category: item.category,
        unit: item.unit,
        supplier: item.supplier,
        createdAt: item.createdAt,
        ledgerCount: item.ledger.length,
      },
      similarItems: similarItems.filter(i => i.id !== item.id),
    }, { status: 200 })
  } catch (error) {
    console.error('[DEBUG] Error fetching inventory item:', error)
    return NextResponse.json({ 
      error: String(error),
      message: 'Failed to fetch inventory item',
    }, { status: 500 })
  }
}





