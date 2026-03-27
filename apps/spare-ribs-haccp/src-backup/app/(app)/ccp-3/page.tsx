'use client'
import Link from 'next/link'
import { Plus, ArrowLeft } from 'lucide-react'
import { CCP_LIMITS } from '@/types'

export default function CCP3Page() {
  const lim = CCP_LIMITS['CCP-3']
  const mockLogs = [
    { id: '1', lot: '26/03', ok: true, val: 'მ.: 2.1°C | მ-ზ.: -19.2°C', op: 'ზ.', date: '26/03' },
    { id: '2', lot: '25/03', ok: true, val: 'მ.: 2.3°C | მ-ზ.: -18.9°C', op: 'ზ.', date: '25/03' },
  ]
  return (
    <div className="page">
      <div className="page-hdr">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="p-2 rounded-lg hover:bg-gray-100"><ArrowLeft className="w-4 h-4" /></Link>
          <div>
            <h1 className="page-title">CCP-3 — {lim.nameKa}</h1>
            <p className="page-sub">{lim.nameEn} | {lim.form}</p>
          </div>
        </div>
        <Link href="/ccp-3/new" className="btn-primary btn-sm"><Plus className="w-4 h-4" />ახ. / New</Link>
      </div>
      <div className="lim-ok">ლ. / Limit: {lim.limitKa}</div>
      <div className="card p-0">
        <table className="tbl">
          <thead><tr><th>თ. / Date</th><th>შ. / Result</th><th>სტ.</th><th>ოპ.</th></tr></thead>
          <tbody>
            {mockLogs.map(l => (
              <tr key={l.id}>
                <td className="font-mono text-xs text-blue-700">{l.lot}</td>
                <td className="text-sm">{l.val}</td>
                <td><span className={`badge ${l.ok ? 'badge-green' : 'badge-red'}`}>{l.ok ? '✓' : '⚠'}</span></td>
                <td className="text-xs text-gray-500">{l.op}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
