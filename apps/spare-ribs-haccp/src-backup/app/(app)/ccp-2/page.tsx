'use client'
import Link from 'next/link'
import { Plus, ArrowLeft } from 'lucide-react'
import { CCP_LIMITS } from '@/types'

export default function CCP2Page() {
  const lim = CCP_LIMITS['CCP-2']
  const mockLogs = [
    { id: '1', lot: 'SR-250326-001', ok: true, val: '3.2°C / 82წთ', op: 'ზ.', date: '26/03' },
    { id: '2', lot: 'SR-250326-002', ok: false, val: '3.8°C / 95წთ ⚠', op: 'ზ.', date: '26/03' },
  ]
  return (
    <div className="page">
      <div className="page-hdr">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="p-2 rounded-lg hover:bg-gray-100"><ArrowLeft className="w-4 h-4" /></Link>
          <div>
            <h1 className="page-title">CCP-2 — {lim.nameKa}</h1>
            <p className="page-sub">{lim.nameEn} | {lim.limitKa} | {lim.form}</p>
          </div>
        </div>
        <Link href="/ccp-2/new" className="btn-primary btn-sm"><Plus className="w-4 h-4" />ახ. / New</Link>
      </div>
      <div className="lim-ok">ლ. / Limit: {lim.limitKa} | {lim.limitEn}</div>
      <div className="card p-0">
        <table className="tbl">
          <thead><tr><th>LOT</th><th>შ. / Result</th><th>სტ. / Status</th><th>ოპ.</th><th>თ. / Date</th><th></th></tr></thead>
          <tbody>
            {mockLogs.map(l => (
              <tr key={l.id}>
                <td><span className="font-mono text-xs text-blue-700">{l.lot}</span></td>
                <td className="text-sm">{l.val}</td>
                <td><span className={`badge ${l.ok ? 'badge-green' : 'badge-red'}`}>{l.ok ? '✓ კ.' : '⚠ გ-ხ.'}</span></td>
                <td className="text-xs text-gray-500">{l.op}</td>
                <td className="text-xs text-gray-400">{l.date}</td>
                <td>{!l.ok && <Link href={`/corrective-actions/new?ccp=CCP-2&lot=${l.lot}`} className="text-xs text-red-600 hover:underline">F-006 →</Link>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
