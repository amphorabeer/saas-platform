// src/app/(app)/lab-tests/page.tsx
'use client'
import Link from 'next/link'
import { Plus } from 'lucide-react'
export default function LabTestsPage() {
  const mock = [
    { id:'1', lot:'SR-250320-001', lab:'ქ.ლ.', tvc:1200, ecoli:0, salm:false, list:false, ok:true, date:'20/03' },
    { id:'2', lot:'SR-250306-002', lab:'ქ.ლ.', tvc:800, ecoli:0, salm:false, list:false, ok:true, date:'06/03' },
  ]
  return (
    <div className="page">
      <div className="page-hdr">
        <div><h1 className="page-title">Lab F-007</h1><p className="page-sub">მიკრობ. / Microbiological</p></div>
        <Link href="/lab-tests/new" className="btn-primary btn-sm"><Plus className="w-4 h-4" />ახ.</Link>
      </div>
      <div className="lim-ok">ლ.: TVC ≤100k | E.coli ≤10 | Salm./List. 0/25გ</div>
      <div className="card p-0">
        <table className="tbl">
          <thead><tr><th>LOT</th><th>ლ. / Lab</th><th>TVC</th><th>E.coli</th><th>Salm.</th><th>List.</th><th>სტ.</th><th>თ.</th></tr></thead>
          <tbody>{mock.map(t=>(
            <tr key={t.id}>
              <td className="font-mono text-xs text-blue-700">{t.lot}</td>
              <td className="text-xs text-gray-500">{t.lab}</td>
              <td className={t.tvc>100000?'text-red-600 font-medium':''}>{t.tvc.toLocaleString()}</td>
              <td className={t.ecoli>10?'text-red-600':''}>{t.ecoli}</td>
              <td><span className={`badge ${!t.salm?'badge-green':'badge-red'}`}>{t.salm?'გ-ვლ!':'—'}</span></td>
              <td><span className={`badge ${!t.list?'badge-green':'badge-red'}`}>{t.list?'გ-ვლ!':'—'}</span></td>
              <td><span className={`badge ${t.ok?'badge-green':'badge-red'}`}>{t.ok?'✓ OK':'✗ FAIL'}</span></td>
              <td className="text-xs text-gray-400">{t.date}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  )
}
