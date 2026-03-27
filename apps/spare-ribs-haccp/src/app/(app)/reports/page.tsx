'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Download, FileText, TrendingUp, AlertTriangle, RefreshCw, ClipboardList } from 'lucide-react'

type Stats = {
  totalLogs: number
  compliance: number
  deviations: number
  labPass: number
  labTotal: number
  ccpBreakdown: { num: string; nameKa: string; total: number; compliant: number; rate: number }[]
  cas: { reportNum: string; ccpRef: string; status: string }[]
  rawMaterials: number
}

export default function ReportsPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = async () => {
    setLoading(true)
    try {
      const [monRes, caRes, labRes, rawRes] = await Promise.all([
        fetch('/api/haccp/monitoring?limit=500'),
        fetch('/api/haccp/corrective-actions?limit=100'),
        fetch('/api/haccp/lab-tests?limit=100'),
        fetch('/api/haccp/raw-materials?limit=100'),
      ])

      const logs = monRes.ok ? await monRes.json() : []
      const cas = caRes.ok ? await caRes.json() : []
      const labs = labRes.ok ? await labRes.json() : []
      const raws = rawRes.ok ? await rawRes.json() : []

      const totalLogs = logs.length
      const compliantLogs = logs.filter((l: any) => l.isCompliant).length
      const compliance = totalLogs > 0 ? Math.round((compliantLogs / totalLogs) * 1000) / 10 : 0
      const deviations = logs.filter((l: any) => !l.isCompliant).length

      const labPass = labs.filter((l: any) => l.overallPass).length
      const labTotal = labs.length

      const ccpNames: Record<string, string> = {
        'CCP-1': 'Sous-Vide',
        'CCP-2': 'სწრ. გაციება',
        'CCP-3': 'შენახვა',
        'CCP-4': 'CIP',
      }

      const ccpBreakdown = ['CCP-1', 'CCP-2', 'CCP-3', 'CCP-4'].map(num => {
        const ccpLogs = logs.filter((l: any) => l.ccpNumber === num)
        const total = ccpLogs.length
        const compliant = ccpLogs.filter((l: any) => l.isCompliant).length
        const rate = total > 0 ? Math.round((compliant / total) * 1000) / 10 : 100
        return { num, nameKa: ccpNames[num], total, compliant, rate }
      })

      setStats({
        totalLogs,
        compliance,
        deviations,
        labPass,
        labTotal,
        ccpBreakdown,
        cas: cas.slice(0, 5),
        rawMaterials: raws.length,
      })
    } catch { }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchStats() }, [])

  const handlePdf = () => {
    const style = document.createElement('style')
    style.innerHTML = `
      @media print {
        body * { visibility: hidden; }
        #report-content, #report-content * { visibility: visible; }
        #report-content { position: absolute; left: 0; top: 0; width: 100%; }
        .no-print { display: none !important; }
        @page { margin: 1cm; size: A4; }
      }
    `
    document.head.appendChild(style)
    window.print()
    document.head.removeChild(style)
  }

  const getRateColor = (rate: number) =>
    rate >= 95 ? 'text-green-700' : rate >= 85 ? 'text-orange-600' : 'text-red-600'
  const getRateBg = (rate: number) =>
    rate >= 95 ? 'bg-green-500' : rate >= 85 ? 'bg-orange-400' : 'bg-red-500'

  return (
    <div className="page">
      <div className="page-hdr">
        <div><h1 className="page-title">ანგარიშები</h1><p className="page-sub">HACCP შეჯამება — DB-დან</p></div>
        <div className="flex gap-2">
          <button onClick={fetchStats} className="btn-secondary btn-sm">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button className="btn-secondary btn-sm" onClick={handlePdf}><Download className="w-4 h-4" />PDF</button>
        </div>
      </div>

      <div id="report-content">
      {loading ? (
        <div className="text-center py-12 text-gray-400">იტვირთება...</div>
      ) : stats ? (
        <>
          {/* PDF Header */}
          <div className="hidden print:block mb-4 pb-3 border-b-2 border-gray-800">
            <h1 className="text-xl font-bold">Spare Ribs — HACCP ანგარიში</h1>
            <p className="text-sm text-gray-600">{new Date().toLocaleDateString('ka-GE', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="stat">
              <div className="stat-lbl">სულ ჩანაწ.</div>
              <div className="stat-val text-blue-700">{stats.totalLogs}</div>
            </div>
            <div className="stat">
              <div className="stat-lbl">შესაბამ. %</div>
              <div className={`stat-val ${stats.compliance >= 95 ? 'text-green-700' : 'text-orange-600'}`}>
                {stats.compliance}%
              </div>
            </div>
            <div className="stat">
              <div className="stat-lbl">გადახრა</div>
              <div className={`stat-val ${stats.deviations > 0 ? 'text-red-600' : 'text-green-700'}`}>
                {stats.deviations}
              </div>
            </div>
            <div className="stat">
              <div className="stat-lbl">Lab ✓</div>
              <div className={`stat-val ${stats.labPass === stats.labTotal && stats.labTotal > 0 ? 'text-green-700' : 'text-orange-600'}`}>
                {stats.labTotal > 0 ? `${stats.labPass}/${stats.labTotal}` : '—'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* CCP */}
            <div className="card">
              <div className="card-title"><TrendingUp className="w-4 h-4 text-blue-600" />CCP შეჯამება</div>
              <div className="space-y-3">
                {stats.ccpBreakdown.map(c => (
                  <div key={c.num}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{c.num} — {c.nameKa}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">{c.compliant}/{c.total}</span>
                        <span className={`font-semibold ${getRateColor(c.rate)}`}>
                          {c.total > 0 ? `${c.rate}%` : '—'}
                        </span>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${getRateBg(c.rate)}`}
                        style={{ width: `${c.total > 0 ? c.rate : 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* F-006 */}
            <div className="card">
              <div className="card-title"><AlertTriangle className="w-4 h-4 text-orange-500" />გადახრის ოქმები</div>
              {stats.cas.length === 0 ? (
                <p className="text-sm text-green-600">✓ გადახრის ოქმი არ არის</p>
              ) : (
                <div className="space-y-2">
                  {stats.cas.map((ca, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 text-sm">
                      <span className="font-mono text-xs text-blue-700">{ca.reportNum}</span>
                      <span className="text-gray-500 text-xs">{ca.ccpRef || '—'}</span>
                      <span className={`badge ${ca.status === 'CLOSED' ? 'badge-green' : ca.status === 'IN_PROGRESS' ? 'badge-orange' : 'badge-red'}`}>
                        {ca.status === 'CLOSED' ? '✓ დახ.' : ca.status === 'IN_PROGRESS' ? 'მ-ბ.' : 'ღია'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ბაჩ-ანგარიში */}
          <div className="card">
            <div className="card-title"><ClipboardList className="w-4 h-4 text-blue-600" />პარტიის ანგარიში</div>
            <p className="text-xs text-gray-500 mb-3">ბაჩის მიხედვით — F-001–F-007 სრული ისტ.</p>
            <Link href="/reports/batch" className="btn-primary btn-sm inline-flex">
              <ClipboardList className="w-4 h-4" />პარტია → PDF
            </Link>
          </div>

          {/* ნედლეული */}
          <div className="card">
            <div className="card-title"><FileText className="w-4 h-4 text-blue-600" />სტატისტიკა</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-700">{stats.rawMaterials}</div>
                <div className="text-xs text-gray-500 mt-1">F-005 LOT</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-700">{stats.totalLogs}</div>
                <div className="text-xs text-gray-500 mt-1">CCP ჩანაწ.</div>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{stats.deviations}</div>
                <div className="text-xs text-gray-500 mt-1">გადახრა</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-700">{stats.labTotal}</div>
                <div className="text-xs text-gray-500 mt-1">Lab ტესტი</div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-12 text-gray-400">მონაცემები ვ. მ.</div>
      )}
    </div>
      </div>
  )
}
