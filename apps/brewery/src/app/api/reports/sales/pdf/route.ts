import { NextRequest, NextResponse } from 'next/server'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { registerNotoSansOnce } from '@/lib/jspdf-noto'
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

const STATUS_KA: Record<string, string> = {
  PENDING: 'მოლოდინში',
  CONFIRMED: 'დადასტურებული',
  PROCESSING: 'მზადდება',
  READY: 'მზადაა',
  SHIPPED: 'გაგზავნილი',
  DELIVERED: 'მიტანილი',
  CANCELLED: 'გაუქმებული',
}

function lastAutoTableFinalY(doc: jsPDF, fallback: number): number {
  const y = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY
  return typeof y === 'number' ? y : fallback
}

export const GET = withPermission('reports:read', async (req: NextRequest, ctx: RouteContext) => {
  try {
    const period = new URL(req.url).searchParams.get('period') || 'year'
    const [orders, tenant] = await Promise.all([
      loadSalesOrdersForReport(ctx.tenantId, period),
      getTenantBrand(ctx.tenantId),
    ])

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const fontFamily = registerNotoSansOnce(doc, 'Sales PDF')
    const tableFont = () => ({ font: fontFamily, fontStyle: 'normal' as const })

    const pageW = doc.internal.pageSize.getWidth()
    let y = 12
    doc.setFontSize(14)
    doc.text(tenant.displayName, pageW / 2, y, { align: 'center' })
    y += 7
    doc.setFontSize(11)
    doc.text('გაყიდვების ანგარიში', pageW / 2, y, { align: 'center' })
    y += 6
    doc.setFontSize(9)
    doc.text(`პერიოდი: ${salesPeriodLabelKa(period)}`, pageW / 2, y, { align: 'center' })
    y += 5
    doc.text(`დაბეჭდილია: ${new Date().toLocaleString('ka-GE')}`, pageW / 2, y, { align: 'center' })
    y += 10

    const revenue = orders.reduce((s, o) => s + o.totalAmount, 0)
    doc.setFontSize(10)
    doc.text(`შეკვეთები: ${orders.length}  •  სულ: ${revenue.toLocaleString('ka-GE')} ₾`, 14, y)
    y += 6

    autoTable(doc, {
      startY: y,
      theme: 'plain',
      styles: { ...tableFont(), fontSize: 7, cellPadding: 1.2, textColor: 20 },
      headStyles: { ...tableFont(), fillColor: [41, 128, 185], textColor: 255, fontSize: 8 },
      alternateRowStyles: { fillColor: [247, 247, 247] },
      head: [['შეკვეთა', 'კლიენტი', 'ქალაქი', 'თარიღი', 'თანხა ₾', 'სტატუსი']],
      body: orders.map((o) => [
        o.orderNumber,
        o.customerName,
        o.city || '—',
        formatDate(o.orderedAt),
        o.totalAmount.toFixed(2),
        STATUS_KA[o.status] || o.status,
      ]),
    })
    y = lastAutoTableFinalY(doc, y) + 8

    const lines = orders.flatMap((o) =>
      o.items.map((it) => [
        o.orderNumber,
        it.productName,
        String(it.quantity),
        it.unitPrice.toFixed(2),
        it.totalPrice.toFixed(2),
      ])
    )
    if (lines.length > 0) {
      doc.setFontSize(10)
      doc.text('პოზიციები', 14, y)
      y += 5
      autoTable(doc, {
        startY: y,
        theme: 'plain',
        styles: { ...tableFont(), fontSize: 7, cellPadding: 1 },
        headStyles: { ...tableFont(), fillColor: [39, 174, 96], textColor: 255, fontSize: 8 },
        head: [['შეკვეთა', 'პროდუქტი', 'რაოდ.', 'ერთ. ფასი', 'სულ']],
        body: lines.slice(0, 200),
      })
    }

    const buf = Buffer.from(doc.output('arraybuffer'))
    const fname = `sales-report-${new Date().toISOString().split('T')[0]}.pdf`
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fname}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    console.error('[GET /api/reports/sales/pdf]', e)
    return NextResponse.json({ error: 'Sales PDF export failed' }, { status: 500 })
  }
})
