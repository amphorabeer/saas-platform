'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Save, AlertTriangle, Plus } from 'lucide-react'
import { genCar } from '@/types'

export default function CorrectiveActionsPage() {
  const mockCas = [
    { id: '1', num: 'CAR-2025-001', lot: 'SR-250326-002', ccp: 'CCP-2', dev: '95წთ > 90წთ', status: 'OPEN', date: '26/03/25' },
    { id: '2', num: 'CAR-2025-002', lot: 'SR-250320-001', ccp: 'CCP-1', dev: '73.8°C < 74°C', status: 'CLOSED', date: '20/03/25' },
  ]

  return (
    <div className="page">
      <div className="page-hdr">
        <div>
          <h1 className="page-title">კ. ქ. F-006 / Corrective Actions</h1>
          <p className="page-sub">ყ. CCP გ-ხ. / All CCP deviations</p>
        </div>
        <Link href="/corrective-actions/new" className="btn-danger btn-sm">
          <Plus className="w-4 h-4" />+ F-006
        </Link>
      </div>

      {mockCas.some(c => c.status === 'OPEN') && (
        <div className="alert-err">
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800 font-semibold">
            {mockCas.filter(c => c.status === 'OPEN').length} ღია კ.ქ. / open corrective action(s)
          </p>
        </div>
      )}

      <div className="card p-0">
        <table className="tbl">
          <thead>
            <tr>
              <th>ოქ. / Report</th>
              <th>LOT</th>
              <th>CCP</th>
              <th>გ-ხ. / Deviation</th>
              <th>სტ. / Status</th>
              <th>თ. / Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {mockCas.map(c => (
              <tr key={c.id}>
                <td><span className="font-mono text-xs font-semibold text-blue-700">{c.num}</span></td>
                <td><span className="font-mono text-xs text-gray-600">{c.lot}</span></td>
                <td><span className="badge badge-blue">{c.ccp}</span></td>
                <td className="text-sm text-gray-700">{c.dev}</td>
                <td>
                  <span className={`badge ${c.status === 'OPEN' ? 'badge-red' : c.status === 'IN_PROGRESS' ? 'badge-orange' : 'badge-green'}`}>
                    {c.status === 'OPEN' ? 'ღ.' : c.status === 'IN_PROGRESS' ? 'პ.ი.' : '✓ დ.'}
                  </span>
                </td>
                <td className="text-xs text-gray-400">{c.date}</td>
                <td>
                  <Link href={`/corrective-actions/${c.id}`} className="text-xs text-blue-600 hover:underline">→</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
