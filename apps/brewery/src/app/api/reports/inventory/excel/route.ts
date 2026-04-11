import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { getTenantBrand } from '@/lib/report-tenant'
import { withPermission, type RouteContext } from '@/lib/api-middleware'
import { loadInventoryForReport } from '@/lib/inventory-report-export'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

export const GET = withPermission('reports:read', async (_req: NextRequest, ctx: RouteContext) => {
  try {
    const [items, tenant] = await Promise.all([
      loadInventoryForReport(ctx.tenantId),
      getTenantBrand(ctx.tenantId),
    ])

    const totalVal = items.reduce((s, i) => s + i.lineValue, 0)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([
        ['კომპანია', tenant.displayName],
        ['პოზიციები', items.length],
        ['სულ ღირებულება ₾', totalVal],
      ]),
      'Summary'
    )

    const head = ['SKU', 'სახელი', 'კატეგორია', 'ნაშთი', 'ერთობა', 'ზღვარი', 'ერთ_ფასი', 'ღირებულება']
    const body = items.map((i) => [
      i.sku,
      i.name,
      i.category,
      i.cachedBalance,
      i.unit,
      i.reorderPoint ?? '',
      i.costPerUnit ?? '',
      i.lineValue,
    ])
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([head, ...body]), 'Items')

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
    const fname = `inventory-report-${new Date().toISOString().split('T')[0]}.xlsx`
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fname}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    console.error('[GET /api/reports/inventory/excel]', e)
    return NextResponse.json({ error: 'Inventory Excel export failed' }, { status: 500 })
  }
})
