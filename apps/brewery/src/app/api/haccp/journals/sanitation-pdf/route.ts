import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@saas-platform/database'
import { withTenantAuth, type RouteContext } from '../../withTenantAuth'
import { resolveSignatureUrl } from '@/lib/resolve-signature'

export const dynamic = 'force-dynamic'

const ZONES = [
  'თაროები', 'სავენტილაციო არხები', 'ნათურები', 'იატაკი',
  'ჭერი', 'კედლები', 'ფანჯრები', 'ნარჩენები',
  'სატვირთო ინვენტარი', 'დეზინფექცია',
]

function esc(s: unknown): string {
  if (s === null || s === undefined || s === '') return ''
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
function fmtD(d: Date): string {
  return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`
}

function buildHtml(params: {
  tenantName: string
  tenantLogo: string | null
  year: number
  month: number
  journals: Array<{
    recordedAt: Date
    data: Record<string, unknown>
    user: { name: string | null; email: string | null; signatureUrl: string | null }
  }>
}): string {
  const { tenantName, tenantLogo, year, month, journals } = params
  const now = new Date()
  const daysInMonth = new Date(year, month, 0).getDate()
  const monthLabel = new Date(year, month - 1, 1)
    .toLocaleDateString('ka-GE', { month: 'long', year: 'numeric' })

  const logoHtml = tenantLogo?.startsWith('data:image')
    ? `<img src="${tenantLogo}" style="height:40px;object-fit:contain;display:block;margin:0 auto 6px">`
    : ''

  // Build lookup: day -> zone -> first journal entry
  type Entry = typeof journals[0]
  const lookup = new Map<number, Map<string, Entry>>()
  for (const j of journals) {
    const day = j.recordedAt.getDate()
    const zone = String(j.data.area || '').trim()
    if (!zone) continue
    if (!lookup.has(day)) lookup.set(day, new Map())
    if (!lookup.get(day)!.has(zone)) {
      lookup.get(day)!.set(zone, j)
    }
  }

  // Extra zones from DB not in fixed list
  const dbZones = [...new Set(
    journals.map(j => String(j.data.area || '').trim()).filter(Boolean)
  )]
  const allZones = [...ZONES, ...dbZones.filter(z => !ZONES.includes(z))]

  // Zone column headers
  const zoneHeaders = allZones.map(z =>
    `<th class="zone-th" title="${esc(z)}">${esc(z.slice(0, 8))}${z.length > 8 ? '…' : ''}</th>`
  ).join('')

  // Table rows — one per day
  const rows = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1
    const dayEntries = lookup.get(day)

    // Find signature for this day (first user who did anything)
    let sigHtml = ''
    if (dayEntries && dayEntries.size > 0) {
      const firstEntry = dayEntries.values().next().value as Entry
      const resolved = resolveSignatureUrl(firstEntry.user.signatureUrl)
      const name = esc(firstEntry.user.name || firstEntry.user.email || '')
      if (resolved) {
        sigHtml = `<img src="${resolved}" style="height:22px;max-width:60px;object-fit:contain"><br><span style="font-size:7px;color:#555">${name}</span>`
      } else {
        sigHtml = `<span style="font-size:8px">${name}</span>`
      }
    }

    const zoneCells = allZones.map(zone => {
      const entry = dayEntries?.get(zone)
      if (entry) {
        const time = `${String(entry.recordedAt.getHours()).padStart(2,'0')}:${String(entry.recordedAt.getMinutes()).padStart(2,'0')}`
        return `<td class="check" title="${esc(entry.user.name || '')} ${time}">✓</td>`
      }
      return `<td class="empty-cell"></td>`
    }).join('')

    return `<tr>
      <td class="day-cell">${day}</td>
      ${zoneCells}
      <td class="sig-cell">${sigHtml}</td>
    </tr>`
  }).join('')

  const css = `
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Arial,sans-serif;font-size:9px;color:#111;padding:10px}
    .header{text-align:center;margin-bottom:8px;padding-bottom:8px;border-bottom:2px solid #111}
    .tenant{font-size:13px;font-weight:700;margin-bottom:3px}
    .doc-code{font-size:8px;color:#888;margin-bottom:2px}
    .doc-title{font-size:11px;font-weight:700;background:#111;color:#fff;
               display:inline-block;padding:3px 14px;border-radius:2px}
    .period{font-size:9px;color:#555;margin-top:3px}
    table{width:100%;border-collapse:collapse;margin:8px 0;font-size:8px}
    th{background:#111;color:#fff;padding:3px 2px;text-align:center;
       border:1px solid #444;font-size:7.5px}
    th.day-th{width:22px}
    th.zone-th{width:60px}
    th.sig-th{width:80px}
    td{border:1px solid #ccc;padding:2px;text-align:center;vertical-align:middle;height:24px}
    td.day-cell{font-weight:600;background:#f5f5f5;font-size:9px}
    td.check{color:#1a7a1a;font-size:13px;font-weight:700}
    td.empty-cell{background:#fff}
    td.sig-cell{min-width:80px;text-align:center}
    tr:nth-child(7n) td{border-bottom:2px solid #999}
    .footer{margin-top:12px;display:flex;justify-content:space-between;
            font-size:8px;color:#999;border-top:1px solid #eee;padding-top:5px}
    @media print{
      body{padding:5px}
      @page{size:A4 landscape;margin:5mm}
    }
  `

  return `<!DOCTYPE html>
<html lang="ka">
<head>
<meta charset="UTF-8">
<title>სანიტაციის ოქმი — ${esc(monthLabel)}</title>
<style>${css}</style>
</head>
<body>
<div class="header">
  ${logoHtml}
  <div class="doc-code">RS-02.1 | F-SOP-001H-01</div>
  <div class="tenant">${esc(tenantName)}</div>
  <div class="doc-title">სანიტაციის ჩატარების ოქმი</div>
  <div class="period">თვე/წელი: ${esc(monthLabel)} &nbsp;|&nbsp; სულ ჩანაწ.: ${journals.length}</div>
</div>

<table>
  <thead>
    <tr>
      <th class="day-th">დღე</th>
      ${zoneHeaders}
      <th class="sig-th">ხელმოწერა</th>
    </tr>
  </thead>
  <tbody>
    ${rows}
  </tbody>
</table>

<div class="footer">
  <span>${esc(tenantName)} · RS-02.1 · სანიტაციის ოქმი</span>
  <span>${fmtD(now)}</span>
</div>
<script>window.onload=()=>window.print()</script>
</body>
</html>`
}

export const GET = withTenantAuth(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const { searchParams } = new URL(req.url)
    const now = new Date()
    const year = parseInt(searchParams.get('year') || String(now.getFullYear()))
    const month = parseInt(searchParams.get('month') || String(now.getMonth() + 1))

    const from = new Date(year, month - 1, 1, 0, 0, 0, 0)
    const to = new Date(year, month, 0, 23, 59, 59, 999)

    const [journals, tenant] = await Promise.all([
      prisma.haccpJournal.findMany({
        where: {
          tenantId: ctx.tenantId,
          type: 'SANITATION',
          recordedAt: { gte: from, lte: to },
        },
        include: {
          user: { select: { name: true, email: true, signatureUrl: true } },
        },
        orderBy: { recordedAt: 'asc' },
        take: 1000,
      }),
      prisma.tenant.findUnique({
        where: { id: ctx.tenantId },
        select: { name: true, legalName: true, logoUrl: true },
      }),
    ])

    const tenantName = (tenant?.legalName || tenant?.name || '').trim() || '—'
    const rows = journals.map(j => ({
      recordedAt: j.recordedAt,
      data: (j.data as Record<string, unknown>) || {},
      user: {
        name: j.user?.name ?? null,
        email: j.user?.email ?? null,
        signatureUrl: j.user?.signatureUrl ?? null,
      },
    }))

    const html = buildHtml({
      tenantName,
      tenantLogo: tenant?.logoUrl ?? null,
      year, month,
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
    console.error('[GET /api/haccp/journals/sanitation-pdf]', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
})
