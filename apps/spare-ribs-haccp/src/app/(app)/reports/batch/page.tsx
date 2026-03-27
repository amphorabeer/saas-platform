'use client'
import { useState, useRef } from 'react'
import { ArrowLeft, Search, Printer, CheckCircle, XCircle } from 'lucide-react'
import Link from 'next/link'

export default function BatchReportPage() {
  const [partia, setPartia] = useState('')
  const [data, setData] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)

  const search = async () => {
    if (!partia.trim()) return
    setLoading(true)
    try {
      const [ccp1, ccp2, ccp3, ccp4, cas, raws] = await Promise.all([
        fetch('/api/haccp/monitoring?ccp=CCP-1&limit=100').then(r => r.json()),
        fetch('/api/haccp/monitoring?ccp=CCP-2&limit=100').then(r => r.json()),
        fetch('/api/haccp/monitoring?ccp=CCP-3&limit=100').then(r => r.json()),
        fetch('/api/haccp/monitoring?ccp=CCP-4&limit=100').then(r => r.json()),
        fetch('/api/haccp/corrective-actions?limit=100').then(r => r.json()),
        fetch('/api/haccp/raw-materials?limit=100').then(r => r.json()),
      ])

      const baseLot = partia.includes('-P') ? partia.replace(/-P\d+$/, '') : partia
      const filter = (logs: any[]) => logs.filter((l: any) =>
        l.batchLot === partia || l.batchLot?.startsWith(baseLot + '-P')
      )
      const rawMat = raws.find((r: any) => r.lotNumber === baseLot || r.lotNumber === partia)
      const caList = cas.filter((c: any) =>
        c.batchLot === partia || c.batchLot?.startsWith(baseLot + '-P')
      )
      setData({ partia, baseLot, rawMat, ccp1: filter(ccp1), ccp2: filter(ccp2), ccp3: filter(ccp3), ccp4: filter(ccp4), cas: caList })
    } catch { alert('შეცდ.') }
    finally { setLoading(false) }
  }

  const handlePrint = () => {
    const style = document.createElement('style')
    style.innerHTML = `@media print { body * { visibility: hidden; } #batch-report, #batch-report * { visibility: visible; } #batch-report { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; } .no-print { display: none !important; } @page { margin: 1.5cm; size: A4; } table { border-collapse: collapse; width: 100%; } th, td { border: 1px solid #ccc; padding: 4px 8px; font-size: 11px; } th { background: #f3f4f6; } }`
    document.head.appendChild(style)
    window.print()
    document.head.removeChild(style)
  }

  return (
    <div className="page max-w-3xl">
      <div className="page-hdr no-print">
        <div className="flex items-center gap-3">
          <Link href="/reports" className="p-2 rounded-lg hover:bg-gray-100"><ArrowLeft className="w-4 h-4" /></Link>
          <div><h1 className="page-title">პარტიის ანგარიში</h1><p className="page-sub">F-001–F-007 ბაჩის მიხედვით</p></div>
        </div>
        {data && <button onClick={handlePrint} className="btn-primary btn-sm"><Printer className="w-4 h-4" />PDF / ბეჭდვა</button>}
      </div>

      <div className="card no-print">
        <div className="flex gap-3">
          <input value={partia} onChange={e => setPartia(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()}
            placeholder="SR-260327-311-P001 ან SR-260327-311"
            className="inp flex-1" />
          <button onClick={search} disabled={loading} className="btn-primary btn-sm px-4">
            <Search className="w-4 h-4" />{loading ? '...' : 'ძებნა'}
          </button>
        </div>
      </div>

      {data && (
        <div id="batch-report" className="space-y-4">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">HACCP ბაჩ-ანგარიში</h2>
                <p className="text-sm text-gray-500">პარტია: <span className="font-mono font-bold text-blue-700">{data.partia}</span></p>
              </div>
              <div className="text-xs text-gray-400 text-right">
                <div>{new Date().toLocaleDateString('ka-GE', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                <div>Spare Ribs HACCP</div>
              </div>
            </div>
          </div>

          {/* F-005 */}
          <Section title="F-005 — ნედლეული" color="blue">
            {data.rawMat ? (
              <table className="tbl text-xs w-full">
                <thead><tr><th>LOT</th><th>მომწოდ.</th><th>წონა</th><th>ტემპ.</th><th>COA</th><th>ვეტ.</th><th>სტ.</th></tr></thead>
                <tbody>
                  <tr>
                    <td className="font-mono text-blue-700">{data.rawMat.lotNumber}</td>
                    <td>{data.rawMat.supplier}</td>
                    <td>{data.rawMat.weightKg}კგ</td>
                    <td className={data.rawMat.tempArrival <= 4 ? 'text-green-700' : 'text-red-600'}>{data.rawMat.tempArrival}°C</td>
                    <td>{data.rawMat.hasCoa ? '✓' : '✗'}</td>
                    <td>{data.rawMat.hasVetCert ? '✓' : '✗'}</td>
                    <td><span className={`badge ${data.rawMat.isAccepted ? 'badge-green' : 'badge-red'}`}>{data.rawMat.isAccepted ? 'მიღ.' : 'უარყ.'}</span></td>
                  </tr>
                </tbody>
              </table>
            ) : <p className="text-xs text-gray-400">F-005 ჩანაწ. ვ. მ.</p>}
          </Section>

          {/* F-001 CCP-1 */}
          <Section title="F-001 — CCP-1 Sous-Vide (≥74°C / ≥12სთ)" color="green">
            {data.ccp1.length ? (
              <table className="tbl text-xs w-full">
                <thead><tr><th>პარტია</th><th>დ.ტ.</th><th>შ.ტ.</th><th>ბ.ტ.</th><th>საათი</th><th>სტ.</th><th>ოპ.</th><th>თ.</th></tr></thead>
                <tbody>{data.ccp1.map((l: any) => (
                  <tr key={l.id}>
                    <td className="font-mono text-blue-700">{l.batchLot}</td>
                    <td className={l.svTempStart < 74 ? 'text-red-600' : 'text-green-700'}>{l.svTempStart}°C</td>
                    <td className={l.svTempMid < 74 ? 'text-red-600' : 'text-green-700'}>{l.svTempMid}°C</td>
                    <td className={l.svTempEnd < 74 ? 'text-red-600' : 'text-green-700'}>{l.svTempEnd}°C</td>
                    <td className={l.svHours < 12 ? 'text-red-600' : 'text-green-700'}>{l.svHours}სთ</td>
                    <td><span className={`badge ${l.isCompliant ? 'badge-green' : 'badge-red'}`}>{l.isCompliant ? '✓' : '⚠'}</span></td>
                    <td>{l.operator?.name || '—'}</td>
                    <td>{new Date(l.loggedAt).toLocaleDateString('ka-GE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                  </tr>
                ))}</tbody>
              </table>
            ) : <p className="text-xs text-gray-400">CCP-1 ჩანაწ. ვ. მ.</p>}
          </Section>

          {/* F-002 CCP-2 */}
          <Section title="F-002 — CCP-2 სწრ. გაციება (≤4°C / ≤90წთ)" color="cyan">
            {data.ccp2.length ? (
              <table className="tbl text-xs w-full">
                <thead><tr><th>პარტია</th><th>SV გამ.</th><th>30წთ</th><th>60წთ</th><th>საბ.</th><th>ხანგ.</th><th>სტ.</th></tr></thead>
                <tbody>{data.ccp2.map((l: any) => (
                  <tr key={l.id}>
                    <td className="font-mono text-blue-700">{l.batchLot}</td>
                    <td>{l.bcTempInitial != null ? `${l.bcTempInitial}°C` : '—'}</td>
                    <td>{l.bcTemp30min != null ? `${l.bcTemp30min}°C` : '—'}</td>
                    <td>{l.bcTemp60min != null ? `${l.bcTemp60min}°C` : '—'}</td>
                    <td className={l.bcTempFinal > 4 ? 'text-red-600' : 'text-green-700'}>{l.bcTempFinal != null ? `${l.bcTempFinal}°C` : '—'}</td>
                    <td className={l.bcDurationMin > 90 ? 'text-red-600' : 'text-green-700'}>{l.bcDurationMin ? `${l.bcDurationMin}წთ` : '—'}</td>
                    <td><span className={`badge ${l.isCompliant ? 'badge-green' : 'badge-red'}`}>{l.isCompliant ? '✓' : '⚠'}</span></td>
                  </tr>
                ))}</tbody>
              </table>
            ) : <p className="text-xs text-gray-400">CCP-2 ჩანაწ. ვ. მ.</p>}
          </Section>

          {/* F-003 CCP-3 */}
          <Section title="F-003 — CCP-3 შენახვა (0–4°C / ≤-18°C)" color="purple">
            {data.ccp3.length ? (
              <table className="tbl text-xs w-full">
                <thead><tr><th>პარტია</th><th>მაც.დ.</th><th>მაც.ს.</th><th>საყ.დ.</th><th>საყ.ს.</th><th>სტ.</th></tr></thead>
                <tbody>{data.ccp3.map((l: any) => (
                  <tr key={l.id}>
                    <td className="font-mono text-blue-700">{l.batchLot}</td>
                    <td className={l.fridgeTempAm < 0 || l.fridgeTempAm > 4 ? 'text-red-600' : 'text-green-700'}>{l.fridgeTempAm}°C</td>
                    <td className={l.fridgeTempPm < 0 || l.fridgeTempPm > 4 ? 'text-red-600' : 'text-green-700'}>{l.fridgeTempPm}°C</td>
                    <td className={l.freezerTempAm > -18 ? 'text-red-600' : 'text-green-700'}>{l.freezerTempAm}°C</td>
                    <td className={l.freezerTempPm > -18 ? 'text-red-600' : 'text-green-700'}>{l.freezerTempPm}°C</td>
                    <td><span className={`badge ${l.isCompliant ? 'badge-green' : 'badge-red'}`}>{l.isCompliant ? '✓' : '⚠'}</span></td>
                  </tr>
                ))}</tbody>
              </table>
            ) : <p className="text-xs text-gray-400">CCP-3 ჩანაწ. ვ. მ.</p>}
          </Section>

          {/* F-006 */}
          {data.cas.length > 0 && (
            <Section title="F-006 — გადახრის ოქმი" color="red">
              <table className="tbl text-xs w-full">
                <thead><tr><th>ოქმი №</th><th>CCP</th><th>გადახრა</th><th>ქმედება</th><th>სტ.</th></tr></thead>
                <tbody>{data.cas.map((c: any) => (
                  <tr key={c.id}>
                    <td className="font-mono text-blue-700">{c.reportNum}</td>
                    <td>{c.ccpRef}</td>
                    <td className="text-red-700">{c.deviation}</td>
                    <td>{c.action || '—'}</td>
                    <td><span className={`badge ${c.status === 'CLOSED' ? 'badge-green' : 'badge-red'}`}>{c.status === 'CLOSED' ? '✓ დახ.' : 'ღია'}</span></td>
                  </tr>
                ))}</tbody>
              </table>
            </Section>
          )}

          {/* ხელმოწ. */}
          <div className="card">
            <div className="grid grid-cols-3 gap-6 text-xs text-gray-600">
              <div><div className="font-semibold mb-6">ხარ. კონტ. სპეც.</div><div className="border-t border-gray-400 pt-1">ხელმ. / თარიღი</div></div>
              <div><div className="font-semibold mb-6">HACCP გუნდის ხელმძ.</div><div className="border-t border-gray-400 pt-1">ხელმ. / თარიღი</div></div>
              <div><div className="font-semibold mb-6">დირექტორი</div><div className="border-t border-gray-400 pt-1">ხელმ. / თარიღი</div></div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Section({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  const c: Record<string, string> = { blue: 'border-blue-400 bg-blue-50/50', green: 'border-green-400 bg-green-50/50', cyan: 'border-cyan-400 bg-cyan-50/50', purple: 'border-purple-400 bg-purple-50/50', red: 'border-red-400 bg-red-50/50' }
  return (
    <div className={`card border-l-4 ${c[color]||''}`}>
      <div className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">{title}</div>
      {children}
    </div>
  )
}
