'use client'

import Link from 'next/link'
import {
  ShieldCheck, AlertTriangle, CheckCircle,
  Thermometer, Wind, Archive, Droplets,
  Package, FlaskConical, ClipboardCheck,
  ChevronRight, TrendingUp
} from 'lucide-react'

export default function DashboardPage() {
  return (
    <div className="page">
      {/* Header */}
      <div className="page-hdr">
        <div>
          <h1 className="page-title">Dashboard — HACCP</h1>
          <p className="page-sub">
            Spare Ribs | <span suppressHydrationWarning>
              {new Date().toLocaleDateString('ka-GE', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </p>
        </div>
        <Link href="/corrective-actions/new" className="btn-danger btn-sm">
          + F-006 კ.ქ. / Corr.Act.
        </Link>
      </div>

      {/* Alert */}
      <div className="alert-warn">
        <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-orange-800">
            CCP-2 გ-ხ. / Deviation: SR-250326-002
          </p>
          <p className="text-xs text-orange-600 mt-0.5">
            95წთ &gt; 90წთ ლ. — F-006 შ. / 95min &gt; 90min limit — fill F-006
          </p>
        </div>
        <Link href="/corrective-actions/new" className="btn-sm btn-secondary text-xs flex-shrink-0">
          F-006 →
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="stat">
          <div className="stat-lbl">CCP ✓ / დღეს · Today</div>
          <div className="stat-val text-orange-600">3/4</div>
        </div>
        <div className="stat">
          <div className="stat-lbl">გ-ხ. · Deviations</div>
          <div className="stat-val text-red-600">1</div>
        </div>
        <div className="stat">
          <div className="stat-lbl">ღ. კ.ქ. · Open CA</div>
          <div className="stat-val text-red-600">1</div>
        </div>
        <div className="stat">
          <div className="stat-lbl">კ.♦ 30დ. · Compliance</div>
          <div className="stat-val text-orange-600">94.2%</div>
        </div>
      </div>

      {/* CCP Cards */}
      <div>
        <h2 className="text-sm font-semibold text-gray-600 mb-3 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          CCP სტ. / CCP Status
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {ccpCards.map(c => (
            <div
              key={c.num}
              className={`card border-l-4 ${c.ok ? 'border-l-green-500' : 'border-l-red-500'} p-4`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-[10px] font-bold text-gray-400 tracking-wider">{c.num}</div>
                  <div className="text-sm font-semibold text-gray-800 mt-0.5">
                    {c.nameKa}
                  </div>
                  <div className="text-xs text-gray-400">{c.nameEn}</div>
                  <div className="text-[10px] text-gray-400 mt-1">{c.limit}</div>
                </div>
                <span className={`badge ${c.ok ? 'badge-green' : 'badge-red'}`}>
                  {c.value}
                </span>
              </div>
              <div className="flex gap-2">
                <Link href={`/${c.slug}/new`} className="btn-primary btn-sm flex-1 text-center">
                  + ახ. / New
                </Link>
                <Link href={`/${c.slug}`} className="btn-secondary btn-sm flex-1 text-center">
                  ჟ ურ. / Log
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-sm font-semibold text-gray-600 mb-3">
          სწ. ბმ. / Quick Links
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickLinks.map(l => (
            <Link
              key={l.href}
              href={l.href}
              className={`card flex items-center gap-3 hover:border-blue-300 hover:shadow-sm transition-all p-3`}
            >
              <div className={`p-2 rounded-lg ${l.bg}`}>
                <l.icon className={`w-4 h-4 ${l.iconColor}`} />
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-800">{l.labelKa}</div>
                <div className="text-[10px] text-gray-400">{l.labelEn}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent logs */}
      <div className="card">
        <div className="card-title">
          <TrendingUp className="w-4 h-4 text-blue-600" />
          ბ. ჩ. / Recent Logs
        </div>
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th>LOT</th>
                <th>CCP</th>
                <th>სტ. / Status</th>
                <th>ოპ.</th>
                <th>თ. / Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {recentLogs.map((l, i) => (
                <tr key={i}>
                  <td><span className="font-mono text-xs text-blue-700">{l.lot}</span></td>
                  <td><span className="badge badge-blue text-xs">{l.ccp}</span></td>
                  <td>
                    <span className={`badge ${l.ok ? 'badge-green' : 'badge-red'}`}>
                      {l.ok ? '✓ კ.' : '⚠ გ-ხ.'}
                    </span>
                  </td>
                  <td className="text-xs text-gray-500">{l.op}</td>
                  <td className="text-xs text-gray-400">{l.date}</td>
                  <td>
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ---- data ----
const ccpCards = [
  { num: 'CCP-1', slug: 'ccp-1', nameKa: 'Sous-Vide — SmartVide 4', nameEn: 'Sous-Vide Thermal Treatment', limit: '≥74°C / ≥12სთ · F-001', ok: true, value: '74.1°C ✓' },
  { num: 'CCP-2', slug: 'ccp-2', nameKa: 'Blast Chilling — ყ. გ.', nameEn: 'Rapid Cooling', limit: '≤4°C / ≤90წთ · F-002', ok: false, value: '95წთ ⚠' },
  { num: 'CCP-3', slug: 'ccp-3', nameKa: 'შენახვის ტემპ.', nameEn: 'Storage Temperature', limit: 'მ.: 0–4°C | მ-ზ.: ≤-18°C · F-003', ok: true, value: '2.1°C ✓' },
  { num: 'CCP-4', slug: 'ccp-4', nameKa: 'CIP სანიტარია', nameEn: 'CIP Sanitation', limit: 'NaOH 1.5–2% | PAA 150–200ppm · F-004', ok: true, value: 'შ. ✓' },
]

const quickLinks = [
  { href: '/raw-materials/new', labelKa: 'ნ-ლ. F-005', labelEn: 'Raw Mat. F-005', icon: Package, bg: 'bg-blue-50', iconColor: 'text-blue-600' },
  { href: '/lab-tests/new', labelKa: 'Lab F-007', labelEn: 'Lab Test F-007', icon: FlaskConical, bg: 'bg-purple-50', iconColor: 'text-purple-600' },
  { href: '/corrective-actions/new', labelKa: 'კ.ქ. F-006', labelEn: 'Corr. Act. F-006', icon: AlertTriangle, bg: 'bg-red-50', iconColor: 'text-red-600' },
  { href: '/audit', labelKa: 'შ. აუდ.', labelEn: 'Audit', icon: ClipboardCheck, bg: 'bg-green-50', iconColor: 'text-green-600' },
]

const recentLogs = [
  { lot: 'SR-250326-001', ccp: 'CCP-1', ok: true, op: 'ზ.', date: '26/03 21:00' },
  { lot: 'SR-250326-002', ccp: 'CCP-2', ok: false, op: 'ზ.', date: '26/03 09:35' },
  { lot: 'SR-250326-001', ccp: 'CCP-2', ok: true, op: 'ზ.', date: '26/03 09:00' },
  { lot: 'SR-250325-003', ccp: 'CCP-1', ok: true, op: 'ზ.', date: '25/03 21:00' },
]
