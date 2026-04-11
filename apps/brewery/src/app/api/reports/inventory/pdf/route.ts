import { NextRequest, NextResponse } from 'next/server'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { registerNotoSansOnce } from '@/lib/jspdf-noto'
import { getTenantBrand } from '@/lib/report-tenant'
import { withPermission, type RouteContext } from '@/lib/api-middleware'
import { loadInventoryForReport } from '@/lib/inventory-report-export'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

const CAT_KA: Record<string, string> = {
  RAW_MATERIAL: 'ნედლეული',
  PACKAGING: 'შეფუთვა',
  FINISHED_GOOD: 'მზა პროდუქცია',
  CONSUMABLE: 'სახარჯი',
}

function lastAutoTableFinalY(doc: jsPDF, fallback: number): number {
  const y = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY
  return typeof y === 'number' ? y : fallback
}

export const GET = withPermission('reports:read', async (_req: NextRequest, ctx: RouteContext) => {
  try {
    const [items, tenant] = await Promise.all([
      loadInventoryForReport(ctx.tenantId),
      getTenantBrand(ctx.tenantId),
    ])

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const fontFamily = registerNotoSansOnce(doc, 'Inventory PDF')
    const tableFont = () => ({ font: fontFamily, fontStyle: 'normal' as const })

    const pageW = doc.internal.pageSize.getWidth()
    let y = 12
    doc.setFontSize(14)
    doc.text(tenant.displayName, pageW / 2, y, { align: 'center' })
    y += 7
    doc.setFontSize(11)
    doc.text('მარაგების ანგარიში', pageW / 2, y, { align: 'center' })
    y += 6
    doc.setFontSize(9)
    doc.text(`დაბეჭდილია: ${new Date().toLocaleString('ka-GE')}`, pageW / 2, y, { align: 'center' })
    y += 10

    const totalVal = items.reduce((s, i) => s + i.lineValue, 0)
    doc.setFontSize(10)
    doc.text(`პოზიციები: ${items.length}  •  სულ ღირებულება: ${totalVal.toLocaleString('ka-GE')} ₾`, 14, y)
    y += 6

    autoTable(doc, {
      startY: y,
      theme: 'plain',
      styles: { ...tableFont(), fontSize: 7, cellPadding: 1.1, textColor: 20 },
      headStyles: { ...tableFont(), fillColor: [184, 115, 51], textColor: 255, fontSize: 8 },
      alternateRowStyles: { fillColor: [247, 247, 247] },
      head: [['SKU', 'დასახელება', 'კატეგორია', 'ნაშთი', 'ერთ.', 'ზღვარი', 'ერთ. ფასი ₾', 'ღირებულება ₾']],
      body: items.map((i) => [
        i.sku,
        i.name,
        CAT_KA[i.category] || i.category,
        String(i.cachedBalance),
        i.unit,
        i.reorderPoint != null ? String(i.reorderPoint) : '—',
        i.costPerUnit != null ? i.costPerUnit.toFixed(2) : '—',
        i.lineValue.toFixed(2),
      ]),
    })
    y = lastAutoTableFinalY(doc, y) + 6

    const buf = Buffer.from(doc.output('arraybuffer'))
    const fname = `inventory-report-${new Date().toISOString().split('T')[0]}.pdf`
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fname}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    console.error('[GET /api/reports/inventory/pdf]', e)
    return NextResponse.json({ error: 'Inventory PDF export failed' }, { status: 500 })
  }
})
