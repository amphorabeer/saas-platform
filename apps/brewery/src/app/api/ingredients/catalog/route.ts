import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@saas-platform/database'
import { withPermission, RouteContext } from '@/lib/api-middleware'

// GET /api/ingredients/catalog - Get IngredientCatalog items
export const GET = withPermission('inventory:read', async (req: NextRequest, ctx: RouteContext) => {
  try {
    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')?.toUpperCase()
    const supplier = searchParams.get('supplier')
    const search = searchParams.get('search')?.trim()

    // Build where clause
    const where: any = {
      isActive: true,
    }

    if (category) {
      // Map frontend category to IngredientCategory enum
      const categoryMap: Record<string, string> = {
        'RAW_MATERIAL': 'MALT', // Default for RAW_MATERIAL, but we'll include all ingredient types
      }
      const mappedCategory = categoryMap[category] || category
      where.type = mappedCategory
    }

    if (supplier) {
      where.supplier = { contains: supplier, mode: 'insensitive' }
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { id: { contains: search, mode: 'insensitive' } },
      ]
    }

    const catalogItems = await prisma.ingredientCatalog.findMany({
      where,
      orderBy: [
        { supplier: 'asc' },
        { name: 'asc' },
      ],
      take: 500, // Limit to prevent huge responses
    })

    // Convert to InventoryItem-like format with extended metadata
    const items = catalogItems.map((item: any) => {
      // Try to get additional data from malt/hop libraries if catalogId matches
      // For now, we'll return basic structure and can enhance later
      return {
        id: item.id,
        sku: item.id,
        name: item.name,
        category: mapCategoryToInventoryCategory(item.type),
        unit: item.unit,
        balance: 0, // Catalog items don't have stock
        onHand: 0,
        reorderPoint: null,
        supplier: item.supplier,
        costPerUnit: null, // Catalog items don't have cost
        totalValue: null,
        isLowStock: false,
        isCritical: false,
        isOutOfStock: false,
        updatedAt: item.updatedAt.toISOString(),
        // Extended metadata for form pre-filling
        catalogId: item.id,
        catalogCategory: item.type, // MALT, HOPS, etc.
      }
    })

    return NextResponse.json({ items })
  } catch (error) {
    console.error('Catalog GET error:', error)
    return NextResponse.json({ items: [] })
  }
})

// Map IngredientCategory to InventoryCategory
function mapCategoryToInventoryCategory(category: string): string {
  const categoryMap: Record<string, string> = {
    'MALT': 'RAW_MATERIAL',
    'HOPS': 'RAW_MATERIAL',
    'YEAST': 'RAW_MATERIAL',
    'ADJUNCT': 'RAW_MATERIAL',
    'WATER_CHEMISTRY': 'RAW_MATERIAL',
  }
  return categoryMap[category] || 'RAW_MATERIAL'
}





