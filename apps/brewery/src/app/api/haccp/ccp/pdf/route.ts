import fs from 'fs'
import path from 'path'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@saas-platform/database'
import { withTenantAuth, type RouteContext } from '../../withTenantAuth'
import { formatDateTime } from '@/lib/utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

function parseYmd(s: string): { y: number; m: number; d: number } | null {
  const p = s.split('-').map(Number)
  if (p.length !== 3 || p.some((n) => Number.isNaN(n))) return null
  return { y: p[0], m: p[1], d: p[2] }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

async function getSignatureBase64(signatureUrl: string | null): Promise<string | null> {
  if (!signatureUrl) return null

  try {
    const relative = signatureUrl.trim().replace(/^\/+/, '')
    const filePath = path.join(process.cwd(), 'public', relative)

    if (fs.existsSync(filePath)) {
      const fileBuffer = fs.readFileSync(filePath)
      const base64 = fileBuffer.toString('base64')
      const ext = path.extname(filePath).slice(1).toLowerCase()
      const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg'
      return `data:${mimeType};base64,${base64}`
    }
  } catch (e) {
    console.error('Failed to load signature:', e)
  }
  return null
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

function buildCcpPdfHtml(params: {
  tenantName: string
  period: string
  section: 'ALL' | 'CCP1' | 'CCP2'
  ccp1Logs: LogWithRelations[]
  ccp2Logs: LogWithRelations[]
  signatureMap: Record<string, string>
}): string {
  const { tenantName, period, section, ccp1Logs, ccp2Logs, signatureMap } = params
  const company = escapeHtml(tenantName || '—')
  const periodEsc = escapeHtml(period)
  const printed = escapeHtml(new Date().toLocaleString('ka-GE'))

  const rowCcp1 = (log: LogWithRelations) => {
    const batch =
      log.batch?.batchNumber ?? batchNumberFromBoilingNote(log.correctiveAction) ?? '—'
    const source = isBatchSourcedCcp1(log.correctiveAction) ? 'პარტიიდან' : 'ხელით'
    const sigData = signatureMap[log.user.id]
    const operatorCell = `${escapeHtml(log.user.name || log.user.email || '—')}${
      sigData
        ? `<br><img src="${sigData}" alt="" style="height:24px;max-width:100px;object-fit:contain;" />`
        : ''
    }`
    return `<tr>
      <td>${escapeHtml(formatDateTime(log.recordedAt))}</td>
      <td>${escapeHtml(batch)}</td>
      <td>${log.temperature != null ? escapeHtml(String(log.temperature)) : '—'}</td>
      <td>${log.duration != null ? escapeHtml(String(log.duration)) : '—'}</td>
      <td>${escapeHtml(String(log.result))}</td>
      <td>${operatorCell}</td>
      <td>${escapeHtml(source)}</td>
    </tr>`
  }

  const rowCcp2 = (log: LogWithRelations) => {
    const fromCip = isCipSourcedCcp2(log.correctiveAction)
    const vesselOrBatch = fromCip
      ? equipmentNameFromCipNote(log.correctiveAction) ?? '—'
      : log.batch?.batchNumber ?? '—'
    const visual = log.visualCheck === true ? 'კი' : log.visualCheck === false ? 'არა' : '—'
    const source = fromCip ? 'CIP-იდან' : 'ხელით'
    const sigData = signatureMap[log.user.id]
    const operatorCell = `${escapeHtml(log.user.name || log.user.email || '—')}${
      sigData
        ? `<br><img src="${sigData}" alt="" style="height:24px;max-width:100px;object-fit:contain;" />`
        : ''
    }`
    return `<tr>
      <td>${escapeHtml(formatDateTime(log.recordedAt))}</td>
      <td>${escapeHtml(vesselOrBatch)}</td>
      <td>${log.phLevel != null ? escapeHtml(String(log.phLevel)) : '—'}</td>
      <td>${escapeHtml(visual)}</td>
      <td>${escapeHtml(String(log.result))}</td>
      <td>${operatorCell}</td>
      <td>${escapeHtml(source)}</td>
    </tr>`
  }

  const show1 = section !== 'CCP2'
  const show2 = section !== 'CCP1'

  return `<!DOCTYPE html>
<html lang="ka">
<head>
  <meta charset="UTF-8" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Georgian:wght@400;600&display=swap" rel="stylesheet" />
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: 'Noto Sans Georgian', system-ui, sans-serif;
      font-size: 11px;
      margin: 0;
      color: #111;
    }
    h1 { text-align: center; font-size: 16px; margin: 0; font-weight: 600; }
    h2 { text-align: center; font-size: 13px; margin: 6px 0 4px; font-weight: 600; }
    .meta { text-align: center; font-size: 10px; color: #555; margin-bottom: 14px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 18px; table-layout: fixed; }
    th {
      background: #2980b9;
      color: #fff;
      padding: 6px 4px;
      text-align: left;
      font-size: 9px;
      font-weight: 600;
      word-break: break-word;
    }
    td {
      border: 1px solid #ddd;
      padding: 5px 4px;
      font-size: 9px;
      vertical-align: top;
      word-break: break-word;
    }
    tr:nth-child(even) td { background: #f7f7f7; }
    .section-title { font-weight: 600; font-size: 12px; margin: 14px 0 6px; }
    .footer { margin-top: 16px; font-size: 9px; color: #888; display: flex; justify-content: space-between; }
  </style>
</head>
<body>
  <h1>${company}</h1>
  <h2>HACCP — CCP მონიტორინგი</h2>
  <div class="meta">პერიოდი: ${periodEsc}<br />დაბეჭდილია: ${printed}</div>

  ${
    show1
      ? `<div class="section-title">CCP-1 (ხარშვა)</div>
  <table>
    <thead><tr>
      <th>თარიღი</th><th>პარტია</th><th>ტემპ. (°C)</th><th>ხანგრძლივობა (წთ)</th>
      <th>შედეგი</th><th>შემსრულებელი</th><th>წყარო</th>
    </tr></thead>
    <tbody>${ccp1Logs.map(rowCcp1).join('')}</tbody>
  </table>`
      : ''
  }

  ${
    show2
      ? `<div class="section-title">CCP-2 (ქვევრი/ავზის სანიტარია)</div>
  <table>
    <thead><tr>
      <th>თარიღი</th><th>ავზი/ქვევრი</th><th>pH</th><th>ვიზუალური</th>
      <th>შედეგი</th><th>შემსრულებელი</th><th>წყარო</th>
    </tr></thead>
    <tbody>${ccp2Logs.map(rowCcp2).join('')}</tbody>
  </table>`
      : ''
  }

  <div class="signatures" style="margin-top: 40px; display: flex; justify-content: space-between;">
    <div style="text-align: center; width: 200px;">
      <div style="border-top: 1px solid #000; margin-bottom: 4px;"></div>
      <div style="font-size: 9px;">პასუხისმგებელი პირის ხელმოწერა</div>
    </div>
    <div style="text-align: center; width: 200px;">
      <div style="border-top: 1px solid #000; margin-bottom: 4px;"></div>
      <div style="font-size: 9px;">მენეჯერი</div>
    </div>
    <div style="text-align: center; width: 200px;">
      <div style="border-top: 1px solid #000; margin-bottom: 4px;"></div>
      <div style="font-size: 9px;">თარიღი</div>
    </div>
  </div>
  <div class="footer"><span>${company}</span><span>${printed}</span></div>
</body>
</html>`
}

/** Sparticuz pack matching @sparticuz/chromium-min in package.json; override with CHROMIUM_PACK_TAR_URL if needed. */
const CHROMIUM_PACK_TAR_URL =
  process.env.CHROMIUM_PACK_TAR_URL ??
  'https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar'

async function renderHtmlToPdf(html: string): Promise<Buffer> {
  const puppeteer = (await import('puppeteer-core')).default
  const chromium = (await import('@sparticuz/chromium-min')).default

  const localChrome =
    process.env.CHROMIUM_EXECUTABLE_PATH || process.env.PUPPETEER_EXECUTABLE_PATH

  const browser = localChrome
    ? await puppeteer.launch({
        headless: true,
        executablePath: localChrome,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      })
    : await puppeteer.launch({
        args: [...chromium.args, '--disable-dev-shm-usage'],
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(CHROMIUM_PACK_TAR_URL),
        headless: chromium.headless,
      })

  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 90_000 })
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '14mm', right: '10mm', bottom: '14mm', left: '10mm' },
    })
    return Buffer.from(pdf)
  } finally {
    await browser.close()
  }
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
        select: { name: true, legalName: true },
      }),
    ])

    const logs1 = ccp1Logs as LogWithRelations[]
    const logs2 = ccp2Logs as LogWithRelations[]
    const userById = new Map<string, { id: string; signatureUrl: string | null }>()
    for (const log of logs1) {
      const u = log.user
      if (u?.id) userById.set(u.id, { id: u.id, signatureUrl: u.signatureUrl })
    }
    for (const log of logs2) {
      const u = log.user
      if (u?.id) userById.set(u.id, { id: u.id, signatureUrl: u.signatureUrl })
    }

    const signatureMap: Record<string, string> = {}
    for (const user of userById.values()) {
      if (user.signatureUrl) {
        const base64 = await getSignatureBase64(user.signatureUrl)
        if (base64) signatureMap[user.id] = base64
      }
    }

    const tenantName = (tenant?.name || tenant?.legalName || '').trim() || '—'
    const html = buildCcpPdfHtml({
      tenantName,
      period: periodLabel(dateFrom, dateTo),
      section,
      ccp1Logs: logs1,
      ccp2Logs: logs2,
      signatureMap,
    })

    const pdfBuffer = await renderHtmlToPdf(html)
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
          message:
            error instanceof Error
              ? error.message
              : 'Failed to generate PDF. Ensure Chromium is available (Puppeteer) on the server.',
        },
      },
      { status: 500 }
    )
  }
})
