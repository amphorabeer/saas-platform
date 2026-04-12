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
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`
}
function fmtT(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export const GET = withTenantAuth(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const [suppliers, tenant] = await Promise.all([
      (prisma as any).supplier.findMany({
        where: { tenantId: ctx.tenantId, isActive: true },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          address: true,
          notes: true,
        },
      }),
      prisma.tenant.findUnique({
        where: { id: ctx.tenantId },
        select: { name: true, legalName: true, logoUrl: true },
      }),
    ])

    const tenantName = (tenant?.legalName || tenant?.name || '').trim() || '—'
    const now = new Date()

    const logoHtml = tenant?.logoUrl?.startsWith('data:image')
      ? `<img src="${tenant.logoUrl}" style="height:40px;object-fit:contain;display:block;margin:0 auto 6px">`
      : ''

    const rows = suppliers
      .map((s: any, i: number) => {
        let contactPerson = ''
        if (s.notes?.includes('საკონტაქტო პირი:')) {
          const m = s.notes.match(/საკონტაქტო პირი:\s*([^\n]+)/)
          if (m) contactPerson = m[1].trim()
        }
        return `
        <tr>
          <td>${i + 1}</td>
          <td><strong>${esc(s.name)}</strong></td>
          <td>${esc(contactPerson)}</td>
          <td>${esc(s.phone)}</td>
          <td>${esc(s.email)}</td>
          <td>${esc(s.address)}</td>
          <td>${esc(s.notes?.replace(/საკონტაქტო პირი:[^\n]+\n?/, '') || '')}</td>
        </tr>
      `
      })
      .join('')

    const emptyRows = Array(5)
      .fill(`
      <tr class="empty">
        <td></td><td></td><td></td><td></td><td></td><td></td><td></td>
      </tr>
    `)
      .join('')

    const html = `<!DOCTYPE html>
<html lang="ka">
<head>
<meta charset="UTF-8">
<title>მომწოდებლების ნუსხა</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,sans-serif;font-size:11px;color:#111;padding:16px}
.header{text-align:center;margin-bottom:12px;padding-bottom:10px;border-bottom:2px solid #111}
.tenant{font-size:14px;font-weight:700;margin-bottom:4px}
.doc-code{font-size:9px;color:#888;margin-bottom:2px}
.doc-title{font-size:12px;font-weight:700;background:#111;color:#fff;
           display:inline-block;padding:4px 16px;border-radius:2px}
.meta{display:flex;justify-content:space-between;background:#f5f5f5;
      padding:5px 10px;border-radius:3px;margin:10px 0;font-size:10px;color:#555}
table{width:100%;border-collapse:collapse;margin-bottom:16px}
th{background:#111;color:#fff;padding:6px 8px;text-align:left;font-size:10px}
td{padding:6px 8px;border:1px solid #ddd;vertical-align:top;font-size:10px}
tr:nth-child(even):not(.empty){background:#f9f9f9}
tr.empty td{height:28px;border-color:#eee}
td:first-child{text-align:center;width:30px;color:#888}
.sigs{display:flex;gap:30px;margin-top:20px}
.sig-slot{flex:1}
.sig-line{border-bottom:1px solid #333;height:30px;margin-bottom:3px}
.sig-label{font-size:9px;color:#666}
.footer{display:flex;justify-content:space-between;margin-top:10px;
        font-size:9px;color:#999;border-top:1px solid #eee;padding-top:6px}
@media print{body{padding:8px} @page{size:A4;margin:8mm}}
</style>
</head>
<body>
<div class="header">
  ${logoHtml}
  <div class="doc-code">RS-08.1</div>
  <div class="tenant">${esc(tenantName)}</div>
  <div class="doc-title">მომწოდებელთა ნუსხა HACCP</div>
</div>
<div class="meta">
  <span>სულ მომწოდებელი: ${suppliers.length}</span>
  <span>დაბეჭდვა: ${fmtD(now)} ${fmtT(now)}</span>
</div>
<table>
  <thead>
    <tr>
      <th>№</th>
      <th>კომპანიის დასახელება</th>
      <th>საკონტაქტო პირი / თანამდებობა</th>
      <th>ტელეფონი</th>
      <th>ელ.ფოსტა</th>
      <th>მისამართი</th>
      <th>შენიშვნა</th>
    </tr>
  </thead>
  <tbody>
    ${rows}
    ${emptyRows}
  </tbody>
</table>
<div class="sigs">
  <div class="sig-slot">
    <div class="sig-line"></div>
    <div class="sig-label">შედგენილია:</div>
  </div>
  <div class="sig-slot">
    <div class="sig-line"></div>
    <div class="sig-label">თარიღი:</div>
  </div>
  <div class="sig-slot">
    <div class="sig-line"></div>
    <div class="sig-label">დამტკიცებულია:</div>
  </div>
  <div class="sig-slot">
    <div class="sig-line"></div>
    <div class="sig-label">თარიღი:</div>
  </div>
</div>
<div class="footer">
  <span>${esc(tenantName)} · RS-08.1 · მომწოდებლების ნუსხა</span>
  <span>${fmtD(now)}</span>
</div>
<script>window.onload=()=>window.print()</script>
</body>
</html>`

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('[GET /api/haccp/suppliers/pdf]', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
})
