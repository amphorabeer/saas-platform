import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@saas-platform/database'
import { withPermission, RouteContext } from '@/lib/api-middleware'

// GET /api/inventory/manufacturers - Get distinct manufacturers/suppliers from IngredientCatalog + InventoryItem
// Optional: ?category=MALT|HOPS|YEAST|ADJUNCT to filter by ingredient category
export const GET = withPermission('inventory:read', async (req: NextRequest, ctx: RouteContext) => {
  try {
    const { searchParams } = new URL(req.url)
    const query = searchParams.get('q')?.trim()
    const category = searchParams.get('category')?.toUpperCase() // MALT, HOPS, YEAST, ADJUNCT
    const tenantId = ctx.tenantId

    const supplierSet = new Set<string>()

    // Try to get from IngredientCatalog first (master catalog)
    try {
      const catalogWhere: any = {
        isActive: true,
      }

      if (query) {
        catalogWhere.supplier = { contains: query, mode: 'insensitive' }
      }

      if (category) {
        // Map category to IngredientCategory enum
        const categoryMap: Record<string, string> = {
          'MALT': 'MALT',
          'HOPS': 'HOPS',
          'YEAST': 'YEAST',
          'ADJUNCT': 'ADJUNCT',
          'WATER_CHEMISTRY': 'WATER_CHEMISTRY',
        }
        const mappedCategory = categoryMap[category]
        if (mappedCategory) {
          catalogWhere.type = mappedCategory
        }
      }

      const catalogItems = await prisma.ingredientCatalog.findMany({
        where: catalogWhere,
        select: { supplier: true },
        distinct: ['supplier'],
        orderBy: { supplier: 'asc' },
      })

      type CatalogItem = { supplier: string | null }
      const catalogSuppliers = (catalogItems as CatalogItem[])
        .map((item: CatalogItem) => item.supplier)
        .filter((supplier: string | null): supplier is string => Boolean(supplier?.trim()))
        .map((supplier: string) => supplier.trim())

      catalogSuppliers.forEach((s: string) => supplierSet.add(s))
      console.log(`[Manufacturers API] Found ${catalogSuppliers.length} suppliers in IngredientCatalog`)
    } catch (catalogError: unknown) {
      // IngredientCatalog might not exist yet or Prisma client not generated
      const errorMessage = catalogError instanceof Error ? catalogError.message : String(catalogError)
      console.warn('[Manufacturers API] IngredientCatalog query failed, using fallback:', errorMessage)
    }

    // Fallback: Also get from InventoryItem (tenant-specific inventory)
    try {
      const inventoryWhere: any = {
        tenantId,
        isActive: true,
        supplier: { not: null },
      }

      if (query) {
        inventoryWhere.supplier = {
          contains: query,
          mode: 'insensitive',
        }
      }

      // Note: InventoryItem uses InventoryCategory (RAW_MATERIAL, PACKAGING, etc.)
      // We can't filter by ingredient type here, but we can filter by category if needed
      // For now, we'll get all suppliers from inventory items

      const inventoryItems = await prisma.inventoryItem.findMany({
        where: inventoryWhere,
        select: { supplier: true },
        distinct: ['supplier'],
        orderBy: { supplier: 'asc' },
      })

      type InventoryItemRow = { supplier: string | null }
      const inventorySuppliers = (inventoryItems as InventoryItemRow[])
        .map((item: InventoryItemRow) => item.supplier)
        .filter((supplier: string | null): supplier is string => Boolean(supplier?.trim()))
        .map((supplier: string) => supplier.trim())

      inventorySuppliers.forEach((s: string) => supplierSet.add(s))
      console.log(`[Manufacturers API] Found ${inventorySuppliers.length} suppliers in InventoryItem`)
    } catch (inventoryError: unknown) {
      const errorMessage = inventoryError instanceof Error ? inventoryError.message : String(inventoryError)
      console.error('[Manufacturers API] InventoryItem query failed:', errorMessage)
    }

    // Convert to sorted array
    const suppliers = Array.from(supplierSet).sort()

    console.log(`[Manufacturers API] Returning ${suppliers.length} total unique manufacturers`)
    
    return NextResponse.json({ items: suppliers })
  } catch (error) {
    console.error('Manufacturers GET error:', error)
    // Return empty array on error instead of error response to match expected type
    return NextResponse.json({ items: [] })
  }
})









