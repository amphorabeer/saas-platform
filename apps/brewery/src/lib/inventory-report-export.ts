import { prisma } from '@saas-platform/database'

export type InventoryRow = {
  sku: string
  name: string
  category: string
  unit: string
  cachedBalance: number
  reorderPoint: number | null
  costPerUnit: number | null
  lineValue: number
  isActive: boolean
}

export async function loadInventoryForReport(tenantId: string): Promise<InventoryRow[]> {
  const items = await prisma.inventoryItem.findMany({
    where: { tenantId },
    take: 3000,
    orderBy: { name: 'asc' },
  })
  return items.map((i) => {
    const bal = Number(i.cachedBalance) || 0
    const cost = i.costPerUnit != null ? Number(i.costPerUnit) : 0
    return {
      sku: i.sku,
      name: i.name,
      category: i.category,
      unit: i.unit,
      cachedBalance: bal,
      reorderPoint: i.reorderPoint != null ? Number(i.reorderPoint) : null,
      costPerUnit: i.costPerUnit != null ? Number(i.costPerUnit) : null,
      lineValue: bal * cost,
      isActive: i.isActive,
    }
  })
}
