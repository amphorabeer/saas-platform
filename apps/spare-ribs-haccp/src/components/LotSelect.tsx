'use client'

import { useState, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

interface Props {
  value: string
  onChange: (v: string) => void
  source: string
}

export default function LotSelect({ value, onChange, source }: Props) {
  const [lots, setLots] = useState<{ lot: string; label: string }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (source === 'manual') { setLoading(false); return }

    const fetchLots = async () => {
      try {
        if (source === 'raw-materials') {
          // F-005 მიღებული LOT-ები — ყველა მიღებული (რამდენჯერმე გამოყენება შეიძლება)
          const res = await fetch('/api/haccp/raw-materials?limit=100')
          if (res.ok) {
            const data = await res.json()
            setLots(
              data
                .filter((r: any) => r.isAccepted && (r.remainingKg === null || r.remainingKg > 0))
                .map((r: any) => {
                  const rem = r.remainingKg ?? r.weightKg
                  return {
                    lot: r.lotNumber,
                    label: `${r.lotNumber} — ${r.supplier} | დარჩ: ${rem.toFixed(1)}კგ / ${r.weightKg}კგ`,
                  }
                })
            )
          }
        } else if (source === 'ccp-1-unused-ccp2') {
          // CCP-1 პარტიები რომლებიც CCP-2-ში ჯერ არ შეყვანილა
          const [ccp1Res, ccp2Res] = await Promise.all([
            fetch('/api/haccp/monitoring?ccp=CCP-1&limit=100'),
            fetch('/api/haccp/monitoring?ccp=CCP-2&limit=100'),
          ])
          if (ccp1Res.ok) {
            const ccp1Data = await ccp1Res.json()
            const used = new Set<string>()
            if (ccp2Res.ok) { (await ccp2Res.json()).forEach((l: any) => used.add(l.batchLot)) }
            const seen = new Set<string>()
            const unique: { lot: string; label: string }[] = []
            ccp1Data.forEach((l: any) => {
              if (!seen.has(l.batchLot) && !used.has(l.batchLot)) {
                seen.add(l.batchLot)
                const kg = l.weightKg ? ` | ${l.weightKg}კგ` : ''
                const dt = new Date(l.loggedAt).toLocaleDateString('ka-GE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                unique.push({ lot: l.batchLot, label: `${l.batchLot}${kg} — ${dt}` })
              }
            })
            setLots(unique)
          }
        } else if (source === 'ccp-2-unused-ccp3') {
          // CCP-2 პარტიები რომლებიც CCP-3-ში ჯერ არ შეყვანილა
          const [ccp2Res, ccp3Res] = await Promise.all([
            fetch('/api/haccp/monitoring?ccp=CCP-2&limit=100'),
            fetch('/api/haccp/monitoring?ccp=CCP-3&limit=100'),
          ])
          if (ccp2Res.ok) {
            const ccp2Data = await ccp2Res.json()
            const used = new Set<string>()
            if (ccp3Res.ok) { (await ccp3Res.json()).forEach((l: any) => used.add(l.batchLot)) }
            const seen = new Set<string>()
            const unique: { lot: string; label: string }[] = []
            ccp2Data.forEach((l: any) => {
              if (!seen.has(l.batchLot) && !used.has(l.batchLot)) {
                seen.add(l.batchLot)
                const kg = l.weightKg ? ` | ${l.weightKg}კგ` : ''
                const dt = new Date(l.loggedAt).toLocaleDateString('ka-GE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                unique.push({ lot: l.batchLot, label: `${l.batchLot}${kg} — ${dt}` })
              }
            })
            setLots(unique)
          }
        } else if (source.startsWith('ccp-deviations:')) {
          // გადახრის მქონე პარტიები/ჩანაწ.
          const ccpNum = source.split(':')[1] // e.g. 'CCP-1'
          const res = await fetch(`/api/haccp/monitoring?ccp=${ccpNum}&limit=100`)
          if (res.ok) {
            const data = await res.json()
            const deviations = data.filter((l: any) => !l.isCompliant)
            const seen = new Set<string>()
            const unique: { lot: string; label: string }[] = []
            deviations.forEach((l: any) => {
              if (!seen.has(l.batchLot)) {
                seen.add(l.batchLot)
                const dt = new Date(l.loggedAt).toLocaleDateString('ka-GE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                unique.push({
                  lot: l.batchLot,
                  label: `⚠ ${l.batchLot} — ${l.deviation?.substring(0, 30) || 'გადახრა'} | ${dt}`
                })
              }
            })
            setLots(unique)
          }
        } else if (source === 'ccp-1-unused-ccp3') {
          // fallback
          const res = await fetch('/api/haccp/monitoring?ccp=CCP-1&limit=100')
          if (res.ok) {
            const data = await res.json()
            const seen = new Set<string>()
            const unique: { lot: string; label: string }[] = []
            data.forEach((l: any) => {
              if (!seen.has(l.batchLot)) {
                seen.add(l.batchLot)
                unique.push({ lot: l.batchLot, label: `${l.batchLot} — ${new Date(l.loggedAt).toLocaleDateString('ka-GE', { day: '2-digit', month: '2-digit' })}` })
              }
            })
            setLots(unique)
          }
        }
      } catch { }
      finally { setLoading(false) }
    }
    fetchLots()
  }, [source])

  if (source === 'manual') {
    return (
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="LOT № (სურვილისამებრ)"
        className="inp"
      />
    )
  }

  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="inp appearance-none pr-8"
        disabled={loading}
      >
        <option value="">
          {loading ? 'იტვირთება...' : lots.length ? '— LOT აირჩიე —' : '— LOT არ არის —'}
        </option>
        {lots.map(l => (
          <option key={l.lot} value={l.lot}>{l.label}</option>
        ))}
      </select>
      <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
      {!loading && lots.length === 0 && (
        <p className="text-xs text-orange-500 mt-1">
          {source === 'raw-materials' && '⚠ ჯერ F-005 შეავსე!'}
          {source === 'ccp-1-unused-ccp2' && '⚠ ჯერ CCP-1 ჩანაწ. შეიყვანე!'}
          {source === 'ccp-1-unused-ccp2' && '⚠ ჯერ CCP-1 პარტია შეიყვანე!'}{source === 'ccp-2-unused-ccp3' && '⚠ ჯერ CCP-2 პარტია შეიყვანე!'}
        </p>
      )}
    </div>
  )
}
