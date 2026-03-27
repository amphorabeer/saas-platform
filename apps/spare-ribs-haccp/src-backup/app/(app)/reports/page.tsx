'use client'

import { useState } from 'react'
import { BarChart3, Download, FileText, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react'

export default function ReportsPage() {
  const [period, setPeriod] = useState<'week' | 'month'>('month')

  const data = period === 'month' ? monthData : weekData

  return (
    <div className="page">
      <div className="page-hdr">
        <div>
          <h1 className="page-title">ანგ. / Reports</h1>
          <p className="page-sub">HACCP შ. / HACCP Summary</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setPeriod('week')}
            className={period === 'week' ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}
          >
            კვ. / Week
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={period === 'month' ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}
          >
            თვე / Month
          </button>
          <button
            className="btn-secondary btn-sm"
            onClick={() => alert('PDF ა. — @react-pdf/renderer ც. ვ. / PDF export — to be implemented')}
          >
            <Download className="w-4 h-4" />
            PDF
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="stat">
          <div className="stat-lbl">სულ ჩ. / Total logs</div>
          <div className="stat-val text-blue-700">{data.totalLogs}</div>
        </div>
        <div className="stat">
          <div className="stat-lbl">კ.♦ % / Compliance</div>
          <div className={`stat-val ${data.compliance >= 95 ? 'text-green-700' : 'text-orange-600'}`}>
            {data.compliance}%
          </div>
        </div>
        <div className="stat">
          <div className="stat-lbl">გ-ხ. / Deviations</div>
          <div className={`stat-val ${data.deviations > 0 ? 'text-red-600' : 'text-green-700'}`}>
            {data.deviations}
          </div>
        </div>
        <div className="stat">
          <div className="stat-lbl">Lab ✓</div>
          <div className={`stat-val ${data.labPass === data.labTotal ? 'text-green-700' : 'text-red-600'}`}>
            {data.labPass}/{data.labTotal}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* CCP Breakdown */}
        <div className="card">
          <div className="card-title">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            CCP შ. / CCP Breakdown
          </div>
          <div className="space-y-3">
            {data.ccpBreakdown.map(c => (
              <div key={c.num}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">{c.num} — {c.nameKa}</span>
                  <span className={`font-semibold ${c.rate >= 95 ? 'text-green-700' : c.rate >= 85 ? 'text-orange-600' : 'text-red-600'}`}>
                    {c.rate}%
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${c.rate >= 95 ? 'bg-green-500' : c.rate >= 85 ? 'bg-orange-400' : 'bg-red-500'}`}
                    style={{ width: `${c.rate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Corrective actions */}
        <div className="card">
          <div className="card-title">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            კ. ქ. შ. / CA Summary
          </div>
          <div className="space-y-2">
            {data.cas.map((ca, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 text-sm">
                <span className="font-mono text-xs text-blue-700">{ca.num}</span>
                <span className="text-gray-500 text-xs">{ca.ccp}</span>
                <span className={`badge ${
                  ca.status === 'CLOSED' ? 'badge-green' :
                  ca.status === 'IN_PROGRESS' ? 'badge-orange' : 'badge-red'
                }`}>
                  {ca.status === 'CLOSED' ? '✓ დ.' : ca.status === 'IN_PROGRESS' ? 'პ.ი.' : 'ღ.'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Document links */}
      <div className="card">
        <div className="card-title">
          <FileText className="w-4 h-4 text-blue-600" />
          HACCP დ. / Documents
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {docs.map(d => (
            <button
              key={d.label}
              onClick={() => alert(`PDF გ.: ${d.label}\nPDF export: ${d.label}`)}
              className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50/30 transition-all text-left"
            >
              <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div>
                <div className="text-xs font-semibold text-gray-700">{d.label}</div>
                <div className="text-[10px] text-gray-400">{d.sub}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ---- Data ----
const monthData = {
  totalLogs: 42, compliance: 95.2, deviations: 2,
  labPass: 4, labTotal: 4,
  ccpBreakdown: [
    { num: 'CCP-1', nameKa: 'Sous-Vide', rate: 100 },
    { num: 'CCP-2', nameKa: 'Blast Chill', rate: 90.5 },
    { num: 'CCP-3', nameKa: 'შ. ტ.', rate: 97.6 },
    { num: 'CCP-4', nameKa: 'CIP', rate: 100 },
  ],
  cas: [
    { num: 'CAR-2025-001', ccp: 'CCP-2', status: 'OPEN' },
    { num: 'CAR-2025-002', ccp: 'CCP-1', status: 'CLOSED' },
  ],
}

const weekData = {
  totalLogs: 12, compliance: 91.7, deviations: 1,
  labPass: 1, labTotal: 1,
  ccpBreakdown: [
    { num: 'CCP-1', nameKa: 'Sous-Vide', rate: 100 },
    { num: 'CCP-2', nameKa: 'Blast Chill', rate: 83.3 },
    { num: 'CCP-3', nameKa: 'შ. ტ.', rate: 100 },
    { num: 'CCP-4', nameKa: 'CIP', rate: 100 },
  ],
  cas: [
    { num: 'CAR-2025-001', ccp: 'CCP-2', status: 'OPEN' },
  ],
}

const docs = [
  { label: 'HACCP SR-001', sub: 'CCP + ფ.' },
  { label: 'GMP SR-002', sub: 'PRPs + SOP' },
  { label: 'შ. აუდ.', sub: 'Audit' },
  { label: 'ყ. ბ-კი', sub: 'All forms' },
]
