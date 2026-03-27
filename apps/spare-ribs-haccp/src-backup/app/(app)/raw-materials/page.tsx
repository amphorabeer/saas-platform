// src/app/(app)/raw-materials/page.tsx
'use client'
import Link from 'next/link'
import { Plus } from 'lucide-react'

export default function RawMaterialsPage() {
  const mock = [
    { id:'1', lot:'SR-250326-001', sup:'გლდ. ბ.', kg:8.5, temp:2.2, coa:true, vet:true, ok:true, date:'26/03' },
    { id:'2', lot:'SR-250325-002', sup:'ბ. ბ.', kg:5.0, temp:1.8, coa:true, vet:true, ok:true, date:'25/03' },
  ]
  return (
    <div className="page">
      <div className="page-hdr">
        <div><h1 className="page-title">ნ-ლ. F-005 / Raw Materials</h1><p className="page-sub">LOT კ. / LOT control</p></div>
        <Link href="/raw-materials/new" className="btn-primary btn-sm"><Plus className="w-4 h-4" />ახ.</Link>
      </div>
      <div className="lim-ok">ლ.: ≤4°C | COA + ვეტ. სერ. / Vet cert required</div>
      <div className="card p-0">
        <table className="tbl">
          <thead><tr><th>LOT</th><th>მომ. / Supplier</th><th>კგ</th><th>ტ. °C</th><th>COA</th><th>ვეტ.</th><th>სტ.</th><th>თ.</th></tr></thead>
          <tbody>{mock.map(r=>(
            <tr key={r.id}>
              <td className="font-mono text-xs text-blue-700">{r.lot}</td>
              <td className="text-sm">{r.sup}</td>
              <td>{r.kg}კგ</td>
              <td className={r.temp<=4?'text-green-700 font-medium':'text-red-600 font-medium'}>{r.temp}°C</td>
              <td><span className={`badge ${r.coa?'badge-green':'badge-red'}`}>{r.coa?'✓':'✗'}</span></td>
              <td><span className={`badge ${r.vet?'badge-green':'badge-red'}`}>{r.vet?'✓':'✗'}</span></td>
              <td><span className={`badge ${r.ok?'badge-green':'badge-red'}`}>{r.ok?'მ. / Acc.':'უ. / Rej.'}</span></td>
              <td className="text-xs text-gray-400">{r.date}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  )
}
