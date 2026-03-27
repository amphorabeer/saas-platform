'use client'
import Link from 'next/link'
import { Plus, ArrowLeft } from 'lucide-react'
import { CCP_LIMITS } from '@/types'

export default function CCP4Page() {
  const lim = CCP_LIMITS['CCP-4']
  const mockLogs = [
    { id: '1', lot: 'SmartVide 4', ok: true, val: 'NaOH: 1.8% | PAA: 180ppm | pH: 7.1', op: 'ზ.', date: '26/03' },
    { id: '2', lot: 'სამ. ზ.', ok: true, val: 'NaOH: 1.7% | PAA: 175ppm | pH: 7.0', op: 'ზ.', date: '26/03' },
  ]
  return (
    <div className="page">
      <div className="page-hdr">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="p-2 rounded-lg hover:bg-gray-100"><ArrowLeft className="w-4 h-4" /></Link>
          <div>
            <h1 className="page-title">CCP-4 — {lim.nameKa}</h1>
            <p className="page-sub">{lim.nameEn} | {lim.form}</p>
          </div>
        </div>
        <Link href="/ccp-4/new" className="btn-primary btn-sm"><Plus className="w-4 h-4" />ახ. / New</Link>
      </div>
      <div className="lim-ok">ლ. / Limit: {lim.limitKa}</div>
      <div className="card p-0">
        <table className="tbl">
          <thead><tr><th>ობ. / Equip.</th><th>შ. / Result</th><th>სტ.</th><th>ოპ.</th><th>თ.</th></tr></thead>
          <tbody>
            {mockLogs.map(l => (
              <tr key={l.id}>
                <td className="text-sm font-medium">{l.lot}</td>
                <td className="text-sm">{l.val}</td>
                <td><span className={`badge ${l.ok ? 'badge-green' : 'badge-red'}`}>{l.ok ? '✓' : '⚠'}</span></td>
                <td className="text-xs text-gray-500">{l.op}</td>
                <td className="text-xs text-gray-400">{l.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
