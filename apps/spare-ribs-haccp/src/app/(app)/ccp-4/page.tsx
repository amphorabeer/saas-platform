'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, ArrowLeft, Trash2, RefreshCw, ChevronDown, ChevronUp, Pencil, X, Save } from 'lucide-react'
import { CCP_LIMITS } from '@/types'

export default function CCP4Page() {
  const lim = CCP_LIMITS['CCP-4']
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editLog, setEditLog] = useState<any | null>(null)

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/haccp/monitoring?ccp=CCP-4&limit=50')
      if (res.ok) setLogs(await res.json())
    } catch { }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchLogs() }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('ჩანაწერი წაიშლება. დარწმუნებული ხარ?')) return
    try {
      await fetch(`/api/haccp/monitoring?id=${id}`, { method: 'DELETE' })
      setLogs(prev => prev.filter((l: any) => l.id !== id))
    } catch { alert('წაშლა ვერ მოხდა') }
  }

  const handleSaveEdit = async () => {
    if (!editLog) return
    try {
      await fetch('/api/haccp/monitoring', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editLog.id,
          ccpNumber: 'CCP-4',
          cipEquipment: editLog.cipEquipment,
          cipNaohPct: +editLog.cipNaohPct,
          cipTempC: +editLog.cipTempC,
          cipPaaPpm: +editLog.cipPaaPpm,
          cipFinalPh: +editLog.cipFinalPh,
          notes: editLog.notes,
        }),
      })
      await fetchLogs()
      setEditLog(null)
      alert('✓ განახლდა!')
    } catch { alert('შეცდომა') }
  }

  const InRange = ({ val, min, max }: { val: number, min: number, max: number }) => {
    const ok = val != null && val >= min && val <= max
    return <span className={ok ? 'text-green-700 font-medium' : 'text-red-600 font-medium'}>{val ?? '—'}</span>
  }

  return (
    <div className="page">
      {editLog && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold">რედ. CIP — {editLog.cipEquipment}</h2>
              <button onClick={() => setEditLog(null)} className="p-1.5 rounded hover:bg-gray-100"><X className="w-4 h-4" /></button>
            </div>
            <div className="fg">
              <label className="fl">აღჭ.</label>
              <select value={editLog.cipEquipment||''} onChange={e => setEditLog({...editLog, cipEquipment: e.target.value})} className="inp">
                <option>SmartVide 4</option>
                <option>DZ260T ვაკუუმი</option>
                <option>სამუშაო ზედაპირი</option>
                <option>დანები</option>
                <option>იატაკი</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="fg">
                <label className="fl">NaOH % (1.5–2.0)</label>
                <input type="number" step="0.1" value={editLog.cipNaohPct||''}
                  onChange={e => setEditLog({...editLog, cipNaohPct: e.target.value})}
                  className={`inp ${+editLog.cipNaohPct < 1.5 || +editLog.cipNaohPct > 2.0 ? 'inp-err' : 'inp-ok'}`} />
              </div>
              <div className="fg">
                <label className="fl">ტემპ. °C (≥70)</label>
                <input type="number" step="1" value={editLog.cipTempC||''}
                  onChange={e => setEditLog({...editLog, cipTempC: e.target.value})}
                  className={`inp ${+editLog.cipTempC < 70 ? 'inp-err' : 'inp-ok'}`} />
              </div>
              <div className="fg">
                <label className="fl">PAA ppm (150–200)</label>
                <input type="number" step="1" value={editLog.cipPaaPpm||''}
                  onChange={e => setEditLog({...editLog, cipPaaPpm: e.target.value})}
                  className={`inp ${+editLog.cipPaaPpm < 150 || +editLog.cipPaaPpm > 200 ? 'inp-err' : 'inp-ok'}`} />
              </div>
              <div className="fg">
                <label className="fl">pH (6.5–7.5)</label>
                <input type="number" step="0.1" value={editLog.cipFinalPh||''}
                  onChange={e => setEditLog({...editLog, cipFinalPh: e.target.value})}
                  className={`inp ${+editLog.cipFinalPh < 6.5 || +editLog.cipFinalPh > 7.5 ? 'inp-err' : 'inp-ok'}`} />
              </div>
            </div>
            <div className="fg">
              <label className="fl">შენ.</label>
              <input value={editLog.notes||''} onChange={e => setEditLog({...editLog, notes: e.target.value})} className="inp" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setEditLog(null)} className="btn-secondary flex-1">გაუქმება</button>
              <button onClick={handleSaveEdit} className="btn-primary flex-1"><Save className="w-4 h-4" />შენახვა</button>
            </div>
          </div>
        </div>
      )}

      <div className="page-hdr">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="p-2 rounded-lg hover:bg-gray-100"><ArrowLeft className="w-4 h-4" /></Link>
          <div>
            <h1 className="page-title">CCP-4 — {lim.nameKa}</h1>
            <p className="page-sub">ლიმ.: {lim.limitKa} | {lim.form}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchLogs} className="btn-secondary btn-sm"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
          <Link href="/ccp-4/new" className="btn-primary btn-sm"><Plus className="w-4 h-4" />ახალი</Link>
        </div>
      </div>

      <div className="lim-ok">ლიმ.: {lim.limitKa}</div>

      <div className="card p-0">
        <table className="tbl">
          <thead>
            <tr><th>აღჭ.</th><th>NaOH %</th><th>ტემპ. °C</th><th>PAA ppm</th><th>pH</th><th>სტ.</th><th>ოპ.</th><th>თ.</th><th>მოქმ.</th></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="text-center py-6 text-gray-400">იტვირთება...</td></tr>
            ) : !logs.length ? (
              <tr><td colSpan={9} className="text-center py-6 text-gray-400">
                ჩანაწ. არ — <Link href="/ccp-4/new" className="text-blue-600 hover:underline">+ ახალი</Link>
              </td></tr>
            ) : logs.map((l: any) => (
              <>
                <tr key={l.id} className="cursor-pointer hover:bg-gray-50"
                  onClick={() => setExpandedId(expandedId === l.id ? null : l.id)}>
                  <td className="text-sm font-medium">{l.cipEquipment || 'CIP'}</td>
                  <td><InRange val={l.cipNaohPct} min={1.5} max={2.0} /></td>
                  <td><span className={l.cipTempC >= 70 ? 'text-green-700 font-medium' : 'text-red-600 font-medium'}>{l.cipTempC ?? '—'}°C</span></td>
                  <td><InRange val={l.cipPaaPpm} min={150} max={200} /></td>
                  <td><InRange val={l.cipFinalPh} min={6.5} max={7.5} /></td>
                  <td><span className={`badge ${l.isCompliant ? 'badge-green' : 'badge-red'}`}>{l.isCompliant ? '✓ ნორმა' : '⚠ გადახრა'}</span></td>
                  <td className="text-xs text-gray-500">{l.operator?.name || '—'}</td>
                  <td className="text-xs text-gray-400">
                    {new Date(l.loggedAt).toLocaleDateString('ka-GE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <div className="flex gap-1 items-center">
                      <button onClick={() => setExpandedId(expandedId === l.id ? null : l.id)}
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-400">
                        {expandedId === l.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => setEditLog({...l})}
                        className="p-1.5 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(l.id)}
                        className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      {!l.isCompliant && (
                        l.correctiveAction ? (
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            l.correctiveAction.status === 'CLOSED'
                              ? 'bg-green-50 text-green-600'
                              : 'bg-orange-50 text-orange-500'
                          }`}>
                            {l.correctiveAction.status === 'CLOSED' ? '✓ F-006' : '⚠ F-006'}
                          </span>
                        ) : (
                          <Link href={`/corrective-actions/new?ccp=CCP-4&lot=${l.batchLot}`}
                            className="px-2 py-1 rounded hover:bg-orange-50 text-orange-500 text-xs font-medium border border-orange-200">
                            + F-006
                          </Link>
                        )
                      )}
                    </div>
                  </td>
                </tr>
                {expandedId === l.id && (
                  <tr key={`${l.id}-d`} className="bg-blue-50/40">
                    <td colSpan={9} className="px-4 py-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div><div className="text-xs text-gray-400 mb-0.5">აღჭ.</div><div className="font-medium">{l.cipEquipment || '—'}</div></div>
                        <div><div className="text-xs text-gray-400 mb-0.5">ოპერატ.</div><div>{l.operator?.name || '—'}</div></div>
                        <div><div className="text-xs text-gray-400 mb-0.5">თარიღი</div><div>{new Date(l.loggedAt).toLocaleString('ka-GE')}</div></div>
                        <div><div className="text-xs text-gray-400 mb-0.5">სტ.</div><div><span className={`badge ${l.isCompliant ? 'badge-green' : 'badge-red'}`}>{l.isCompliant ? '✓ ნორმა' : '⚠ გადახრა'}</span></div></div>
                        <div><div className="text-xs text-gray-400 mb-0.5">NaOH % (1.5–2.0)</div><InRange val={l.cipNaohPct} min={1.5} max={2.0} /></div>
                        <div><div className="text-xs text-gray-400 mb-0.5">ტემპ. °C (≥70)</div><span className={l.cipTempC >= 70 ? 'text-green-700 font-medium' : 'text-red-600 font-medium'}>{l.cipTempC ?? '—'}°C</span></div>
                        <div><div className="text-xs text-gray-400 mb-0.5">PAA ppm (150–200)</div><InRange val={l.cipPaaPpm} min={150} max={200} /></div>
                        <div><div className="text-xs text-gray-400 mb-0.5">pH (6.5–7.5)</div><InRange val={l.cipFinalPh} min={6.5} max={7.5} /></div>
                        {l.deviation && <div className="col-span-4"><div className="text-xs text-gray-400 mb-0.5">გადახრა</div><div className="text-red-600">{l.deviation}</div></div>}
                        {l.notes && <div className="col-span-4"><div className="text-xs text-gray-400 mb-0.5">შენ.</div><div>{l.notes}</div></div>}
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
