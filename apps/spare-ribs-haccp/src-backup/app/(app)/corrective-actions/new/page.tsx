'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Save } from 'lucide-react'
import { genCar } from '@/types'

function NewCaForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [saving, setSaving] = useState(false)

  const [reportNum] = useState(genCar)
  const [lot, setLot] = useState(params.get('lot') || '')
  const [ccp, setCcp] = useState(params.get('ccp') || 'CCP-1')
  const [deviation, setDeviation] = useState('')
  const [rootCause, setRootCause] = useState('')
  const [action, setAction] = useState('')
  const [preventive, setPreventive] = useState('')
  const [isBatchHold, setIsBatchHold] = useState(true)
  const [isDisposed, setIsDisposed] = useState(false)
  const [disposedKg, setDisposedKg] = useState('')
  const [deadline, setDeadline] = useState('')
  const [responsible, setResponsible] = useState('')

  const save = async () => {
    if (!deviation || !action || !responsible) {
      alert('გ-ხ., ქ., პ. სავ. / Deviation, Action, Responsible required')
      return
    }
    setSaving(true)
    try {
      await fetch('/api/haccp/corrective-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportNum, batchLot: lot, ccpRef: ccp,
          deviation, rootCause, action, preventive,
          isBatchHold, isDisposed,
          disposedKg: isDisposed ? +disposedKg : null,
          deadline: deadline ? new Date(deadline) : null,
          responsible,
        }),
      })
      alert(`✓ F-006 შ. / Saved! ${reportNum}`)
      router.push('/corrective-actions')
    } catch { alert('შ. / Error') }
    finally { setSaving(false) }
  }

  return (
    <div className="page max-w-xl">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="page-title">F-006 — კ. ქ. / Corrective Action</h1>
          <p className="page-sub">{reportNum}</p>
        </div>
      </div>

      <div className="alert-err">
        <span className="text-sm font-semibold text-red-800">
          ⚠ CCP გ-ხ. / Deviation — F-006 სავ. / Required
        </span>
      </div>

      <div className="card space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="fg">
            <label className="fl">LOT №</label>
            <input value={lot} onChange={e => setLot(e.target.value)} className="inp" />
          </div>
          <div className="fg">
            <label className="fl">CCP</label>
            <select value={ccp} onChange={e => setCcp(e.target.value)} className="inp">
              <option>CCP-1</option><option>CCP-2</option>
              <option>CCP-3</option><option>CCP-4</option>
            </select>
          </div>
        </div>

        <div className="fg">
          <label className="fl">გ-ხ. * / Deviation *</label>
          <textarea value={deviation} onChange={e => setDeviation(e.target.value)}
            rows={2} placeholder="გ-ხ. / Describe deviation..." className="inp" />
        </div>

        <div className="fg">
          <label className="fl">მ. / Root Cause</label>
          <textarea value={rootCause} onChange={e => setRootCause(e.target.value)}
            rows={2} placeholder="მ. / Root cause..." className="inp" />
        </div>

        <div className="fg">
          <label className="fl">ქ. * / Action Taken *</label>
          <textarea value={action} onChange={e => setAction(e.target.value)}
            rows={2} placeholder="ქ. / Action taken..." className="inp" />
        </div>

        <div className="fg">
          <label className="fl">პ.ქ. / Preventive Action</label>
          <textarea value={preventive} onChange={e => setPreventive(e.target.value)}
            rows={2} placeholder="მ. ა. / Prevention..." className="inp" />
        </div>

        <div className="flex gap-6 flex-wrap">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={isBatchHold}
              onChange={e => setIsBatchHold(e.target.checked)} className="w-4 h-4" />
            პ. Hold / Batch Hold
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={isDisposed}
              onChange={e => setIsDisposed(e.target.checked)} className="w-4 h-4" />
            განად. / Disposed
          </label>
          {isDisposed && (
            <div className="fg w-28">
              <label className="fl">კგ / kg</label>
              <input type="number" step="0.1" value={disposedKg}
                onChange={e => setDisposedKg(e.target.value)} className="inp" />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="fg">
            <label className="fl">ვ. / Deadline</label>
            <input type="date" value={deadline}
              onChange={e => setDeadline(e.target.value)} className="inp" />
          </div>
          <div className="fg">
            <label className="fl">პ. * / Responsible *</label>
            <input value={responsible} onChange={e => setResponsible(e.target.value)}
              placeholder="სახ. / Name" className="inp" />
          </div>
        </div>

        <button onClick={save} disabled={saving} className="btn-danger w-full">
          <Save className="w-4 h-4" />
          {saving ? 'ი... / Saving...' : 'F-006 შ. / Save Report'}
        </button>
      </div>
    </div>
  )
}

export default function Page() {
  return <Suspense fallback={<div className="page">ი... / Loading...</div>}><NewCaForm /></Suspense>
}
