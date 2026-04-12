import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@saas-platform/database'
import { withTenantAuth, type RouteContext } from '../../withTenantAuth'
import { resolveSignatureUrl } from '@/lib/resolve-signature'

export const dynamic = 'force-dynamic'

function esc(s: unknown): string {
  if (s === null || s === undefined || s === '') return '—'
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
function fmtD(d: Date): string {
  return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`
}
function fmtT(d: Date): string {
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}
function parseYmd(s: string) {
  const p = s.split('-').map(Number)
  if (p.length !== 3 || p.some(n => Number.isNaN(n))) return null
  return { y: p[0], m: p[1], d: p[2] }
}
function sigCell(url: string | null, name: string | null, email: string | null): string {
  const resolved = resolveSignatureUrl(url)
  const label = esc(name || email)
  if (resolved) {
    return `<td class="sig"><img src="${resolved}" style="height:30px;max-width:80px;object-fit:contain"><br><span style="font-size:9px;color:#666">${label}</span></td>`
  }
  return `<td class="sig">${label}</td>`
}

type CcpLog = {
  recordedAt: Date
  temperature?: number | null
  duration?: number | null
  phLevel?: number | null
  visualCheck?: boolean | null
  result: string
  correctiveAction?: string | null
  batch?: { batchNumber: string } | null
  user: { name: string | null; email: string | null; signatureUrl: string | null }
}

function buildHtml(params: {
  tenantName: string
  tenantLogo: string | null
  period: string
  ccp1Logs: CcpLog[]
  ccp2Logs: CcpLog[]
}): string {
  const { tenantName, tenantLogo, period, ccp1Logs, ccp2Logs } = params
  const now = new Date()

  const logoHtml = tenantLogo?.startsWith('data:image')
    ? `<img src="${tenantLogo}" style="height:48px;object-fit:contain;display:block;margin:0 auto 8px">`
    : ''

  const empty7 = `<tr class="empty"><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>`

  const ccp1Rows = ccp1Logs.map(log => {
    const batch = log.batch?.batchNumber
      ?? (log.correctiveAction?.match(/\|\s*პარტია:\s*([^|]+)/)?.[1]?.trim())
      ?? '—'
    const source = log.correctiveAction?.includes('ავტომატურად გენერირებული') ? 'პარტიიდან' : 'ხელით'
    return `<tr>
      <td>${fmtD(log.recordedAt)} ${fmtT(log.recordedAt)}</td>
      <td>${esc(batch)}</td>
      <td>${log.temperature != null ? log.temperature : '—'}</td>
      <td>${log.duration != null ? log.duration : '—'}</td>
      <td>${esc(log.result)}</td>
      ${sigCell(log.user.signatureUrl, log.user.name, log.user.email)}
      <td>${esc(source)}</td>
    </tr>`
  }).join('') + Array(5).fill(empty7).join('')

  const ccp2Rows = ccp2Logs.map(log => {
    const fromCip = log.correctiveAction?.includes('ავტომატურად CIP-იდან')
    const vessel = fromCip
      ? (log.correctiveAction?.match(/\|\s*ავზი:\s*(.+)$/)?.[1]?.trim() ?? '—')
      : '—'
    const visual = log.visualCheck === true ? 'კი' : log.visualCheck === false ? 'არა' : '—'
    const source = fromCip ? 'CIP-იდან' : 'ხელით'
    return `<tr>
      <td>${fmtD(log.recordedAt)} ${fmtT(log.recordedAt)}</td>
      <td>${esc(vessel)}</td>
      <td>${log.phLevel != null ? log.phLevel : '—'}</td>
      <td>${esc(visual)}</td>
      <td>${esc(log.result)}</td>
      ${sigCell(log.user.signatureUrl, log.user.name, log.user.email)}
      <td>${esc(source)}</td>
    </tr>`
  }).join('') + Array(5).fill(empty7).join('')

  return `<!DOCTYPE html>
<html lang="ka">
<head>
<meta charset="UTF-8">
<title>HACCP CCP მონიტორინგი</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,sans-serif;font-size:11px;color:#111;padding:16px}
.header{text-align:center;margin-bottom:12px;padding-bottom:10px;border-bottom:2px solid #111}
.tenant{font-size:15px;font-weight:700;margin-bottom:6px}
.doc-title{font-size:13px;font-weight:600}
.meta{display:flex;justify-content:space-between;background:#f5f5f5;padding:5px 10px;border-radius:3px;margin:10px 0;font-size:10px;color:#555}
h2{font-size:12px;font-weight:700;background:#111;color:#fff;padding:5px 10px;margin-bottom:0}
table{width:100%;border-collapse:collapse;margin-bottom:16px}
th{background:#333;color:#fff;padding:6px 8px;text-align:left;font-size:10px}
td{padding:6px 8px;border:1px solid #ddd;vertical-align:middle}
tr:nth-child(even):not(.empty){background:#f9f9f9}
tr.empty td{height:32px;border-color:#eee}
.sig{text-align:center;min-width:90px}
.sigs{display:flex;gap:30px;margin-top:20px}
.sig-slot .sig-line{border-bottom:1px solid #333;height:32px;margin-bottom:3px}
.sig-slot .sig-label{font-size:9px;color:#666}
.sig-slot{flex:1}
.footer{display:flex;justify-content:space-between;margin-top:10px;font-size:9px;color:#999;border-top:1px solid #eee;padding-top:6px}
@media print{body{padding:8px} @page{size:A4 landscape;margin:8mm}}
</style>
</head>
<body>
<div class="header">
  ${logoHtml}
  <div class="tenant">${esc(tenantName)}</div>
  <div class="doc-title">HACCP — CCP მონიტორინგი</div>
</div>
<div class="meta">
  <span>პერიოდი: ${esc(period)}</span>
  <span>დაბეჭდვა: ${fmtD(now)} ${fmtT(now)}</span>
</div>

<h2>CCP-1 — ხარშვა</h2>
<table>
  <thead><tr>
    <th>თარიღი/დრო</th><th>პარტია</th><th>ტემპ. (°C)</th>
    <th>ხანგრძ. (წთ)</th><th>შედეგი</th>
    <th>შემსრულებელი / ხელმოწერა</th><th>წყარო</th>
  </tr></thead>
  <tbody>${ccp1Rows}</tbody>
</table>

<h2>CCP-2 — ქვევრი/ავზის სანიტარია</h2>
<table>
  <thead><tr>
    <th>თარიღი/დრო</th><th>ავზი/ქვევრი</th><th>pH</th>
    <th>ვიზუალური</th><th>შედეგი</th>
    <th>შემსრულებელი / ხელმოწერა</th><th>წყარო</th>
  </tr></thead>
  <tbody>${ccp2Rows}</tbody>
</table>

<div class="sigs">
  <div class="sig-slot"><div class="sig-line"></div><div class="sig-label">პასუხისმგებელი პირი:</div></div>
  <div class="sig-slot"><div class="sig-line"></div><div class="sig-label">მენეჯერი:</div></div>
  <div class="sig-slot"><div class="sig-line"></div><div class="sig-label">თარიღი:</div></div>
</div>
<div class="footer">
  <span>${esc(tenantName)} · HACCP CCP მონიტორინგი</span>
  <span>${fmtD(now)}</span>
</div>
<script>window.onload=()=>window.print()</script>
</body>
</html>`
}

export const GET = withTenantAuth(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const { searchParams } = new URL(req.url)
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    const recordedAt: { gte?: Date; lte?: Date } = {}
    if (dateFrom) { const p = parseYmd(dateFrom); if (p) recordedAt.gte = new Date(p.y, p.m-1, p.d, 0,0,0,0) }
    if (dateTo) { const p = parseYmd(dateTo); if (p) recordedAt.lte = new Date(p.y, p.m-1, p.d, 23,59,59,999) }

    const where = {
      tenantId: ctx.tenantId,
      ...(Object.keys(recordedAt).length ? { recordedAt } : {}),
    }

    const [ccp1Logs, ccp2Logs, tenant] = await Promise.all([
      prisma.ccpLog.findMany({
        where: { ...where, ccpType: 'BOILING' },
        include: { user: { select: { name: true, email: true, signatureUrl: true } }, batch: true },
        orderBy: { recordedAt: 'desc' },
        take: 500,
      }),
      prisma.ccpLog.findMany({
        where: { ...where, ccpType: 'VESSEL_SANITATION' },
        include: { user: { select: { name: true, email: true, signatureUrl: true } }, batch: true },
        orderBy: { recordedAt: 'desc' },
        take: 500,
      }),
      prisma.tenant.findUnique({
        where: { id: ctx.tenantId },
        select: { name: true, legalName: true, logoUrl: true },
      }),
    ])

    const tenantName = (tenant?.legalName || tenant?.name || '').trim() || '—'
    const period = [dateFrom, dateTo].filter(Boolean).join(' — ') || 'ყველა პერიოდი'

    const html = buildHtml({
      tenantName,
      tenantLogo: tenant?.logoUrl ?? null,
      period,
      ccp1Logs: ccp1Logs as CcpLog[],
      ccp2Logs: ccp2Logs as CcpLog[],
    })

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('[GET /api/haccp/ccp/pdf]', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
})
