import fs from 'fs'
import path from 'path'
import { NextRequest, NextResponse } from 'next/server'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { prisma } from '@saas-platform/database'
import { withTenantAuth, type RouteContext } from '../../withTenantAuth'
import { formatDateTime } from '@/lib/utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

const FONT_VFS = 'NotoSans-Regular.ttf'
const FONT_FAMILY = 'NotoSans'

function parseYmd(s: string): { y: number; m: number; d: number } | null {
  const p = s.split('-').map(Number)
  if (p.length !== 3 || p.some((n) => Number.isNaN(n))) return null
  return { y: p[0], m: p[1], d: p[2] }
}

function isBatchSourcedCcp1(correctiveAction: string | null): boolean {
  return Boolean(correctiveAction?.includes('ავტომატურად გენერირებული'))
}

function batchNumberFromBoilingNote(correctiveAction: string | null): string | null {
  if (!correctiveAction) return null
  const m = correctiveAction.match(/\|\s*პარტია:\s*([^|]+)/)
  return m ? m[1].trim() : null
}

function isCipSourcedCcp2(correctiveAction: string | null): boolean {
  return Boolean(
    correctiveAction?.includes('ავტომატურად CIP-იდან') && correctiveAction.includes('CIP ID:')
  )
}

function equipmentNameFromCipNote(correctiveAction: string | null): string | null {
  if (!correctiveAction) return null
  const m = correctiveAction.match(/\|\s*ავზი:\s*(.+)$/)
  return m ? m[1].trim() : null
}

function periodLabel(dateFrom: string | null, dateTo: string | null): string {
  const fmt = (ymd: string) => {
    const p = parseYmd(ymd)
    if (!p) return ''
    return new Date(p.y, p.m - 1, p.d).toLocaleDateString('ka-GE')
  }
  if (dateFrom && dateTo) return `${fmt(dateFrom)} — ${fmt(dateTo)}`
  if (dateFrom) return `${fmt(dateFrom)} — …`
  if (dateTo) return `… — ${fmt(dateTo)}`
  return 'ყველა პერიოდი'
}

type LogWithRelations = {
  recordedAt: Date
  temperature: number | null
  duration: number | null
  phLevel: number | null
  visualCheck: boolean | null
  result: string
  correctiveAction: string | null
  user: { id: string; name: string | null; email: string | null; signatureUrl: string | null }
  batch: { batchNumber: string } | null
}

/** Registers Noto Sans once per document; returns family name for autoTable. */
function registerNotoSansOnce(doc: jsPDF): string {
  try {
    const b64Path = path.join(process.cwd(), 'src/lib/NotoSans-Regular-base64.txt')
    const b64 = fs.readFileSync(b64Path, 'utf8').replace(/\s/g, '')
    const binary = Buffer.from(b64, 'base64').toString('binary')
    doc.addFileToVFS(FONT_VFS, binary)
    doc.addFont(FONT_VFS, FONT_FAMILY, 'normal')
    doc.setFont(FONT_FAMILY, 'normal')
    return FONT_FAMILY
  } catch (e) {
    console.warn('[HACCP PDF] NotoSans not loaded, falling back to helvetica:', e)
    doc.setFont('helvetica', 'normal')
    return 'helvetica'
  }
}

function parseDataUrlImage(s: string): { data: string; fmt: 'PNG' | 'JPEG' } | null {
  const m = s.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/i)
  if (!m) return null
  const fmt = m[1].toLowerCase() === 'png' ? 'PNG' : 'JPEG'
  return { data: m[2], fmt }
}

function lastAutoTableFinalY(doc: jsPDF, fallback: number): number {
  const y = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY
  return typeof y === 'number' ? y : fallback
}

function buildCcpPdfBuffer(params: {
  tenantName: string
  tenantLogo: string | null
  period: string
  section: 'ALL' | 'CCP1' | 'CCP2'
  ccp1Logs: LogWithRelations[]
  ccp2Logs: LogWithRelations[]
}): Buffer {
  const { tenantName, tenantLogo, period, section, ccp1Logs, ccp2Logs } = params
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const fontFamily = registerNotoSansOnce(doc)

  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const tableFont = () => ({ font: fontFamily, fontStyle: 'normal' as const })

  let y = 10
  if (tenantLogo?.startsWith('data:image')) {
    const img = parseDataUrlImage(tenantLogo)
    if (img) {
      const imgH = 14
      const imgW = 42
      try {
        doc.addImage(img.data, img.fmt, pageW / 2 - imgW / 2, y, imgW, imgH)
        y += imgH + 3
      } catch {
        // skip broken logo
      }
    }
  }

  doc.setFontSize(16)
  doc.text(tenantName || '—', pageW / 2, y, { align: 'center' })
  y += 7
  doc.setFontSize(12)
  doc.text('HACCP — CCP მონიტორინგი', pageW / 2, y, { align: 'center' })
  y += 6
  doc.setFontSize(9)
  doc.text(`პერიოდი: ${period}`, pageW / 2, y, { align: 'center' })
  y += 5
  doc.text(`დაბეჭდილია: ${new Date().toLocaleString('ka-GE')}`, pageW / 2, y, { align: 'center' })
  y += 8

  const operatorColIndex = 5

  if (section !== 'CCP2') {
    doc.setFontSize(11)
    doc.text('CCP-1 (ხარშვა)', 14, y)
    y += 5

    autoTable(doc, {
      startY: y,
      theme: 'plain',
      styles: { ...tableFont(), fontSize: 8, cellPadding: 1.5, textColor: 20 },
      headStyles: { ...tableFont(), fillColor: [41, 128, 185], textColor: 255, fontSize: 8 },
      alternateRowStyles: { fillColor: [247, 247, 247] },
      columnStyles: { [operatorColIndex]: { minCellHeight: 14 } },
      head: [
        ['თარიღი', 'პარტია', 'ტემპ. (°C)', 'ხანგრძლივობა (წთ)', 'შედეგი', 'შემსრულებელი', 'წყარო'],
      ],
      body: ccp1Logs.map((log) => {
        const batch =
          log.batch?.batchNumber ?? batchNumberFromBoilingNote(log.correctiveAction) ?? '—'
        const source = isBatchSourcedCcp1(log.correctiveAction) ? 'პარტიიდან' : 'ხელით'
        return [
          formatDateTime(log.recordedAt),
          batch,
          log.temperature != null ? String(log.temperature) : '—',
          log.duration != null ? String(log.duration) : '—',
          String(log.result),
          log.user.name || log.user.email || '—',
          source,
        ]
      }),
      didDrawCell: (data) => {
        if (data.section !== 'body' || data.column.index !== operatorColIndex) return
        const log = ccp1Logs[data.row.index]
        const url = log?.user?.signatureUrl
        if (!url?.startsWith('data:image')) return
        const img = parseDataUrlImage(url)
        if (!img) return
        const { x, y: cy, width, height } = data.cell
        try {
          const ih = Math.min(8, height - 4)
          const iw = Math.min(24, width * 0.42)
          doc.addImage(img.data, img.fmt, x + width - iw - 1, cy + (height - ih) / 2, iw, ih)
        } catch {
          /* ignore */
        }
      },
    })
    y = lastAutoTableFinalY(doc, y) + 10
  }

  if (section !== 'CCP1') {
    if (y > pageH - 60) {
      doc.addPage()
      doc.setFont(fontFamily, 'normal')
      y = 14
    }
    doc.setFontSize(11)
    doc.text('CCP-2 (ქვევრი/ავზის სანიტარია)', 14, y)
    y += 5

    autoTable(doc, {
      startY: y,
      theme: 'plain',
      styles: { ...tableFont(), fontSize: 8, cellPadding: 1.5, textColor: 20 },
      headStyles: { ...tableFont(), fillColor: [39, 174, 96], textColor: 255, fontSize: 8 },
      alternateRowStyles: { fillColor: [247, 247, 247] },
      columnStyles: { [operatorColIndex]: { minCellHeight: 14 } },
      head: [['თარიღი', 'ავზი/ქვევრი', 'pH', 'ვიზუალური', 'შედეგი', 'შემსრულებელი', 'წყარო']],
      body: ccp2Logs.map((log) => {
        const fromCip = isCipSourcedCcp2(log.correctiveAction)
        const vesselOrBatch = fromCip
          ? equipmentNameFromCipNote(log.correctiveAction) ?? '—'
          : log.batch?.batchNumber ?? '—'
        const visual = log.visualCheck === true ? 'კი' : log.visualCheck === false ? 'არა' : '—'
        const source = fromCip ? 'CIP-იდან' : 'ხელით'
        return [
          formatDateTime(log.recordedAt),
          vesselOrBatch,
          log.phLevel != null ? String(log.phLevel) : '—',
          visual,
          String(log.result),
          log.user.name || log.user.email || '—',
          source,
        ]
      }),
      didDrawCell: (data) => {
        if (data.section !== 'body' || data.column.index !== operatorColIndex) return
        const log = ccp2Logs[data.row.index]
        const url = log?.user?.signatureUrl
        if (!url?.startsWith('data:image')) return
        const img = parseDataUrlImage(url)
        if (!img) return
        const { x, y: cy, width, height } = data.cell
        try {
          const ih = Math.min(8, height - 4)
          const iw = Math.min(24, width * 0.42)
          doc.addImage(img.data, img.fmt, x + width - iw - 1, cy + (height - ih) / 2, iw, ih)
        } catch {
          /* ignore */
        }
      },
    })
    y = lastAutoTableFinalY(doc, y) + 14
  }

  if (y > pageH - 35) {
    doc.addPage()
    doc.setFont(fontFamily, 'normal')
    y = 20
  }

  doc.setFontSize(9)
  const sigY = y + 8
  doc.line(14, sigY, 70, sigY)
  doc.text('პასუხისმგებელი პირის ხელმოწერა', 14, sigY + 5)
  doc.line(100, sigY, 156, sigY)
  doc.text('მენეჯერი', 100, sigY + 5)
  const dateX = Math.min(186, pageW - 70)
  doc.line(dateX, sigY, Math.min(dateX + 56, pageW - 14), sigY)
  doc.text('თარიღი', dateX, sigY + 5)

  doc.setFontSize(8)
  doc.text(tenantName || '—', 14, pageH - 8)
  doc.text(new Date().toLocaleDateString('ka-GE'), pageW - 14, pageH - 8, { align: 'right' })

  return Buffer.from(doc.output('arraybuffer'))
}

export const GET = withTenantAuth(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const { searchParams } = new URL(req.url)
    const rawSection = (searchParams.get('section') || 'ALL').toUpperCase()
    const section: 'ALL' | 'CCP1' | 'CCP2' =
      rawSection === 'CCP1' ? 'CCP1' : rawSection === 'CCP2' ? 'CCP2' : 'ALL'
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    const recordedAt: { gte?: Date; lte?: Date } = {}
    if (dateFrom) {
      const p = parseYmd(dateFrom)
      if (p) recordedAt.gte = new Date(p.y, p.m - 1, p.d, 0, 0, 0, 0)
    }
    if (dateTo) {
      const p = parseYmd(dateTo)
      if (p) recordedAt.lte = new Date(p.y, p.m - 1, p.d, 23, 59, 59, 999)
    }

    const whereBase = {
      tenantId: ctx.tenantId,
      ...(Object.keys(recordedAt).length ? { recordedAt } : {}),
    }

    const [ccp1Logs, ccp2Logs, tenant] = await Promise.all([
      section !== 'CCP2'
        ? prisma.ccpLog.findMany({
            where: { ...whereBase, ccpType: 'BOILING' },
            include: {
              user: { select: { id: true, name: true, email: true, signatureUrl: true } },
              batch: true,
            },
            orderBy: { recordedAt: 'desc' },
            take: 500,
          })
        : Promise.resolve([] as LogWithRelations[]),
      section !== 'CCP1'
        ? prisma.ccpLog.findMany({
            where: { ...whereBase, ccpType: 'VESSEL_SANITATION' },
            include: {
              user: { select: { id: true, name: true, email: true, signatureUrl: true } },
              batch: true,
            },
            orderBy: { recordedAt: 'desc' },
            take: 500,
          })
        : Promise.resolve([] as LogWithRelations[]),
      prisma.tenant.findUnique({
        where: { id: ctx.tenantId },
        select: { name: true, legalName: true, logoUrl: true },
      }),
    ])

    const logs1 = ccp1Logs as LogWithRelations[]
    const logs2 = ccp2Logs as LogWithRelations[]
    const tenantName = (tenant?.name || tenant?.legalName || '').trim() || '—'

    const pdfBuffer = buildCcpPdfBuffer({
      tenantName,
      tenantLogo: tenant?.logoUrl ?? null,
      period: periodLabel(dateFrom, dateTo),
      section,
      ccp1Logs: logs1,
      ccp2Logs: logs2,
    })

    const fname = new Date().toISOString().split('T')[0]

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="HACCP-CCP-${fname}.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('[GET /api/haccp/ccp/pdf]', error)
    return NextResponse.json(
      {
        error: {
          code: 'PDF_GENERATION_FAILED',
          message: error instanceof Error ? error.message : 'Failed to generate PDF.',
        },
      },
      { status: 500 }
    )
  }
})
