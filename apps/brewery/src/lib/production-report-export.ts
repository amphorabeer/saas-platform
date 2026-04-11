import { prisma } from '@saas-platform/database'

export type ProductionBatchRow = {
  id: string
  batchNumber: string
  status: string
  volume: number
  packagedVolume: number
  originalGravity: number | null
  finalGravity: number | null
  abv: number | null
  brewedAt: Date | null
  createdAt: Date
  recipeName: string
  recipeStyle: string | null
  tankName: string | null
}

function periodStart(period: string): Date {
  const now = new Date()
  if (period === '30') return new Date(now.getTime() - 30 * 86400000)
  if (period === '90') return new Date(now.getTime() - 90 * 86400000)
  return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
}

/** Batches for production report (tenant-scoped), filtered by period on brew/created date. */
export async function loadProductionBatches(
  tenantId: string,
  period: string
): Promise<ProductionBatchRow[]> {
  const start = periodStart(period)
  const raw = await prisma.batch.findMany({
    where: { tenantId },
    take: 500,
    orderBy: { createdAt: 'desc' },
    include: {
      recipe: { select: { name: true, style: true } },
      tank: { select: { name: true } },
    },
  })

  const rows: ProductionBatchRow[] = []
  for (const b of raw) {
    const ref = b.brewedAt ?? b.createdAt
    if (ref < start) continue
    rows.push({
      id: b.id,
      batchNumber: b.batchNumber,
      status: b.status,
      volume: Number(b.volume),
      packagedVolume: Number(b.packagedVolume ?? 0),
      originalGravity: b.originalGravity != null ? Number(b.originalGravity) : null,
      finalGravity: b.finalGravity != null ? Number(b.finalGravity) : null,
      abv: b.abv != null ? Number(b.abv) : null,
      brewedAt: b.brewedAt,
      createdAt: b.createdAt,
      recipeName: b.recipe.name,
      recipeStyle: b.recipe.style,
      tankName: b.tank?.name ?? null,
    })
  }
  return rows
}

export function periodLabelKa(period: string): string {
  if (period === '30') return 'ბოლო 30 დღე'
  if (period === '90') return 'ბოლო 3 თვე'
  return 'ბოლო 12 თვე'
}

const STATUS_KA: Record<string, string> = {
  PLANNED: 'დაგეგმილი',
  BREWING: 'მზადდება',
  FERMENTING: 'ფერმენტაცია',
  CONDITIONING: 'კონდიცირება',
  READY: 'მზადაა',
  PACKAGING: 'ჩამოსხმა',
  COMPLETED: 'დასრულებული',
  CANCELLED: 'გაუქმებული',
}

export function statusLabelKa(status: string): string {
  return STATUS_KA[status.toUpperCase()] ?? status
}
