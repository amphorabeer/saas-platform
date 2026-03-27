'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, RefreshCw, Trash2, ChevronDown, ChevronUp, Pencil, X, Save } from 'lucide-react'

export default function LabTestsPage() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editItem, setEditItem] = useState<any | null>(null)

  const fetch_ = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/haccp/lab-tests?limit=50')
      if (res.ok) setItems(await res.json())
    } catch { }
    finally { setLoading(false) }
  }

  useEffect(() => { fetch_() }, [])

  const del = async (id: string) => {
    if (!confirm('წაიშლება. დარწმუნებული?')) return
    await fetch(`/api/haccp/lab-tests?id=${id}`, { method: 'DELETE' })
    setItems(p => p.filter(i => i.id !== id))
  }

  const saveEdit = async () => {
    if (!editItem) return
    try {
      await fetch(`/api/haccp/lab-tests?id=${editItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tvcResult: editItem.tvcResult ? +editItem.tvcResult : null,
          ecoliResult: editItem.ecoliResult ? +editItem.ecoliResult : null,
          salmonella: editItem.salmonella,
          listeria: editItem.listeria,
          notes: editItem.notes,
        }),
      })
      await fetch_()
      setEditItem(null)
      alert('✓ განახლდა!')
    } catch { alert('შეცდ.') }
  }

  const BoolBadge = ({ val }: { val: boolean | null }) => {
    if (val === null || val === undefined) return <span className="badge badge-gray">—</span>
    return val
      ? <span className="badge badge-red">🚨 გამოვლ.</span>
      : <span className="badge badge-green">— არ გამ.</span>
  }

  return (
    <div className="page">
      {editItem && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold">რედ. — {editItem.lotNumber || 'F-007'}</h2>
              <button onClick={() => setEditItem(null)} className="p-1.5 rounded hover:bg-gray-100"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="fg">
                <label className="fl">TVC CFU/გ</label>
                <input type="number" value={editItem.tvcResult||''} onChange={e => setEditItem({...editItem, tvcResult: e.target.value})}
                  className={`inp ${editItem.tvcResult && +editItem.tvcResult > 100000 ? 'inp-err' : editItem.tvcResult ? 'inp-ok' : ''}`} />
              </div>
              <div className="fg">
                <label className="fl">E.coli CFU/გ</label>
                <input type="number" value={editItem.ecoliResult||''} onChange={e => setEditItem({...editItem, ecoliResult: e.target.value})}
                  className={`inp ${editItem.ecoliResult && +editItem.ecoliResult > 10 ? 'inp-err' : editItem.ecoliResult ? 'inp-ok' : ''}`} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="fg">
                <label className="fl">Salmonella</label>
                <select value={editItem.salmonella === true ? 'true' : editItem.salmonella === false ? 'false' : ''}
                  onChange={e => setEditItem({...editItem, salmonella: e.target.value === '' ? null : e.target.value === 'true'})}
                  className="inp">
                  <option value="">— არ ცნ. —</option>
                  <option value="false">არ გამოვლინდა ✓</option>
                  <option value="true">გამოვლინდა! 🚨</option>
                </select>
              </div>
              <div className="fg">
                <label className="fl">Listeria m.</label>
                <select value={editItem.listeria === true ? 'true' : editItem.listeria === false ? 'false' : ''}
                  onChange={e => setEditItem({...editItem, listeria: e.target.value === '' ? null : e.target.value === 'true'})}
                  className="inp">
                  <option value="">— არ ცნ. —</option>
                  <option value="false">არ გამოვლინდა ✓</option>
                  <option value="true">გამოვლინდა! 🚨</option>
                </select>
              </div>
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
        <div><h1 className="page-title">Lab ტესტი — F-007</h1><p className="page-sub">მიკრობიოლოგიური</p></div>
        <div className="flex gap-2">
          <button onClick={fetch_} className="btn-secondary btn-sm"><RefreshCw className={`w-4 h-4 ${loading?'animate-spin':''}`} /></button>
          <Link href="/lab-tests/new" className="btn-primary btn-sm"><Plus className="w-4 h-4" />ახალი</Link>
        </div>
      </div>

      <div className="lim-ok">ლიმ.: TVC ≤100,000 | E.coli ≤10 | Salmonella/Listeria 0/25გ</div>

      <div className="card p-0">
        <table className="tbl">
          <thead>
            <tr><th>LOT</th><th>ლაბ.</th><th>TVC</th><th>E.coli</th><th>Salm.</th><th>List.</th><th>სტ.</th><th>თ.</th><th>მოქმ.</th></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="text-center py-6 text-gray-400">იტვირთება...</td></tr>
            ) : !items.length ? (
              <tr><td colSpan={9} className="text-center py-6 text-gray-400">
                ჩანაწ. არ — <Link href="/lab-tests/new" className="text-blue-600 hover:underline">+ ახალი</Link>
              </td></tr>
            ) : items.map(t => (
              <>
                <tr key={t.id} className="cursor-pointer hover:bg-gray-50"
                  onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}>
                  <td className="font-mono text-xs text-blue-700">{t.lotNumber || '—'}</td>
                  <td className="text-xs text-gray-500">{t.labName}</td>
                  <td className={t.tvcResult > 100000 ? 'text-red-600 font-medium' : 'text-green-700'}>
                    {t.tvcResult ? t.tvcResult.toLocaleString() : '—'}
                  </td>
                  <td className={t.ecoliResult > 10 ? 'text-red-600 font-medium' : 'text-green-700'}>
                    {t.ecoliResult ?? '—'}
                  </td>
                  <td><BoolBadge val={t.salmonella} /></td>
                  <td><BoolBadge val={t.listeria} /></td>
                  <td><span className={`badge ${t.overallPass ? 'badge-green' : 'badge-red'}`}>{t.overallPass ? '✓ OK' : '✗ FAIL'}</span></td>
                  <td className="text-xs text-gray-400">
                    {new Date(t.testedAt).toLocaleDateString('ka-GE', { day: '2-digit', month: '2-digit' })}
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <div className="flex gap-1 items-center">
                      <button onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-400">
                        {expandedId === t.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => setEditItem({...t})}
                        className="p-1.5 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => del(t.id)}
                        className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
                {expandedId === t.id && (
                  <tr key={`${t.id}-d`} className="bg-blue-50/40">
                    <td colSpan={9} className="px-4 py-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div><div className="text-xs text-gray-400 mb-0.5">LOT №</div><div className="font-mono text-blue-700">{t.lotNumber || '—'}</div></div>
                        <div><div className="text-xs text-gray-400 mb-0.5">ლაბ.</div><div>{t.labName}</div></div>
                        <div><div className="text-xs text-gray-400 mb-0.5">ტესტ. თ.</div><div>{new Date(t.testedAt).toLocaleString('ka-GE')}</div></div>
                        <div><div className="text-xs text-gray-400 mb-0.5">სტ.</div>
                          <span className={`badge ${t.overallPass ? 'badge-green' : 'badge-red'}`}>{t.overallPass ? '✓ OK' : '✗ FAIL'}</span>
                        </div>
                        <div>
                          <div className="text-xs text-gray-400 mb-0.5">TVC CFU/გ (≤100,000)</div>
                          <div className={t.tvcResult > 100000 ? 'text-red-600 font-medium' : 'text-green-700'}>
                            {t.tvcResult ? t.tvcResult.toLocaleString() : '—'}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-400 mb-0.5">E.coli CFU/გ (≤10)</div>
                          <div className={t.ecoliResult > 10 ? 'text-red-600 font-medium' : 'text-green-700'}>{t.ecoliResult ?? '—'}</div>
                        </div>
                        <div><div className="text-xs text-gray-400 mb-0.5">Salmonella</div><BoolBadge val={t.salmonella} /></div>
                        <div><div className="text-xs text-gray-400 mb-0.5">Listeria m.</div><BoolBadge val={t.listeria} /></div>
                        {t.notes && <div className="col-span-4"><div className="text-xs text-gray-400 mb-0.5">შენ.</div><div>{t.notes}</div></div>}
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
