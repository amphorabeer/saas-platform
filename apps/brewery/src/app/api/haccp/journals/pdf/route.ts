import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@saas-platform/database'
import { withTenantAuth, type RouteContext } from '../../withTenantAuth'
import type { HaccpJournalType } from '@prisma/client'
import { Prisma } from '@prisma/client'
import { resolveSignatureUrl } from '@/lib/resolve-signature'

export const dynamic = 'force-dynamic'

type JournalRow = {
  id: string
  data: Record<string, unknown>
  recordedAt: Date
  user: { name: string | null; email: string | null; signatureUrl: string | null }
}

function esc(s: unknown): string {
  if (s === null || s === undefined || s === '') return '—'
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function fmtDate(d: Date): string {
  return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`
}

function fmtTime(d: Date): string {
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

function fv(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—'
  if (typeof v === 'boolean') return v ? 'დიახ' : 'არა'
  return String(v)
}

function sigCell(url: string | null, name: string | null, email: string | null): string {
  const resolved = resolveSignatureUrl(url)
  const label = esc(name || email)
  if (resolved) {
    return `<td class="sig"><img src="${resolved}" style="height:30px;max-width:80px;object-fit:contain"><br><span style="font-size:9px;color:#666">${label}</span></td>`
  }
  return `<td class="sig">${label}</td>`
}

type ColDef = { label: string; value: (j: JournalRow) => string; isSig?: boolean }

const CONFIGS: Record<string, { title: string; cols: ColDef[] }> = {
  SANITATION: {
    title: 'სანიტაციის ჟურნალი',
    cols: [
      { label: 'თარიღი/დრო', value: j => `${fmtDate(j.recordedAt)} ${fmtTime(j.recordedAt)}` },
      { label: 'ზონა', value: j => fv(j.data.area) },
      { label: 'მეთოდი', value: j => fv(j.data.method) },
      { label: 'ქიმიური', value: j => fv(j.data.chemical) },
      { label: 'კონც.', value: j => fv(j.data.concentration) },
      { label: 'შენიშვნა', value: j => fv(j.data.notes) },
      { label: 'შემსრულებელი / ხელმოწერა', value: j => fv(j.user.name || j.user.email), isSig: true },
    ],
  },
  INCOMING_CONTROL: {
    title: 'ნედლეულის მიღების ფორმა (RS-10.1)',
    cols: [
      { label: 'თარიღი/დრო', value: j => `${fmtDate(j.recordedAt)} ${fmtTime(j.recordedAt)}` },
      { label: 'პროდუქტი', value: j => fv(j.data.product) },
      { label: 'რაოდ.', value: j => j.data.quantity ? `${fv(j.data.quantity)} ${fv(j.data.unit)}` : '—' },
      { label: 'მომწოდებელი', value: j => fv(j.data.supplier) },
      { label: 'ტრანსპ. ჰიგ.', value: j => j.data.vehicleHygiene === true ? '✓' : j.data.vehicleHygiene === false ? '✗' : '—' },
      { label: 'დოკ.', value: j => j.data.documents === true ? '✓' : j.data.documents === false ? '✗' : '—' },
      { label: 'ტემპ. °C', value: j => fv(j.data.temperature) },
      { label: 'შეფუთვა', value: j => j.data.packagingIntegrity === true ? '✓' : j.data.packagingIntegrity === false ? '✗' : '—' },
      { label: 'ხარისხი', value: j => j.data.quality === true ? '✓' : j.data.quality === false ? '✗' : '—' },
      { label: 'სუნი/გემო', value: j => j.data.smellTaste === true ? '✓' : j.data.smellTaste === false ? '✗' : '—' },
      { label: 'უკან (კგ/ლ)', value: j => fv(j.data.returnedQty) },
      { label: 'შენიშვნა', value: j => fv(j.data.notes) },
      { label: 'მიმღები / ხელმოწ.', value: j => fv(j.user.name || j.user.email), isSig: true },
    ],
  },
  PEST_CONTROL: {
    title: 'მავნებლების კონტროლი',
    cols: [
      { label: 'თარიღი/დრო', value: j => `${fmtDate(j.recordedAt)} ${fmtTime(j.recordedAt)}` },
      { label: 'პროცედურა', value: j => fv(j.data.procedure) },
      { label: 'მავნებელი', value: j => fv(j.data.pest) },
      { label: 'ქიმიური', value: j => fv(j.data.chemical) },
      { label: 'ზონა', value: j => fv(j.data.area) },
      { label: 'შედეგი', value: j => fv(j.data.result) },
      { label: 'შემსრულებელი / ხელმოწერა', value: j => fv(j.user.name || j.user.email), isSig: true },
    ],
  },
  WASTE_MANAGEMENT: {
    title: 'ნარჩენების მართვა',
    cols: [
      { label: 'თარიღი/დრო', value: j => `${fmtDate(j.recordedAt)} ${fmtTime(j.recordedAt)}` },
      { label: 'ნარჩ. ტიპი', value: j => fv(j.data.wasteType) },
      { label: 'მართვის მეთ.', value: j => fv(j.data.managementMethod) },
      { label: 'ხელშეკრ. №', value: j => fv(j.data.contractNo) },
      { label: 'შენიშვნა', value: j => fv(j.data.notes) },
      { label: 'შემსრულებელი / ხელმოწერა', value: j => fv(j.user.name || j.user.email), isSig: true },
    ],
  },
  TEMPERATURE: {
    title: 'ტემპერატურა / ტენიანობა',
    cols: [
      { label: 'თარიღი/დრო', value: j => `${fmtDate(j.recordedAt)} ${fmtTime(j.recordedAt)}` },
      { label: 'ზონა', value: j => fv(j.data.area) },
      { label: 'ტემპ. (°C)', value: j => fv(j.data.temperature) },
      { label: 'ტენ. (%)', value: j => fv(j.data.humidity) },
      { label: 'შენიშვნა', value: j => fv(j.data.notes) },
      { label: 'შემსრულებელი / ხელმოწერა', value: j => fv(j.user.name || j.user.email), isSig: true },
    ],
  },
  KEG_WASHING: {
    title: 'კეგის რეცხვის ჟურნალი',
    cols: [
      { label: 'თარიღი/დრო', value: j => `${fmtDate(j.recordedAt)} ${fmtTime(j.recordedAt)}` },
      { label: 'კეგი №', value: j => fv(j.data.kegNumber) },
      { label: 'ზომა', value: j => j.data.size ? `${j.data.size}L` : '—' },
      { label: 'მდგომარეობა', value: j => fv(j.data.conditionLabel || j.data.condition) },
      { label: 'პროდუქტი', value: j => fv(j.data.productName) },
      { label: 'კლიენტი', value: j => fv(j.data.customerName) },
      { label: 'შემსრულებელი / ხელმოწერა', value: j => fv(j.user.name || j.user.email), isSig: true },
    ],
  },
  FILLING: {
    title: 'ჩამოსხმის ჟურნალი',
    cols: [
      { label: 'თარიღი/დრო', value: j => `${fmtDate(j.recordedAt)} ${fmtTime(j.recordedAt)}` },
      { label: 'პარტია', value: j => fv(j.data.batchNumber) },
      { label: 'შეფ. ტიპი', value: j => fv(j.data.packageType) },
      { label: 'რაოდ.', value: j => fv(j.data.quantity) },
      { label: 'მოც. (L)', value: j => fv(j.data.volumeTotal) },
      { label: 'ლოტი', value: j => j.data.lotNumber ? String(j.data.lotNumber).slice(0,20) : '—' },
      { label: 'შემსრულებელი / ხელმოწერა', value: j => fv(j.user.name || j.user.email), isSig: true },
    ],
  },
}

function buildHtml(params: {
  tenantName: string
  tenantLogo: string | null
  period: string
  type: string
  journals: JournalRow[]
}): string {
  const { tenantName, tenantLogo, period, type, journals } = params
  const cfg = CONFIGS[type]
  if (!cfg) throw new Error(`Unknown type: ${type}`)
  const now = new Date()
  const EMPTY_ROWS = 5

  const logoHtml = tenantLogo?.startsWith('data:image')
    ? `<img src="${tenantLogo}" style="height:48px;object-fit:contain;display:block;margin:0 auto 8px">`
    : ''

  const thead = cfg.cols.map(c => `<th>${esc(c.label)}</th>`).join('')

  const dataRows = journals.map(j => {
    const cells = cfg.cols.map(c => {
      if (c.isSig) {
        return sigCell(j.user.signatureUrl, j.user.name, j.user.email)
      }
      return `<td>${esc(c.value(j))}</td>`
    }).join('')
    return `<tr>${cells}</tr>`
  }).join('')

  const emptyRows = Array(EMPTY_ROWS).fill(
    `<tr class="empty">${cfg.cols.map(() => '<td>&nbsp;</td>').join('')}</tr>`
  ).join('')

  return `<!DOCTYPE html>
<html lang="ka">
<head>
<meta charset="UTF-8">
<title>${esc(cfg.title)}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,sans-serif;font-size:11px;color:#111;padding:16px}
.header{text-align:center;margin-bottom:12px;padding-bottom:10px;border-bottom:2px solid #111}
.tenant{font-size:15px;font-weight:700;margin-bottom:6px}
.doc-title{display:inline-block;background:#111;color:#fff;padding:5px 20px;border-radius:3px;font-size:12px;font-weight:600}
.meta{display:flex;justify-content:space-between;background:#f5f5f5;padding:5px 10px;border-radius:3px;margin:10px 0;font-size:10px;color:#555}
table{width:100%;border-collapse:collapse;margin-bottom:16px}
th{background:#111;color:#fff;padding:6px 8px;text-align:left;font-size:10px;font-weight:600}
td{padding:6px 8px;border:1px solid #ddd;vertical-align:middle}
tr:nth-child(even):not(.empty){background:#f9f9f9}
tr.empty td{height:32px;border-color:#eee}
.sig{text-align:center;min-width:90px}
.sigs{display:flex;gap:30px;margin-top:20px}
.sig-slot{flex:1}
.sig-line{border-bottom:1px solid #333;height:32px;margin-bottom:3px}
.sig-label{font-size:9px;color:#666}
.footer{display:flex;justify-content:space-between;margin-top:10px;font-size:9px;color:#999;border-top:1px solid #eee;padding-top:6px}
@media print{
  body{padding:8px}
  @page{size:A4 landscape;margin:8mm}
  .no-print{display:none}
}
</style>
</head>
<body>
<div class="header">
  ${logoHtml}
  <div class="tenant">${esc(tenantName)}</div>
  <div class="doc-title">${esc(cfg.title)}</div>
</div>
<div class="meta">
  <span>პერიოდი: ${esc(period)}</span>
  <span>დაბეჭდვა: ${fmtDate(now)} ${fmtTime(now)}</span>
  <span>სულ ჩანაწერი: ${journals.length}</span>
</div>
<table>
  <thead><tr>${thead}</tr></thead>
  <tbody>${dataRows}${emptyRows}</tbody>
</table>
<div class="sigs">
  <div class="sig-slot"><div class="sig-line"></div><div class="sig-label">პასუხისმგებელი პირი:</div></div>
  <div class="sig-slot"><div class="sig-line"></div><div class="sig-label">მენეჯერი:</div></div>
  <div class="sig-slot"><div class="sig-line"></div><div class="sig-label">თარიღი:</div></div>
</div>
<div class="footer">
  <span>${esc(tenantName)} · ${esc(cfg.title)}</span>
  <span>${fmtDate(now)}</span>
</div>
<script>window.onload=()=>window.print()</script>
</body>
</html>`
}

export const GET = withTenantAuth(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const { searchParams } = new URL(req.url)
    const typeParam = (searchParams.get('type') || '').toUpperCase() as HaccpJournalType
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    if (!typeParam || !CONFIGS[typeParam]) {
      return NextResponse.json({ error: 'type required' }, { status: 400 })
    }

    const where: Record<string, unknown> = { tenantId: ctx.tenantId, type: typeParam }
    if (dateFrom || dateTo) {
      const recordedAt: Record<string, Date> = {}
      if (dateFrom) recordedAt.gte = new Date(dateFrom + 'T00:00:00')
      if (dateTo) recordedAt.lte = new Date(dateTo + 'T23:59:59')
      where.recordedAt = recordedAt
    }

    const [journals, tenant] = await Promise.all([
      prisma.haccpJournal.findMany({
        where: where as Prisma.HaccpJournalWhereInput,
        include: { user: { select: { name: true, email: true, signatureUrl: true } } },
        orderBy: { recordedAt: 'desc' },
        take: 500,
      }),
      prisma.tenant.findUnique({
        where: { id: ctx.tenantId },
        select: { name: true, legalName: true, logoUrl: true },
      }),
    ])

    const tenantName = (tenant?.legalName || tenant?.name || '').trim() || '—'
    const rows: JournalRow[] = journals.map(j => ({
      id: j.id,
      data: (j.data as Record<string, unknown>) || {},
      recordedAt: j.recordedAt,
      user: {
        name: j.user?.name ?? null,
        email: j.user?.email ?? null,
        signatureUrl: j.user?.signatureUrl ?? null,
      },
    }))

    const period = [dateFrom, dateTo].filter(Boolean).join(' — ') || 'ყველა პერიოდი'
    const html = buildHtml({
      tenantName,
      tenantLogo: tenant?.logoUrl ?? null,
      period,
      type: typeParam,
      journals: rows,
    })

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('[GET /api/haccp/journals/pdf]', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
})
