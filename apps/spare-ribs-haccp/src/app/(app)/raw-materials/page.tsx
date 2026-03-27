'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, RefreshCw, Trash2, ChevronDown, ChevronUp, Pencil, X, Save } from 'lucide-react'

export default function RawMaterialsPage() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editItem, setEditItem] = useState<any | null>(null)
  const [history, setHistory] = useState<{ [lotNumber: string]: any[] }>({})

  const fetch_ = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/haccp/raw-materials?limit=100')
      if (res.ok) setItems(await res.json())
    } catch { }
    finally { setLoading(false) }
  }

  useEffect(() => { fetch_() }, [])

  const fetchHistory = async (lotNumber: string) => {
    if (history[lotNumber]) return
    try {
      const res = await fetch(`/api/haccp/monitoring?ccp=CCP-1&limit=100`)
      if (res.ok) {
        const logs = await res.json()
        // პარტია SR-XXXX-P001 ან პირდ. LOT SR-XXXX
        const lotLogs = logs.filter((l: any) => 
          l.batchLot === lotNumber || 
          l.batchLot?.startsWith(lotNumber + '-P')
        )
        setHistory(prev => ({ ...prev, [lotNumber]: lotLogs }))
      }
    } catch { }
  }

  const handleExpand = (item: any) => {
    const newId = expandedId === item.id ? null : item.id
    setExpandedId(newId)
    if (newId) fetchHistory(item.lotNumber)
  }

  const del = async (id: string) => {
    if (!confirm('წაიშლება. დარწმუნებული?')) return
    await fetch(`/api/haccp/raw-materials?id=${id}`, { method: 'DELETE' })
    setItems(p => p.filter(i => i.id !== id))
  }

  const saveEdit = async () => {
    if (!editItem) return
    try {
      await fetch(`/api/haccp/raw-materials?id=${editItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplier: editItem.supplier,
          weightKg: +editItem.weightKg,
          tempArrival: +editItem.tempArrival,
          notes: editItem.notes,
        }),
      })
      await fetch_()
      setEditItem(null)
      alert('✓ განახლდა!')
    } catch { alert('შეცდ.') }
  }

  const getRemainingPct = (item: any) => {
    const rem = item.remainingKg ?? item.weightKg
    return Math.round((rem / item.weightKg) * 100)
  }

  return (
    <div className="page">
      {/* რედ. მოდალი */}
      {editItem && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold">რედ. — {editItem.lotNumber}</h2>
              <button onClick={() => setEditItem(null)} className="p-1.5 rounded hover:bg-gray-100"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="fg">
                <label className="fl">მომწოდ.</label>
                <input value={editItem.supplier} onChange={e => setEditItem({...editItem, supplier: e.target.value})} className="inp" />
              </div>
              <div className="fg">
                <label className="fl">სულ კგ</label>
                <input type="number" step="0.1" value={editItem.weightKg} onChange={e => setEditItem({...editItem, weightKg: e.target.value})} className="inp" />
              </div>
              <div className="fg">
                <label className="fl">ტემპ. °C</label>
                <input type="number" step="0.1" value={editItem.tempArrival} onChange={e => setEditItem({...editItem, tempArrival: e.target.value})}
                  className={`inp ${+editItem.tempArrival > 4 ? 'inp-err' : 'inp-ok'}`} />
              </div>
              <div className="fg">
                <label className="fl">შენ.</label>
                <input value={editItem.notes||''} onChange={e => setEditItem({...editItem, notes: e.target.value})} className="inp" />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setEditItem(null)} className="btn-secondary flex-1">გაუქმება</button>
              <button onClick={saveEdit} className="btn-primary flex-1"><Save className="w-4 h-4" />შენახვა</button>
            </div>
          </div>
        </div>
      )}

      <div className="page-hdr">
        <div><h1 className="page-title">ნედლეული — F-005</h1><p className="page-sub">LOT კონტროლი + მოძრაობა</p></div>
        <div className="flex gap-2">
          <button onClick={fetch_} className="btn-secondary btn-sm"><RefreshCw className={`w-4 h-4 ${loading?'animate-spin':''}`} /></button>
          <Link href="/raw-materials/new" className="btn-primary btn-sm"><Plus className="w-4 h-4" />ახალი</Link>
        </div>
      </div>

      <div className="lim-ok">ლიმ.: ≤4°C | COA + ვეტ. სერტ. სავალდებულო</div>

      <div className="card p-0">
        <table className="tbl">
          <thead>
            <tr>
              <th>LOT №</th>
              <th>მომწოდ.</th>
              <th>სულ კგ</th>
              <th>დარჩ. კგ</th>
              <th>გამოყ. %</th>
              <th>ტემპ.</th>
              <th>COA</th>
              <th>ვეტ.</th>
              <th>სტ.</th>
              <th>თ.</th>
              <th>მოქმ.</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={11} className="text-center py-6 text-gray-400">იტვირთება...</td></tr>
            ) : !items.length ? (
              <tr><td colSpan={11} className="text-center py-6 text-gray-400">
                ჩანაწ. არ — <Link href="/raw-materials/new" className="text-blue-600 hover:underline">+ ახალი</Link>
              </td></tr>
            ) : items.map(r => {
              const remaining = r.remainingKg ?? r.weightKg
              const pct = getRemainingPct(r)
              const isEmpty = remaining <= 0
              return (
                <>
                  <tr key={r.id} className={`cursor-pointer hover:bg-gray-50 ${isEmpty ? 'opacity-60' : ''}`}
                    onClick={() => handleExpand(r)}>
                    <td className="font-mono text-xs text-blue-700">{r.lotNumber}</td>
                    <td className="text-sm">{r.supplier}</td>
                    <td className="text-sm font-medium">{r.weightKg}კგ</td>
                    <td>
                      <span className={`font-medium text-sm ${isEmpty ? 'text-red-600' : remaining < r.weightKg * 0.2 ? 'text-orange-600' : 'text-green-700'}`}>
                        {remaining.toFixed(1)}კგ
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${pct > 50 ? 'bg-green-500' : pct > 20 ? 'bg-orange-400' : 'bg-red-500'}`}
                            style={{ width: `${100 - pct}%` }} />
                        </div>
                        <span className="text-xs text-gray-500">{100-pct}%</span>
                      </div>
                    </td>
                    <td className={r.tempArrival<=4?'text-green-700 font-medium':'text-red-600 font-medium'}>{r.tempArrival}°C</td>
                    <td><span className={`badge ${r.hasCoa?'badge-green':'badge-red'}`}>{r.hasCoa?'✓':'✗'}</span></td>
                    <td><span className={`badge ${r.hasVetCert?'badge-green':'badge-red'}`}>{r.hasVetCert?'✓':'✗'}</span></td>
                    <td>
                      <span className={`badge ${isEmpty?'badge-gray':r.isAccepted?'badge-green':'badge-red'}`}>
                        {isEmpty ? 'ამოიწ.' : r.isAccepted ? 'მიღ.' : 'უარყ.'}
                      </span>
                    </td>
                    <td className="text-xs text-gray-400">
                      {new Date(r.receivedAt).toLocaleDateString('ka-GE', { day: '2-digit', month: '2-digit' })}
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1 items-center">
                        <button onClick={() => handleExpand(r)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400">
                          {expandedId === r.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={() => setEditItem({...r})} className="p-1.5 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => del(r.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedId === r.id && (
                    <tr key={`${r.id}-d`} className="bg-blue-50/40">
                      <td colSpan={11} className="px-4 py-4">
                        {/* დეტალები */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-4">
                          <div><div className="text-xs text-gray-400 mb-0.5">LOT №</div><div className="font-mono text-blue-700">{r.lotNumber}</div></div>
                          <div><div className="text-xs text-gray-400 mb-0.5">მომწოდ.</div><div>{r.supplier}</div></div>
                          <div><div className="text-xs text-gray-400 mb-0.5">სულ კგ</div><div className="font-medium">{r.weightKg}კგ</div></div>
                          <div>
                            <div className="text-xs text-gray-400 mb-0.5">დარჩ. კგ</div>
                            <div className={`font-medium ${isEmpty ? 'text-red-600' : 'text-green-700'}`}>{remaining.toFixed(1)}კგ</div>
                          </div>
                          <div><div className="text-xs text-gray-400 mb-0.5">ტემპ.</div><div className={r.tempArrival<=4?'text-green-700':'text-red-600'}>{r.tempArrival}°C</div></div>
                          <div><div className="text-xs text-gray-400 mb-0.5">ვეტ. სერტ. №</div><div>{r.vetCertNum || '—'}</div></div>
                          <div><div className="text-xs text-gray-400 mb-0.5">მიღ. თ.</div><div>{new Date(r.receivedAt).toLocaleString('ka-GE')}</div></div>
                          {r.notes && <div className="col-span-2"><div className="text-xs text-gray-400 mb-0.5">შენ.</div><div>{r.notes}</div></div>}
                        </div>

                        {/* მოძრაობის ისტ. */}
                        <div>
                          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                            მოძრაობის ისტ. — CCP-1
                          </div>
                          {!history[r.lotNumber] ? (
                            <div className="text-xs text-gray-400">იტვირთება...</div>
                          ) : history[r.lotNumber].length === 0 ? (
                            <div className="text-xs text-gray-400">CCP-1 ჩანაწ. არ არის</div>
                          ) : (
                            <table className="tbl text-xs">
                              <thead>
                                <tr><th>LOT</th><th>კგ</th><th>სტ.</th><th>ოპ.</th><th>თ.</th></tr>
                              </thead>
                              <tbody>
                                {history[r.lotNumber].map((l: any) => (
                                  <tr key={l.id}>
                                    <td className="font-mono text-blue-700">{l.batchLot}</td>
                                    <td className="font-medium text-orange-600">-{l.weightKg || '?'}კგ</td>
                                    <td><span className={`badge ${l.isCompliant ? 'badge-green' : 'badge-red'}`}>{l.isCompliant ? '✓' : '⚠'}</span></td>
                                    <td>{l.operator?.name || '—'}</td>
                                    <td>{new Date(l.loggedAt).toLocaleDateString('ka-GE', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })}</td>
                                  </tr>
                                ))}
                                <tr className="border-t-2 border-gray-200 font-semibold">
                                  <td>სულ გამოყ.</td>
                                  <td className="text-red-600">
                                    -{history[r.lotNumber].reduce((s: number, l: any) => s + (l.weightKg || 0), 0).toFixed(1)}კგ
                                  </td>
                                  <td colSpan={3}></td>
                                </tr>
                              </tbody>
                            </table>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
