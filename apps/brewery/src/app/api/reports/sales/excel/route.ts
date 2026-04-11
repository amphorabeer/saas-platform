import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { getTenantBrand } from '@/lib/report-tenant'
import { withPermission, type RouteContext } from '@/lib/api-middleware'
import { formatDate } from '@/lib/utils'
import {
  loadSalesOrdersForReport,
  salesPeriodLabelKa,
} from '@/lib/sales-report-export'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

export const GET = withPermission('reports:read', async (req: NextRequest, ctx: RouteContext) => {
  try {
    const period = new URL(req.url).searchParams.get('period') || 'year'
    const [orders, tenant] = await Promise.all([
      loadSalesOrdersForReport(ctx.tenantId, period),
      getTenantBrand(ctx.tenantId),
    ])

    const wb = XLSX.utils.book_new()
    const revenue = orders.reduce((s, o) => s + o.totalAmount, 0)
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([
        ['კომპანია', tenant.displayName],
        ['პერიოდი', salesPeriodLabelKa(period)],
        ['შეკვეთები', orders.length],
        ['სულ გაყიდვები ₾', revenue],
      ]),
      'Summary'
    )

    const orderHead = ['შეკვეთა', 'კლიენტი', 'ქალაქი', 'თარიღი', 'თანხა', 'სტატუსი']
    const orderBody = orders.map((o) => [
      o.orderNumber,
      o.customerName,
      o.city || '',
      formatDate(o.orderedAt),
      o.totalAmount,
      o.status,
    ])
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([orderHead, ...orderBody]), 'Orders')

    const lineHead = ['შეკვეთა', 'პროდუქტი', 'რაოდენობა', 'ერთ_ფასი', 'სულ']
    const lineBody = orders.flatMap((o) =>
      o.items.map((it) => [o.orderNumber, it.productName, it.quantity, it.unitPrice, it.totalPrice])
    )
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([lineHead, ...lineBody]), 'Lines')

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
    const fname = `sales-report-${new Date().toISOString().split('T')[0]}.xlsx`
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fname}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    console.error('[GET /api/reports/sales/excel]', e)
    return NextResponse.json({ error: 'Sales Excel export failed' }, { status: 500 })
  }
})
