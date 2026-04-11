import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { getTenantBrand } from '@/lib/report-tenant'
import { withPermission, type RouteContext } from '@/lib/api-middleware'
import { formatDate } from '@/lib/utils'
import {
  loadProductionBatches,
  periodLabelKa,
  statusLabelKa,
} from '@/lib/production-report-export'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

export const GET = withPermission('batch:read', async (req: NextRequest, ctx: RouteContext) => {
  try {
    const period = new URL(req.url).searchParams.get('period') || 'year'
    const [batches, tenant] = await Promise.all([
      loadProductionBatches(ctx.tenantId, period),
      getTenantBrand(ctx.tenantId),
    ])

    const tenantTitle = tenant.displayName
    const wb = XLSX.utils.book_new()

    const totalVol = batches.reduce((s, b) => s + b.volume, 0)
    const summaryRows = [
      ['კომპანია', tenantTitle],
      ['პერიოდი', periodLabelKa(period)],
      ['დაბეჭდილია', new Date().toISOString()],
      ['პარტიების რაოდენობა', batches.length],
      ['სულ მოცულობა (L)', totalVol],
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryRows), 'Summary')

    const batchHeader = [
      'პარტია',
      'რეცეპტი',
      'სტილი',
      'მოცულობა_L',
      'OG',
      'FG',
      'ABV',
      'სტატუსი',
      'ავზი',
      'თარიღი',
    ]
    const batchBody = batches.map((b) => [
      b.batchNumber,
      b.recipeName,
      b.recipeStyle || '',
      b.volume,
      b.originalGravity ?? '',
      b.finalGravity ?? '',
      b.abv ?? '',
      statusLabelKa(b.status),
      b.tankName || '',
      b.brewedAt ? formatDate(b.brewedAt) : formatDate(b.createdAt),
    ])
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([batchHeader, ...batchBody]),
      'Batches'
    )

    const recipeMap: Record<string, { batches: number; volume: number }> = {}
    for (const b of batches) {
      if (!recipeMap[b.recipeName]) recipeMap[b.recipeName] = { batches: 0, volume: 0 }
      recipeMap[b.recipeName].batches += 1
      recipeMap[b.recipeName].volume += b.volume
    }
    const recipeHeader = ['რეცეპტი', 'პარტიები', 'მოცულობა_L']
    const recipeBody = Object.entries(recipeMap)
      .map(([name, v]) => [name, v.batches, v.volume])
      .sort((a, b) => (b[2] as number) - (a[2] as number))
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([recipeHeader, ...recipeBody]),
      'ByRecipe'
    )

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
    const fname = `production-report-${new Date().toISOString().split('T')[0]}.xlsx`
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fname}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    console.error('[GET /api/reports/production/excel]', e)
    return NextResponse.json({ error: 'Excel export failed' }, { status: 500 })
  }
})
