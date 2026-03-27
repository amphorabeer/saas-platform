'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, ClipboardCheck, TrendingUp } from 'lucide-react'
import { AUDIT_CHECKLIST } from '@/types'

export default function AuditPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [auditedBy, setAuditedBy] = useState('')
  const [checked, setChecked] = useState<Record<string, boolean>>({})

  const totalItems = AUDIT_CHECKLIST.reduce((s, sec) => s + sec.items.length, 0)
  const checkedCount = Object.values(checked).filter(Boolean).length
  const pct = totalItems > 0 ? Math.round((checkedCount / totalItems) * 100) : 0

  const toggle = (key: string) => {
    setChecked(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const getRating = () => {
    if (pct >= 95) return { label: 'შ. / Excellent', color: 'text-green-700', bg: 'bg-green-100' }
    if (pct >= 85) return { label: 'კ. / Good', color: 'text-blue-700', bg: 'bg-blue-100' }
    if (pct >= 70) return { label: 'საშ. / Fair', color: 'text-orange-700', bg: 'bg-orange-100' }
    return { label: 'ვ-ი. / Poor', color: 'text-red-700', bg: 'bg-red-100' }
  }

  const save = async () => {
    if (!auditedBy) { alert('აუდ. სახ. სავ. / Auditor name required'); return }
    setSaving(true)
    try {
      await fetch('/api/haccp/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auditedById: 'demo',
          auditDate: new Date(),
          totalScore: checkedCount,
          maxScore: totalItems,
          percentage: pct,
          rating: pct >= 95 ? 'EXCELLENT' : pct >= 85 ? 'GOOD' : pct >= 70 ? 'FAIR' : 'POOR',
          checklistData: checked,
        }),
      })
      alert(`✓ აუდ. შ.! ${pct}% — ${getRating().label}`)
      router.push('/dashboard')
    } catch { alert('შ. / Error') }
    finally { setSaving(false) }
  }

  const rating = getRating()

  return (
    <div className="page max-w-2xl">
      <div className="page-hdr">
        <div>
          <h1 className="page-title">შ. აუდ. / Internal Audit</h1>
          <p className="page-sub">HACCP სისტ. შ. / System check</p>
        </div>
      </div>

      {/* Score */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <ClipboardCheck className="w-5 h-5 text-blue-600" />
            <div>
              <div className="text-sm font-semibold text-gray-800">
                {checkedCount}/{totalItems} — {pct}%
              </div>
              <div className="text-xs text-gray-400">
                სულ ქ. / Total score
              </div>
            </div>
          </div>
          <span className={`badge ${rating.bg} ${rating.color} text-sm px-3 py-1`}>
            {rating.label}
          </span>
        </div>
        {/* Progress bar */}
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              pct >= 95 ? 'bg-green-500' :
              pct >= 85 ? 'bg-blue-500' :
              pct >= 70 ? 'bg-orange-400' : 'bg-red-500'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>0%</span>
          <span className="text-orange-500">70% Fair</span>
          <span className="text-blue-500">85% Good</span>
          <span className="text-green-500">95% Excellent</span>
        </div>
      </div>

      {/* Auditor */}
      <div className="card">
        <div className="fg">
          <label className="fl">აუდ. სახ. * / Auditor name *</label>
          <input value={auditedBy} onChange={e => setAuditedBy(e.target.value)}
            placeholder="სახ. / Name" className="inp max-w-xs" />
        </div>
      </div>

      {/* Checklist */}
      <div className="card space-y-4">
        {AUDIT_CHECKLIST.map((sec, si) => (
          <div key={si}>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 pb-1.5 border-b border-gray-100">
              {sec.section}
            </div>
            <div className="space-y-1.5">
              {sec.items.map((item, ii) => {
                const key = `${si}-${ii}`
                return (
                  <label
                    key={key}
                    className="flex items-start gap-3 py-1.5 px-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={checked[key] || false}
                      onChange={() => toggle(key)}
                      className="w-4 h-4 mt-0.5 flex-shrink-0 rounded accent-blue-600"
                    />
                    <span className={`text-sm ${checked[key] ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                      {item}
                    </span>
                  </label>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Save */}
      <button onClick={save} disabled={saving} className="btn-primary w-full">
        <Save className="w-4 h-4" />
        {saving ? 'ი... / Saving...' : `აუდ. შ. ${pct}% / Save Audit`}
      </button>
    </div>
  )
}
