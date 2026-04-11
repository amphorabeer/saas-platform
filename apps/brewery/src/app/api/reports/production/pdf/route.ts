import { NextRequest, NextResponse } from 'next/server'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { registerNotoSansOnce } from '@/lib/jspdf-noto'
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

function lastAutoTableFinalY(doc: jsPDF, fallback: number): number {
  const y = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY
  return typeof y === 'number' ? y : fallback
}

export const GET = withPermission('batch:read', async (req: NextRequest, ctx: RouteContext) => {
  try {
    const period = new URL(req.url).searchParams.get('period') || 'year'
    const [batches, tenant] = await Promise.all([
      loadProductionBatches(ctx.tenantId, period),
      getTenantBrand(ctx.tenantId),
    ])

    const tenantTitle = tenant.displayName
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const fontFamily = registerNotoSansOnce(doc, 'Production PDF')
    const tableFont = () => ({ font: fontFamily, fontStyle: 'normal' as const })

    const pageW = doc.internal.pageSize.getWidth()
    let y = 12
    doc.setFontSize(14)
    doc.text(tenantTitle, pageW / 2, y, { align: 'center' })
    y += 7
    doc.setFontSize(11)
    doc.text('წარმოების ანგარიში', pageW / 2, y, { align: 'center' })
    y += 6
    doc.setFontSize(9)
    doc.text(`პერიოდი: ${periodLabelKa(period)}`, pageW / 2, y, { align: 'center' })
    y += 5
    doc.text(`დაბეჭდილია: ${new Date().toLocaleString('ka-GE')}`, pageW / 2, y, { align: 'center' })
    y += 10

    const totalVol = batches.reduce((s, b) => s + b.volume, 0)
    doc.setFontSize(10)
    doc.text(`პარტიები: ${batches.length}  •  სულ მოცულობა: ${totalVol.toLocaleString('ka-GE')} L`, 14, y)
    y += 6

    autoTable(doc, {
      startY: y,
      theme: 'plain',
      styles: { ...tableFont(), fontSize: 7, cellPadding: 1.2, textColor: 20 },
      headStyles: { ...tableFont(), fillColor: [41, 128, 185], textColor: 255, fontSize: 8 },
      alternateRowStyles: { fillColor: [247, 247, 247] },
      head: [
        [
          'პარტია',
          'რეცეპტი',
          'სტილი',
          'მოცულობა (L)',
          'OG',
          'FG',
          'ABV',
          'სტატუსი',
          'ავზი',
          'თარიღი',
        ],
      ],
      body: batches.map((b) => [
        b.batchNumber,
        b.recipeName,
        b.recipeStyle || '—',
        String(b.volume),
        b.originalGravity != null ? b.originalGravity.toFixed(3) : '—',
        b.finalGravity != null ? b.finalGravity.toFixed(3) : '—',
        b.abv != null ? `${b.abv.toFixed(1)}%` : '—',
        statusLabelKa(b.status),
        b.tankName || '—',
        b.brewedAt ? formatDate(b.brewedAt) : formatDate(b.createdAt),
      ]),
    })
    y = lastAutoTableFinalY(doc, y) + 8

    const recipeMap: Record<string, { batches: number; volume: number }> = {}
    for (const b of batches) {
      if (!recipeMap[b.recipeName]) recipeMap[b.recipeName] = { batches: 0, volume: 0 }
      recipeMap[b.recipeName].batches += 1
      recipeMap[b.recipeName].volume += b.volume
    }
    const recipeRows = Object.entries(recipeMap)
      .map(([name, v]) => [name, String(v.batches), String(v.volume)])
      .sort((a, b) => Number(b[2]) - Number(a[2]))

    if (recipeRows.length > 0) {
      doc.setFontSize(10)
      doc.text('რეცეპტების შეჯამება', 14, y)
      y += 5
      autoTable(doc, {
        startY: y,
        theme: 'plain',
        styles: { ...tableFont(), fontSize: 8, cellPadding: 1.2 },
        headStyles: { ...tableFont(), fillColor: [39, 174, 96], textColor: 255, fontSize: 8 },
        head: [['რეცეპტი', 'პარტიები', 'მოცულობა (L)']],
        body: recipeRows,
      })
    }

    const buf = Buffer.from(doc.output('arraybuffer'))
    const fname = `production-report-${new Date().toISOString().split('T')[0]}.pdf`
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fname}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    console.error('[GET /api/reports/production/pdf]', e)
    return NextResponse.json({ error: 'PDF export failed' }, { status: 500 })
  }
})
