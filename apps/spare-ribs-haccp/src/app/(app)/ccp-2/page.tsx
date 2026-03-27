'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, ArrowLeft, Trash2, RefreshCw, ChevronDown, ChevronUp, Pencil, X, Save } from 'lucide-react'
import { CCP_LIMITS } from '@/types'

export default function CCP2Page() {
  const lim = CCP_LIMITS['CCP-2']
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editLog, setEditLog] = useState<any | null>(null)

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/haccp/monitoring?ccp=CCP-2&limit=50')
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
          ccpNumber: 'CCP-2',
          bcTempInitial: +editLog.bcTempInitial,
          bcTemp30min: +editLog.bcTemp30min,
          bcTemp60min: +editLog.bcTemp60min,
          bcTempFinal: +editLog.bcTempFinal,
          bcDurationMin: +editLog.bcDurationMin,
          notes: editLog.notes,
        }),
      })
      await fetchLogs()
      setEditLog(null)
      alert('✓ განახლდა!')
    } catch { alert('შეცდომა') }
  }

  return (
    <div className="page">
      {/* რედ. მოდალი */}
      {editLog && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-800">რედაქტირება — {editLog.batchLot}</h2>
              <button onClick={() => setEditLog(null)} className="p-1.5 rounded hover:bg-gray-100"><X className="w-4 h-4" /></button>
            </div>
            <div className="fg">
              <label className="fl">SV გამოსვლა °C</label>
              <input type="number" step="0.1" value={editLog.bcTempInitial||''}
                onChange={e => setEditLog({...editLog, bcTempInitial: e.target.value})} className="inp" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="fg">
                <label className="fl">30წთ °C</label>
                <input type="number" step="0.1" value={editLog.bcTemp30min||''}
                  onChange={e => setEditLog({...editLog, bcTemp30min: e.target.value})} className="inp" />
              </div>
              <div className="fg">
                <label className="fl">60წთ °C</label>
                <input type="number" step="0.1" value={editLog.bcTemp60min||''}
                  onChange={e => setEditLog({...editLog, bcTemp60min: e.target.value})} className="inp" />
              </div>
              <div className="fg">
                <label className="fl">საბოლ. °C</label>
                <input type="number" step="0.1" value={editLog.bcTempFinal||''}
                  onChange={e => setEditLog({...editLog, bcTempFinal: e.target.value})}
                  className={`inp ${+editLog.bcTempFinal > 4 ? 'inp-err' : 'inp-ok'}`} />
              </div>
            </div>
            <div className="fg">
              <label className="fl">ხანგრძლ. (წუთი)</label>
              <input type="number" value={editLog.bcDurationMin||''}
                onChange={e => setEditLog({...editLog, bcDurationMin: e.target.value})}
                className={`inp ${+editLog.bcDurationMin > 90 ? 'inp-err' : 'inp-ok'}`} />
            </div>
            <div className="fg">
              <label className="fl">შენიშვნა</label>
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
            <h1 className="page-title">CCP-2 — {lim.nameKa}</h1>
            <p className="page-sub">ლიმიტი: {lim.limitKa} | {lim.form}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchLogs} className="btn-secondary btn-sm" title="განახლება">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link href="/ccp-2/new" className="btn-primary btn-sm">
            <Plus className="w-4 h-4" />ახალი ჩანაწერი
          </Link>
        </div>
      </div>

      <div className="lim-ok">ლიმიტი: {lim.limitKa}</div>

      <div className="card p-0">
        <table className="tbl">
          <thead>
            <tr>
              <th>LOT №</th>
              <th>საბოლ. °C</th>
              <th>ხანგრძლ.</th>
              <th>სტატუსი</th>
              <th>გადახრა</th>
              <th>ოპერატ.</th>
              <th>თარიღი</th>
              <th>მოქმ.</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-6 text-gray-400">იტვირთება...</td></tr>
            ) : !logs.length ? (
              <tr><td colSpan={8} className="text-center py-6 text-gray-400">
                ჩანაწერი არ არის — <Link href="/ccp-2/new" className="text-blue-600 hover:underline">+ ახალი</Link>
              </td></tr>
            ) : logs.map((l: any) => (
              <>
                <tr key={l.id} className="cursor-pointer hover:bg-gray-50"
                  onClick={() => setExpandedId(expandedId === l.id ? null : l.id)}>
                  <td className="font-mono text-xs text-blue-700">{l.batchLot}</td>
                  <td className={`text-sm font-medium ${l.bcTempFinal > 4 ? 'text-red-600' : 'text-green-700'}`}>
                    {l.bcTempFinal != null ? `${l.bcTempFinal}°C` : '—'}
                  </td>
                  <td className={`text-sm ${l.bcDurationMin > 90 ? 'text-red-600' : ''}`}>
                    {l.bcDurationMin ? `${l.bcDurationMin}წთ` : '—'}
                  </td>
                  <td>
                    <span className={`badge ${l.isCompliant ? 'badge-green' : 'badge-red'}`}>
                      {l.isCompliant ? '✓ ნორმა' : '⚠ გადახრა'}
                    </span>
                  </td>
                  <td className="text-xs text-red-600 max-w-32 truncate">{l.deviation || '—'}</td>
                  <td className="text-xs text-gray-500">{l.operator?.name || '—'}</td>
                  <td className="text-xs text-gray-400">
                    {new Date(l.loggedAt).toLocaleDateString('ka-GE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <div className="flex gap-1 items-center">
                      <button onClick={() => setExpandedId(expandedId === l.id ? null : l.id)}
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-400" title="დეტალები">
                        {expandedId === l.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => setEditLog({...l})}
                        className="p-1.5 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600" title="რედაქტირება">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(l.id)}
                        className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600" title="წაშლა">
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
                          <Link href={`/corrective-actions/new?ccp=CCP-2&lot=${l.batchLot}`}
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
                    <td colSpan={8} className="px-4 py-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div><div className="text-xs text-gray-400 mb-0.5">LOT №</div><div className="font-mono text-blue-700">{l.batchLot}</div></div>
                        <div><div className="text-xs text-gray-400 mb-0.5">ოპერატ.</div><div>{l.operator?.name || '—'}</div></div>
                        <div><div className="text-xs text-gray-400 mb-0.5">წონა</div><div>{l.weightKg ? `${l.weightKg}კგ` : '—'}</div></div>
                        <div><div className="text-xs text-gray-400 mb-0.5">თარიღი</div><div>{new Date(l.loggedAt).toLocaleString('ka-GE')}</div></div>
                        <div><div className="text-xs text-gray-400 mb-0.5">SV გამოსვლა</div><div>{l.bcTempInitial != null ? `${l.bcTempInitial}°C` : '—'}</div></div>
                        <div><div className="text-xs text-gray-400 mb-0.5">30 წუთი</div><div>{l.bcTemp30min != null ? `${l.bcTemp30min}°C` : '—'}</div></div>
                        <div><div className="text-xs text-gray-400 mb-0.5">60 წუთი</div><div>{l.bcTemp60min != null ? `${l.bcTemp60min}°C` : '—'}</div></div>
                        <div>
                          <div className="text-xs text-gray-400 mb-0.5">საბოლოო °C</div>
                          <div className={l.bcTempFinal > 4 ? 'text-red-600 font-medium' : 'text-green-700'}>
                            {l.bcTempFinal != null ? `${l.bcTempFinal}°C` : '—'}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-400 mb-0.5">ხანგრძლ.</div>
                          <div className={l.bcDurationMin > 90 ? 'text-red-600 font-medium' : 'text-green-700'}>
                            {l.bcDurationMin ? `${l.bcDurationMin} წუთი` : '—'}
                          </div>
                        </div>
                        {l.notes && <div className="col-span-4"><div className="text-xs text-gray-400 mb-0.5">შენიშვნა</div><div>{l.notes}</div></div>}
                        {l.deviation && <div className="col-span-4"><div className="text-xs text-gray-400 mb-0.5">გადახრა</div><div className="text-red-600">{l.deviation}</div></div>}
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
