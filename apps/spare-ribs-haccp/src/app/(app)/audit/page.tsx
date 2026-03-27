'use client'
import { useState, useEffect } from 'react'
import { Save, ClipboardCheck, History, Trash2, Pencil, X } from 'lucide-react'
import { AUDIT_CHECKLIST } from '@/types'

export default function AuditPage() {
  const [saving, setSaving] = useState(false)
  const [auditedBy, setAuditedBy] = useState('')
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [history, setHistory] = useState<any[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [loadingHist, setLoadingHist] = useState(false)
  const [tab, setTab] = useState<'new' | 'history'>('new')
  const [editItem, setEditItem] = useState<any | null>(null)

  const totalItems = AUDIT_CHECKLIST.reduce((s, sec) => s + sec.items.length, 0)
  const checkedCount = Object.values(checked).filter(Boolean).length
  const pct = totalItems > 0 ? Math.round((checkedCount / totalItems) * 100) : 0

  const toggle = (key: string) => setChecked(prev => ({ ...prev, [key]: !prev[key] }))

  const getRating = (p: number) => {
    if (p >= 95) return { label: 'შესანიშნავი', cls: 'badge-green' }
    if (p >= 85) return { label: 'კარგი', cls: 'badge-blue' }
    if (p >= 70) return { label: 'საშუალო', cls: 'badge-orange' }
    return { label: 'ვერ ჩააბარა', cls: 'badge-red' }
  }

  const fetchHistory = async () => {
    setLoadingHist(true)
    try {
      const res = await fetch('/api/haccp/audit?limit=20')
      if (res.ok) setHistory(await res.json())
    } catch { }
    finally { setLoadingHist(false) }
  }

  useEffect(() => { fetchHistory() }, [])

  const del = async (id: string) => {
    if (!confirm('წაიშლება. დარწმუნებული?')) return
    await fetch(`/api/haccp/audit?id=${id}`, { method: 'DELETE' })
    setHistory(p => p.filter(i => i.id !== id))
  }

  const saveEdit = async () => {
    if (!editItem) return
    const total = AUDIT_CHECKLIST.reduce((s, sec) => s + sec.items.length, 0)
    const checked = Object.values(editItem.checklistData || {}).filter(Boolean).length
    const pct = Math.round((checked / total) * 100)
    try {
      await fetch(`/api/haccp/audit?id=${editItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auditedByName: editItem.auditedByName,
          checklistData: editItem.checklistData,
          totalScore: checked,
          maxScore: total,
          percentage: pct,
        }),
      })
      await fetchHistory()
      setEditItem(null)
      alert(`✓ განახლდა! ${pct}%`)
    } catch { alert('შეცდ.') }
  }

  const save = async () => {
    if (!auditedBy) { alert('აუდ. სახ. სავ.'); return }
    if (checkedCount === 0) { alert('მინ. 1 პუნქტი მონიშნე!'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/haccp/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auditedById: 'demo',
          auditDate: new Date(),
          totalScore: checkedCount,
          maxScore: totalItems,
          percentage: pct,
          rating: pct>=95?'EXCELLENT':pct>=85?'GOOD':pct>=70?'FAIR':'POOR',
          checklistData: checked,
          auditedByName: auditedBy,
        }),
      })
      if (res.ok) {
        alert(`✓ აუდიტი შენახ.! ${pct}% — ${getRating(pct).label}`)
        setChecked({})
        setAuditedBy('')
        fetchHistory()
        setTab('history')
      }
    } catch { alert('შეცდ.') }
    finally { setSaving(false) }
  }

  const rating = getRating(pct)

  return (
    <div className="page max-w-2xl">
      <div className="page-hdr">
        <div><h1 className="page-title">შიდა აუდიტი</h1><p className="page-sub">HACCP სისტ. შემოწმება</p></div>
      </div>

      {/* რედ. მოდალი — სრული checklist */}
      {editItem && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl my-4 p-5 space-y-4">
            <div className="flex items-center justify-between sticky top-0 bg-white pb-3 border-b border-gray-100">
              <h2 className="text-sm font-bold">
                რედ. — {new Date(editItem.auditDate || editItem.createdAt).toLocaleDateString('ka-GE')}
              </h2>
              <button onClick={() => setEditItem(null)} className="p-1.5 rounded hover:bg-gray-100"><X className="w-4 h-4" /></button>
            </div>
            <div className="fg">
              <label className="fl">აუდიტორი</label>
              <input value={editItem.auditedByName||''} onChange={e => setEditItem({...editItem, auditedByName: e.target.value})} className="inp max-w-xs" placeholder="სახელი" />
            </div>
            <div className="space-y-4">
              {AUDIT_CHECKLIST.map((sec, si) => (
                <div key={si}>
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 pb-1.5 border-b border-gray-100">{sec.section}</div>
                  <div className="space-y-1.5">
                    {sec.items.map((item, ii) => {
                      const key = `${si}-${ii}`
                      const isChecked = !!(editItem.checklistData?.[key])
                      return (
                        <label key={key} className="flex items-start gap-3 py-1.5 px-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                          <input type="checkbox" checked={isChecked}
                            onChange={() => setEditItem({
                              ...editItem,
                              checklistData: { ...editItem.checklistData, [key]: !isChecked }
                            })}
                            className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span className={`text-sm ${isChecked ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{item}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-3 sticky bottom-0 bg-white pt-3 border-t border-gray-100">
              <button onClick={() => setEditItem(null)} className="btn-secondary flex-1">გაუქმება</button>
              <button onClick={saveEdit} className="btn-primary flex-1"><Save className="w-4 h-4" />შენახვა</button>
            </div>
          </div>
        </div>
      )}

      {/* tabs */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab('new')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab==='new' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          + ახალი აუდიტი
        </button>
        <button onClick={() => setTab('history')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${tab==='history' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          <History className="w-4 h-4" />ისტორია {history.length > 0 && `(${history.length})`}
        </button>
      </div>

      {tab === 'new' && (
        <>
          {/* progress */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <ClipboardCheck className="w-5 h-5 text-blue-600" />
                <div>
                  <div className="text-sm font-semibold">{checkedCount}/{totalItems} — {pct}%</div>
                  <div className="text-xs text-gray-400">სულ ქულა</div>
                </div>
              </div>
              <span className={`badge ${rating.cls} text-sm px-3 py-1`}>{pct > 0 ? rating.label : '—'}</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${pct>=95?'bg-green-500':pct>=85?'bg-blue-500':pct>=70?'bg-orange-400':'bg-red-500'}`}
                style={{width:`${pct}%`}} />
            </div>
          </div>

          {/* auditor */}
          <div className="card">
            <div className="fg">
              <label className="fl">აუდიტორის სახელი *</label>
              <input value={auditedBy} onChange={e=>setAuditedBy(e.target.value)}
                placeholder="სახელი" className="inp max-w-xs" />
            </div>
          </div>

          {/* checklist */}
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
                      <label key={key} className="flex items-start gap-3 py-1.5 px-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input type="checkbox" checked={checked[key]||false} onChange={()=>toggle(key)}
                          className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span className={`text-sm ${checked[key]?'text-gray-400 line-through':'text-gray-700'}`}>{item}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          <button onClick={save} disabled={saving} className="btn-primary w-full">
            <Save className="w-4 h-4" />
            {saving ? 'ინახება...' : 'აუდ. შენახვა'}
          </button>
        </>
      )}

      {tab === 'history' && (
        <div className="card p-0">
          <table className="tbl">
            <thead>
              <tr><th>თარიღი</th><th>აუდიტორი</th><th>ქულა</th><th>%</th><th>შეფ.</th><th></th></tr>
            </thead>
            <tbody>
              {loadingHist ? (
                <tr><td colSpan={5} className="text-center py-6 text-gray-400">იტვირთება...</td></tr>
              ) : !history.length ? (
                <tr><td colSpan={5} className="text-center py-6 text-gray-400">
                  აუდიტი ჯერ არ ჩატარებულა — <button onClick={() => setTab('new')} className="text-blue-600 hover:underline">+ ახალი</button>
                </td></tr>
              ) : history.map(a => {
                const r = getRating(a.percentage)
                return (
                  <tr key={a.id}>
                    <td className="text-sm">
                      {new Date(a.auditDate || a.createdAt).toLocaleDateString('ka-GE', { day:'2-digit', month:'2-digit', year:'2-digit' })}
                    </td>
                    <td className="text-sm text-gray-600">{a.auditedByName || a.auditor?.name || '—'}</td>
                    <td className="text-sm font-medium">{a.totalScore}/{a.maxScore}</td>
                    <td className="text-sm font-bold">{a.percentage}%</td>
                    <td><span className={`badge ${r.cls}`}>{r.label}</span></td>
                    <td onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <button onClick={() => setEditItem({...a})} className="p-1.5 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => del(a.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
