'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Save, AlertTriangle } from 'lucide-react'
import { genCar } from '@/types'
import LotSelect from '@/components/LotSelect'

type DeviationInfo = {
  ccp: string
  lot: string
  deviation: string
  date: string
}

function NewCaForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [saving, setSaving] = useState(false)
  const [reportNum] = useState(() => genCar())

  const [deviations, setDeviations] = useState<DeviationInfo[]>([])
  const [loadingDev, setLoadingDev] = useState(true)

  const [ccp, setCcp] = useState(params.get('ccp') || '')
  const [lot, setLot] = useState(params.get('lot') || '')
  const [deviation, setDeviation] = useState('')
  const [rootCause, setRootCause] = useState('')
  const [action, setAction] = useState('')
  const [preventive, setPreventive] = useState('')
  const [isBatchHold, setIsBatchHold] = useState(true)
  const [isDisposed, setIsDisposed] = useState(false)
  const [disposedKg, setDisposedKg] = useState('')
  const [deadline, setDeadline] = useState('')
  const [responsible, setResponsible] = useState('')

  // ყველა CCP-დან გადახრები + F-006 გამოვრიცხოთ
  useEffect(() => {
    const fetchDeviations = async () => {
      setLoadingDev(true)
      try {
        const [caRes, ...monResults] = await Promise.all([
          fetch('/api/haccp/corrective-actions?limit=200'),
          fetch('/api/haccp/monitoring?ccp=CCP-1&limit=100'),
          fetch('/api/haccp/monitoring?ccp=CCP-2&limit=100'),
          fetch('/api/haccp/monitoring?ccp=CCP-3&limit=100'),
          fetch('/api/haccp/monitoring?ccp=CCP-4&limit=100'),
        ])

        const reported = new Set<string>()
        if (caRes.ok) {
          const cas = await caRes.json()
          cas.forEach((ca: any) => {
            if (ca.batchLot) reported.add(`${ca.ccpRef}:${ca.batchLot}`)
          })
        }

        const ccpNames = ['CCP-1', 'CCP-2', 'CCP-3', 'CCP-4']
        const devList: DeviationInfo[] = []
        const seen = new Set<string>()

        for (let i = 0; i < monResults.length; i++) {
          if (!monResults[i].ok) continue
          const logs = await monResults[i].json()
          const ccpName = ccpNames[i]
          logs
            .filter((l: any) => !l.isCompliant)
            .forEach((l: any) => {
              const key = `${ccpName}:${l.batchLot}`
              if (!seen.has(key) && !reported.has(key)) {
                seen.add(key)
                devList.push({
                  ccp: ccpName,
                  lot: l.batchLot,
                  deviation: l.deviation || 'გადახრა',
                  date: new Date(l.loggedAt).toLocaleDateString('ka-GE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                })
              }
            })
        }

        setDeviations(devList)

        // თუ URL-დან CCP და LOT გადმოვიდა — ავტო შევავსოთ
        const urlCcp = params.get('ccp')
        const urlLot = params.get('lot')
        if (urlCcp) setCcp(urlCcp)
        if (urlLot) setLot(urlLot)

        // ავტო deviation text
        if (urlCcp && urlLot) {
          const found = devList.find(d => d.ccp === urlCcp && d.lot === urlLot)
          if (found) setDeviation(found.deviation)
        }
      } catch { }
      finally { setLoadingDev(false) }
    }
    fetchDeviations()
  }, [])

  // CCP შეცვლისას LOT გავასუფთავოთ
  const handleCcpChange = (newCcp: string) => {
    setCcp(newCcp)
    setLot('')
    setDeviation('')
  }

  // LOT არჩევისას deviation ავტო შევავსოთ
  const handleLotChange = (newLot: string) => {
    setLot(newLot)
    const found = deviations.find(d => d.ccp === ccp && d.lot === newLot)
    if (found) setDeviation(found.deviation)
  }

  const availableCcps = [...new Set(deviations.map(d => d.ccp))]
  const availableLots = deviations.filter(d => d.ccp === ccp)

  const save = async () => {
    if (!deviation || !action || !responsible) { alert('გადახრა, ქმედება, პასუხისმ. სავალდ.'); return }
    setSaving(true)
    try {
      await fetch('/api/haccp/corrective-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportNum, batchLot: lot, ccpRef: ccp, deviation,
          rootCause, action, preventive,
          isBatchHold, isDisposed,
          disposedKg: isDisposed ? +disposedKg : null,
          deadline: deadline ? new Date(deadline) : null,
          responsible
        }),
      })
      alert(`✓ F-006 შენახ.! ${reportNum}`)
      window.location.href = '/corrective-actions'
    } catch { alert('შეცდ.') }
    finally { setSaving(false) }
  }

  return (
    <div className="page max-w-xl">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-gray-100"><ArrowLeft className="w-4 h-4" /></button>
        <div><h1 className="page-title">F-006 — გადახრის ოქმი</h1><p className="page-sub">{reportNum}</p></div>
      </div>

      <div className="alert-err">
        <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
        <span className="text-sm font-semibold text-red-800">⚠ CCP გადახრა — F-006 სავალდებულოა</span>
      </div>

      <div className="card space-y-4">

        {/* CCP + LOT */}
        <div className="grid grid-cols-2 gap-3">
          <div className="fg">
            <label className="fl">CCP <span className="text-orange-500">(⚠ გადახრები)</span></label>
            {loadingDev ? (
              <div className="inp text-gray-400 text-sm">იტვირთება...</div>
            ) : availableCcps.length === 0 ? (
              <div className="inp text-green-700 text-sm">✓ გადახრა არ არის</div>
            ) : (
              <select value={ccp} onChange={e => handleCcpChange(e.target.value)} className="inp">
                <option value="">— CCP აირჩიე —</option>
                {availableCcps.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            )}
          </div>

          <div className="fg">
            <label className="fl">LOT / პარტია</label>
            {!ccp ? (
              <div className="inp text-gray-400 text-sm">ჯერ CCP აირჩიე</div>
            ) : (
              <select value={lot} onChange={e => handleLotChange(e.target.value)} className="inp">
                <option value="">— LOT აირჩიე —</option>
                {availableLots.map(d => (
                  <option key={d.lot} value={d.lot}>
                    ⚠ {d.lot} — {d.date}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* გადახრა - ავტო შევსებული */}
        <div className="fg">
          <label className="fl">გადახრა *</label>
          <textarea value={deviation} onChange={e => setDeviation(e.target.value)}
            rows={2} className="inp" placeholder="გადახრის აღწერა..." />
        </div>

        <div className="fg"><label className="fl">მიზეზი</label>
          <textarea value={rootCause} onChange={e => setRootCause(e.target.value)} rows={2} className="inp" />
        </div>
        <div className="fg"><label className="fl">ქმედება *</label>
          <textarea value={action} onChange={e => setAction(e.target.value)} rows={2} className="inp" />
        </div>
        <div className="fg"><label className="fl">პრევ. ქმ.</label>
          <textarea value={preventive} onChange={e => setPreventive(e.target.value)} rows={2} className="inp" />
        </div>

        <div className="flex gap-4 flex-wrap">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={isBatchHold} onChange={e => setIsBatchHold(e.target.checked)} className="w-4 h-4" />
            პარტია Hold
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={isDisposed} onChange={e => setIsDisposed(e.target.checked)} className="w-4 h-4" />
            განადგ.
          </label>
          {isDisposed && (
            <input type="number" value={disposedKg} onChange={e => setDisposedKg(e.target.value)}
              placeholder="კგ" className="inp w-24" />
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
          <div className="fg"><label className="fl">ვადა</label>
            <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className="inp" />
          </div>
          <div className="fg"><label className="fl">პასუხისმ. *</label>
            <input value={responsible} onChange={e => setResponsible(e.target.value)} placeholder="სახელი" className="inp" />
          </div>
        </div>

        <button onClick={save} disabled={saving} className="btn-primary w-full">
          <Save className="w-4 h-4" />
          {saving ? 'ინახება...' : 'F-006 შენახვა'}
        </button>
      </div>
    </div>
  )
}

export default function NewCaPage() {
  return <Suspense><NewCaForm /></Suspense>
}
