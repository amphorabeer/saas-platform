// src/app/(app)/ccp-1/page.tsx
'use client'
import Link from 'next/link'
import { Plus, ArrowLeft } from 'lucide-react'
import { CCP_LIMITS } from '@/types'

function CcpLogPage({ ccpKey }: { ccpKey: keyof typeof CCP_LIMITS }) {
  const lim = CCP_LIMITS[ccpKey]
  const mockLogs = [
    { id: '1', lot: 'SR-250326-001', ok: true, val: '74.1°C', op: 'ზ.', date: '26/03 21:00' },
    { id: '2', lot: 'SR-250325-003', ok: true, val: '74.0°C', op: 'ზ.', date: '25/03 21:00' },
    { id: '3', lot: 'SR-250324-002', ok: false, val: '73.8°C ⚠', op: 'ზ.', date: '24/03 21:00' },
  ]
  return (
    <div className="page">
      <div className="page-hdr">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="p-2 rounded-lg hover:bg-gray-100">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="page-title">{ccpKey} — {lim.nameKa}</h1>
            <p className="page-sub">{lim.nameEn} | {lim.limitKa} | {lim.form}</p>
          </div>
        </div>
        <Link href={`/${ccpKey.toLowerCase()}/new`} className="btn-primary btn-sm">
          <Plus className="w-4 h-4" />
          ახ. / New
        </Link>
      </div>
      <div className={`${false ? 'lim-err' : 'lim-ok'}`}>
        ლ. / Limit: {lim.limitKa} | {lim.limitEn}
      </div>
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
                <td>{!l.ok && <Link href={`/corrective-actions/new?ccp=${ccpKey}&lot=${l.lot}`} className="text-xs text-red-600 hover:underline">F-006 →</Link>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function CCP1Page() { return <CcpLogPage ccpKey="CCP-1" /> }
