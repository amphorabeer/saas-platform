'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, AlertTriangle, CheckCircle } from 'lucide-react'
import {
  CCP_LIMITS, CcpKey,
  checkCCP1, checkCCP2, checkCCP3, checkCCP4,
  genLot, type CheckResult
} from '@/types'

interface Props { ccp: CcpKey }

export default function CcpForm({ ccp }: Props) {
  const router = useRouter()
  const lim = CCP_LIMITS[ccp]
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<CheckResult | null>(null)

  // Common
  const [lot, setLot] = useState(genLot)
  const [kg, setKg] = useState('')
  const [op, setOp] = useState('')
  const [notes, setNotes] = useState('')

  // CCP-1
  const [t1, setT1] = useState('')
  const [t2, setT2] = useState('')
  const [t3, setT3] = useState('')
  const [hrs, setHrs] = useState('12')

  // CCP-2
  const [bcInit, setBcInit] = useState('')
  const [bc30, setBc30] = useState('')
  const [bc60, setBc60] = useState('')
  const [bcFinal, setBcFinal] = useState('')
  const [bcMins, setBcMins] = useState('')

  // CCP-3
  const [fAm, setFAm] = useState('')
  const [fPm, setFPm] = useState('')
  const [zAm, setZAm] = useState('')
  const [zPm, setZPm] = useState('')

  // CCP-4
  const [equip, setEquip] = useState('SmartVide 4')
  const [naoh, setNaoh] = useState('')
  const [cipT, setCipT] = useState('')
  const [paa, setPaa] = useState('')
  const [ph, setPh] = useState('')

  const check = useCallback((): CheckResult => {
    let r: CheckResult
    if (ccp === 'CCP-1') r = checkCCP1(+t1||0, +t2||0, +t3||0, +hrs||0)
    else if (ccp === 'CCP-2') r = checkCCP2(+bcFinal||99, +bcMins||999)
    else if (ccp === 'CCP-3') r = checkCCP3(+fAm||99, +fPm||99, +zAm||0, +zPm||0)
    else r = checkCCP4(+naoh||0, +cipT||0, +paa||0, +ph||0)
    setResult(r)
    return r
  }, [ccp, t1, t2, t3, hrs, bcFinal, bcMins, fAm, fPm, zAm, zPm, naoh, cipT, paa, ph])

  const save = async () => {
    if (!op) { alert('ოპ. სავ.! / Operator required!'); return }
    const r = check()
    setSaving(true)
    try {
      const body: Record<string, any> = {
        ccpNumber: ccp,
        batchLot: lot,
        weightKg: +kg || null,
        operatorId: 'demo',
        notes,
        isCompliant: r.compliant,
        deviation: r.issues.join(' | ') || null,
      }
      if (ccp === 'CCP-1') Object.assign(body, { svTempStart: +t1, svTempMid: +t2, svTempEnd: +t3, svHours: +hrs })
      if (ccp === 'CCP-2') Object.assign(body, { bcTempInitial: +bcInit, bcTemp30min: +bc30, bcTemp60min: +bc60, bcTempFinal: +bcFinal, bcDurationMin: +bcMins })
      if (ccp === 'CCP-3') Object.assign(body, { fridgeTempAm: +fAm, fridgeTempPm: +fPm, freezerTempAm: +zAm, freezerTempPm: +zPm })
      if (ccp === 'CCP-4') Object.assign(body, { cipEquipment: equip, cipNaohPct: +naoh, cipTempC: +cipT, cipPaaPpm: +paa, cipFinalPh: +ph })

      await fetch('/api/haccp/monitoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!r.compliant) {
        alert(`⚠ გ-ხ.! F-006 საჭ.!\n${r.issues.join('\n')}\n\nDeviation! Fill F-006!`)
        router.push(`/corrective-actions/new?ccp=${ccp}&lot=${lot}`)
      } else {
        alert('✓ ჩ. შ. / Log saved!')
        router.push(`/${ccp.toLowerCase().replace('-', '-')}`)
      }
    } catch { alert('შ. / Error saving') }
    finally { setSaving(false) }
  }

  return (
    <div className="page max-w-xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="page-title">{ccp} — {lim.nameKa}</h1>
          <p className="page-sub">{lim.nameEn} | {lim.form} | {lim.limitKa}</p>
        </div>
      </div>

      {/* Compliance preview */}
      {result && (
        <div className={result.compliant ? 'alert-ok' : 'alert-err'}>
          {result.compliant
            ? <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
            : <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          }
          <div>
            <p className={`text-sm font-semibold ${result.compliant ? 'text-green-800' : 'text-red-800'}`}>
              {result.compliant ? '✓ კომპლ. / Compliant' : '⚠ გ-ხ.! F-006 საჭ.! / Deviation!'}
            </p>
            {result.issues.map((iss, i) => (
              <p key={i} className="text-xs text-red-600 mt-0.5">• {iss}</p>
            ))}
          </div>
        </div>
      )}

      <div className="card space-y-4">
        {/* Lot + Weight */}
        <div className="grid grid-cols-2 gap-3">
          <div className="fg">
            <label className="fl">LOT №</label>
            <input value={lot} onChange={e => setLot(e.target.value)} className="inp" />
          </div>
          <div className="fg">
            <label className="fl">წ. კგ / Weight kg</label>
            <input type="number" step="0.1" value={kg} onChange={e => setKg(e.target.value)} placeholder="0.8" className="inp" />
          </div>
        </div>

        {/* CCP-1 */}
        {ccp === 'CCP-1' && (
          <>
            <div className="lim-ok">ლ. / Limit: ≥74°C ყ. გ-ვ. | ≥12სთ / each measurement | ≥12h</div>
            <div className="grid grid-cols-3 gap-3">
              <TF label="დ.ტ. / Start °C" value={t1} onChange={v=>{setT1(v);setTimeout(check,100)}} min={74} />
              <TF label="შ.ტ. 6სთ / Mid °C" value={t2} onChange={v=>{setT2(v);setTimeout(check,100)}} min={74} />
              <TF label="ბ.ტ. / End °C" value={t3} onChange={v=>{setT3(v);setTimeout(check,100)}} min={74} />
            </div>
            <div className="fg">
              <label className="fl">სულ სთ. / Total hours (≥12)</label>
              <input type="number" step="0.5" value={hrs} onChange={e=>{setHrs(e.target.value);setTimeout(check,100)}}
                className={`inp ${+hrs < 12 ? 'inp-err' : +hrs >= 12 ? 'inp-ok' : ''}`} />
            </div>
          </>
        )}

        {/* CCP-2 */}
        {ccp === 'CCP-2' && (
          <>
            <div className="lim-ok">ლ. / Limit: ≤4°C საბ. / final | ≤90წთ / min</div>
            <div className="fg">
              <label className="fl">SV გამ. ტ. / Exit temp °C</label>
              <input type="number" step="0.1" value={bcInit} onChange={e=>setBcInit(e.target.value)} placeholder="74.0" className="inp" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <TF label="30წთ / 30min °C" value={bc30} onChange={setBc30} max={99} />
              <TF label="60წთ / 60min °C" value={bc60} onChange={setBc60} max={99} />
              <TF label="საბ. / Final °C" value={bcFinal} onChange={v=>{setBcFinal(v);setTimeout(check,100)}} max={4} />
            </div>
            <div className="fg">
              <label className="fl">ხ-ბ. წთ / Duration min (≤90)</label>
              <input type="number" value={bcMins} onChange={e=>{setBcMins(e.target.value);setTimeout(check,100)}}
                placeholder="85" className={`inp ${+bcMins>90?'inp-err':bcMins&&+bcMins<=90?'inp-ok':''}`} />
              {+bcMins > 90 && <p className="text-xs text-red-500 mt-0.5">⚠ {bcMins}წთ &gt; 90წთ</p>}
            </div>
          </>
        )}

        {/* CCP-3 */}
        {ccp === 'CCP-3' && (
          <>
            <div className="lim-ok">ლ. / Limit: მ. 0–4°C / fridge | მ-ზ. ≤-18°C / freezer</div>
            <p className="text-xs font-semibold text-gray-600">მაცივარი / Fridge (0–4°C)</p>
            <div className="grid grid-cols-2 gap-3">
              <TF label="დ. / Morning °C" value={fAm} onChange={v=>{setFAm(v);setTimeout(check,100)}} min={0} max={4} />
              <TF label="ს. / Evening °C" value={fPm} onChange={v=>{setFPm(v);setTimeout(check,100)}} min={0} max={4} />
            </div>
            <p className="text-xs font-semibold text-gray-600">მ-ზ. / Freezer (≤-18°C)</p>
            <div className="grid grid-cols-2 gap-3">
              <TF label="დ. / Morning °C" value={zAm} onChange={v=>{setZAm(v);setTimeout(check,100)}} max={-18} />
              <TF label="ს. / Evening °C" value={zPm} onChange={v=>{setZPm(v);setTimeout(check,100)}} max={-18} />
            </div>
          </>
        )}

        {/* CCP-4 */}
        {ccp === 'CCP-4' && (
          <>
            <div className="lim-ok">ლ. / Limit: NaOH 1.5–2% | ≥70°C | PAA 150–200ppm | pH 6.5–7.5</div>
            <div className="fg">
              <label className="fl">ობ. / Equipment</label>
              <select value={equip} onChange={e=>setEquip(e.target.value)} className="inp">
                <option>SmartVide 4</option>
                <option>DZ260T ვ.</option>
                <option>სამ. ზ. / Work surface</option>
                <option>დანები / Knives</option>
                <option>იატ. / Floor</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <TF label="NaOH % (1.5–2.0)" value={naoh} onChange={v=>{setNaoh(v);setTimeout(check,100)}} min={1.5} max={2.0} />
              <TF label="ტ. °C (≥70)" value={cipT} onChange={v=>{setCipT(v);setTimeout(check,100)}} min={70} max={99} />
              <TF label="PAA ppm (150–200)" value={paa} onChange={v=>{setPaa(v);setTimeout(check,100)}} min={150} max={200} />
              <TF label="საბ. pH (6.5–7.5)" value={ph} onChange={v=>{setPh(v);setTimeout(check,100)}} min={6.5} max={7.5} />
            </div>
          </>
        )}

        {/* Common footer */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
          <div className="fg">
            <label className="fl">ოპ. * / Operator *</label>
            <input value={op} onChange={e=>setOp(e.target.value)} placeholder="სახ. / Name" className="inp" />
          </div>
          <div className="fg">
            <label className="fl">კომ. / Notes</label>
            <input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="სურ. / Optional" className="inp" />
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={check} className="btn-secondary flex-1">
            შ.ვ. / Check
          </button>
          <button onClick={save} disabled={saving} className="btn-primary flex-1">
            <Save className="w-4 h-4" />
            {saving ? 'ი... / Saving...' : 'შ. / Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

function TF({ label, value, onChange, min, max }: {
  label: string; value: string
  onChange: (v: string) => void
  min?: number; max?: number
}) {
  const v = parseFloat(value)
  const ok = value && !isNaN(v) && (min === undefined || v >= min) && (max === undefined || v <= max)
  const err = value && !isNaN(v) && !ok
  return (
    <div className="fg">
      <label className="fl">{label}</label>
      <input
        type="number" step="0.1" value={value}
        onChange={e => onChange(e.target.value)}
        className={`inp text-center ${err ? 'inp-err' : ok ? 'inp-ok' : ''}`}
      />
      {err && <p className="text-[10px] text-red-500 text-center mt-0.5">⚠ ლ.</p>}
      {ok && <p className="text-[10px] text-green-600 text-center mt-0.5">✓</p>}
    </div>
  )
}
