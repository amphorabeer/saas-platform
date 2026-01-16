import { NextResponse } from 'next/server'
import { prisma } from '@saas-platform/database'

// DEBUG ONLY - Remove in production!
// GET /api/debug/all-inventory - Shows all inventory items without tenant filtering
export async function GET() {
  try {
    // Get ALL inventory items (no tenant filter)
    const items = await prisma.inventoryItem.findMany({
      select: {
        id: true,
        sku: true,
        name: true,
        tenantId: true,
        category: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    
    const count = await prisma.inventoryItem.count()
    
    // Also get unique tenants
    const tenants = [...new Set(items.map(i => i.tenantId))]
    
    return NextResponse.json({
      totalCount: count,
      itemsShown: items.length,
      uniqueTenants: tenants,
      tenantCount: tenants.length,
      items: items.map(i => ({
        id: i.id,
        sku: i.sku,
        name: i.name,
        tenantId: i.tenantId,
        category: i.category,
        createdAt: i.createdAt,
      })),
    }, { status: 200 })
  } catch (error) {
    console.error('[DEBUG] Error fetching all inventory:', error)
    return NextResponse.json({ 
      error: String(error),
      message: 'Failed to fetch inventory items',
    }, { status: 500 })
  }
}

