'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, AlertTriangle, RefreshCw, Trash2, ChevronDown, ChevronUp, Pencil, X, Save } from 'lucide-react'

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'ღია', IN_PROGRESS: 'მ-ბ.', CLOSED: '✓ დახ.'
}
const STATUS_BADGES: Record<string, string> = {
  OPEN: 'badge-red', IN_PROGRESS: 'badge-orange', CLOSED: 'badge-green'
}

export default function CorrectiveActionsPage() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editItem, setEditItem] = useState<any | null>(null)

  const fetch_ = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/haccp/corrective-actions?limit=100')
      if (res.ok) setItems(await res.json())
    } catch { }
    finally { setLoading(false) }
  }

  useEffect(() => { fetch_() }, [])

  const del = async (id: string) => {
    if (!confirm('წაიშლება. დარწმუნებული?')) return
    await fetch(`/api/haccp/corrective-actions?id=${id}`, { method: 'DELETE' })
    setItems(p => p.filter(i => i.id !== id))
  }

  const saveEdit = async () => {
    if (!editItem) return
    try {
      await fetch(`/api/haccp/corrective-actions?id=${editItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: editItem.status,
          action: editItem.action,
          rootCause: editItem.rootCause,
          preventive: editItem.preventive,
          notes: editItem.notes,
        }),
      })
      await fetch_()
      setEditItem(null)
      alert('✓ განახლდა!')
    } catch { alert('შეცდ.') }
  }

  const openCount = items.filter(i => i.status === 'OPEN').length

  return (
    <div className="page">
      {editItem && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold">{editItem.reportNum} — რედ.</h2>
              <button onClick={() => setEditItem(null)} className="p-1.5 rounded hover:bg-gray-100"><X className="w-4 h-4" /></button>
            </div>
            <div className="fg">
              <label className="fl">სტატუსი</label>
              <select value={editItem.status} onChange={e => setEditItem({...editItem, status: e.target.value})} className="inp">
                <option value="OPEN">ღია</option>
                <option value="IN_PROGRESS">მიმდინარე</option>
                <option value="CLOSED">დახურული ✓</option>
              </select>
            </div>
            <div className="fg">
              <label className="fl">ქმედება *</label>
              <textarea value={editItem.action||''} onChange={e => setEditItem({...editItem, action: e.target.value})} rows={2} className="inp" />
            </div>
            <div className="fg">
              <label className="fl">მიზეზი</label>
              <textarea value={editItem.rootCause||''} onChange={e => setEditItem({...editItem, rootCause: e.target.value})} rows={2} className="inp" />
            </div>
            <div className="fg">
              <label className="fl">პრევენცია</label>
              <textarea value={editItem.preventive||''} onChange={e => setEditItem({...editItem, preventive: e.target.value})} rows={2} className="inp" />
            </div>
            <div className="fg">
              <label className="fl">შენ.</label>
              <input value={editItem.notes||''} onChange={e => setEditItem({...editItem, notes: e.target.value})} className="inp" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setEditItem(null)} className="btn-secondary flex-1">გაუქმება</button>
              <button onClick={saveEdit} className="btn-primary flex-1"><Save className="w-4 h-4" />შენახვა</button>
            </div>
          </div>
        </div>
      )}

      <div className="page-hdr">
        <div><h1 className="page-title">გადახრის ოქმი — F-006</h1><p className="page-sub">ყველა CCP გადახრა</p></div>
        <div className="flex gap-2">
          <button onClick={fetch_} className="btn-secondary btn-sm"><RefreshCw className={`w-4 h-4 ${loading?'animate-spin':''}`} /></button>
          <Link href="/corrective-actions/new" className="btn-danger btn-sm"><Plus className="w-4 h-4" />+ F-006</Link>
        </div>
      </div>

      {!loading && openCount > 0 && (
        <div className="alert-err">
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-800 font-semibold">{openCount} ღია გადახრის ოქმი — დახურვა საჭიროა!</p>
        </div>
      )}

      <div className="card p-0">
        <table className="tbl">
          <thead>
            <tr><th>ოქმი №</th><th>LOT</th><th>CCP</th><th>გადახრა</th><th>სტ.</th><th>თ.</th><th>მოქმ.</th></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-6 text-gray-400">იტვირთება...</td></tr>
            ) : !items.length ? (
              <tr><td colSpan={7} className="text-center py-6 text-gray-400">გადახრის ოქმი არ არის ✓</td></tr>
            ) : items.map(c => (
              <>
                <tr key={c.id} className="cursor-pointer hover:bg-gray-50"
                  onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}>
                  <td className="font-mono text-xs font-semibold text-blue-700">{c.reportNum}</td>
                  <td className="font-mono text-xs text-gray-600">{c.batchLot || '—'}</td>
                  <td>{c.ccpRef ? <span className="badge badge-blue">{c.ccpRef}</span> : '—'}</td>
                  <td className="text-sm text-gray-700 max-w-40 truncate">{c.deviation}</td>
                  <td><span className={`badge ${STATUS_BADGES[c.status] || 'badge-gray'}`}>{STATUS_LABELS[c.status] || c.status}</span></td>
                  <td className="text-xs text-gray-400">
                    {new Date(c.createdAt).toLocaleDateString('ka-GE', { day: '2-digit', month: '2-digit' })}
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <div className="flex gap-1 items-center">
                      <button onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-400">
                        {expandedId === c.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => setEditItem({...c})}
                        className="p-1.5 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => del(c.id)}
                        className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
                {expandedId === c.id && (
                  <tr key={`${c.id}-d`} className="bg-orange-50/40">
                    <td colSpan={7} className="px-4 py-4">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                        <div><div className="text-xs text-gray-400 mb-0.5">ოქმი №</div><div className="font-mono font-bold text-blue-700">{c.reportNum}</div></div>
                        <div><div className="text-xs text-gray-400 mb-0.5">LOT / პარტია</div><div className="font-mono">{c.batchLot || '—'}</div></div>
                        <div><div className="text-xs text-gray-400 mb-0.5">CCP</div><div>{c.ccpRef || '—'}</div></div>
                        <div><div className="text-xs text-gray-400 mb-0.5">სტატუსი</div>
                          <span className={`badge ${STATUS_BADGES[c.status]}`}>{STATUS_LABELS[c.status]}</span>
                        </div>
                        <div><div className="text-xs text-gray-400 mb-0.5">პასუხისმ.</div><div>{c.responsible || '—'}</div></div>
                        <div><div className="text-xs text-gray-400 mb-0.5">ვადა</div>
                          <div>{c.deadline ? new Date(c.deadline).toLocaleDateString('ka-GE') : '—'}</div>
                        </div>
                        <div className="col-span-3">
                          <div className="text-xs text-gray-400 mb-0.5">გადახრა</div>
                          <div className="text-red-700 font-medium">{c.deviation}</div>
                        </div>
                        {c.rootCause && <div className="col-span-3"><div className="text-xs text-gray-400 mb-0.5">მიზეზი</div><div>{c.rootCause}</div></div>}
                        {c.action && <div className="col-span-3"><div className="text-xs text-gray-400 mb-0.5">ქმედება</div><div>{c.action}</div></div>}
                        {c.preventive && <div className="col-span-3"><div className="text-xs text-gray-400 mb-0.5">პრევენცია</div><div>{c.preventive}</div></div>}
                        <div className="flex gap-4">
                          {c.isBatchHold && <span className="badge badge-orange">🔒 Hold</span>}
                          {c.isDisposed && <span className="badge badge-red">🗑 განადგ. {c.disposedKg ? `${c.disposedKg}კგ` : ''}</span>}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
