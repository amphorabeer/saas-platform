'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, AlertTriangle } from 'lucide-react'
import { checkLab, LAB_LIMITS } from '@/types'

export default function NewLabTest() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [lot, setLot] = useState('')
  const [lab, setLab] = useState('')
  const [tvc, setTvc] = useState('')
  const [ecoli, setEcoli] = useState('')
  const [salm, setSalm] = useState<string>('')
  const [list, setList] = useState<string>('')
  const [staph, setStaph] = useState('')
  const [op, setOp] = useState('')
  const [notes, setNotes] = useState('')

  const getCheck = () => {
    if (!tvc && !ecoli && !salm && !list) return null
    return checkLab(
      tvc ? +tvc : undefined,
      ecoli ? +ecoli : undefined,
      salm === 'true' ? true : salm === 'false' ? false : undefined,
      list === 'true' ? true : list === 'false' ? false : undefined,
    )
  }

  const liveCheck = getCheck()

  const save = async () => {
    if (!lab || !op) { alert('ლ. სახ. + ოპ. სავ.'); return }
    const r = checkLab(
      tvc ? +tvc : undefined, ecoli ? +ecoli : undefined,
      salm === 'true', list === 'true',
    )
    setSaving(true)
    try {
      await fetch('/api/haccp/lab-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lotNumber: lot || null, labName: lab,
          tvcResult: tvc ? +tvc : null,
          ecoliResult: ecoli ? +ecoli : null,
          salmonella: salm ? salm === 'true' : null,
          listeria: list ? list === 'true' : null,
          staphResult: staph ? +staph : null,
          testedById: 'demo', notes,
        }),
      })
      if (r.requiresRecall) {
        alert(`🚨 RECALL! ${r.issues.join('\n')}\n\nF-006 + სუუ. სააგ. ☎ 1524!`)
      } else if (!r.compliant) {
        alert(`⚠ Lab FAIL!\n${r.issues.join('\n')}\nF-006 შ.!`)
      } else {
        alert('✓ F-007 შ. / Saved!')
      }
      router.push('/lab-tests')
    } catch { alert('შ. / Error') }
    finally { setSaving(false) }
  }

  return (
    <div className="page max-w-xl">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="page-title">Lab F-007</h1>
          <p className="page-sub">მიკრობ. ტ. / Microbiological test</p>
        </div>
      </div>

      <div className="lim-ok">
        ლ.: TVC ≤100,000 | E.coli ≤10 | Salmonella/Listeria = 0/25გ (RECALL!)
      </div>

      {liveCheck && !liveCheck.compliant && (
        <div className={liveCheck.requiresRecall ? 'alert-err' : 'alert-warn'}>
          <AlertTriangle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${liveCheck.requiresRecall ? 'text-red-500' : 'text-orange-500'}`} />
          <div>
            <p className={`text-sm font-semibold ${liveCheck.requiresRecall ? 'text-red-800' : 'text-orange-800'}`}>
              {liveCheck.requiresRecall ? '🚨 RECALL!' : '⚠ FAIL'}
            </p>
            {liveCheck.issues.map((i, idx) => (
              <p key={idx} className="text-xs text-red-600 mt-0.5">• {i}</p>
            ))}
          </div>
        </div>
      )}

      <div className="card space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="fg">
            <label className="fl">ლ. სახ. * / Lab name *</label>
            <input value={lab} onChange={e => setLab(e.target.value)} placeholder="ლ-ი / Lab" className="inp" />
          </div>
          <div className="fg">
            <label className="fl">LOT №</label>
            <input value={lot} onChange={e => setLot(e.target.value)} placeholder="SR-..." className="inp" />
          </div>
        </div>

        {/* Test results */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">შ. / Results</p>

          {/* TVC */}
          <div className="flex items-center gap-3">
            <div className="w-32 text-sm text-gray-600">TVC CFU/გ</div>
            <div className="flex-1">
              <input type="number" value={tvc} onChange={e => setTvc(e.target.value)}
                placeholder="შ." className={`inp ${tvc && +tvc > LAB_LIMITS.tvcMax ? 'inp-err' : tvc ? 'inp-ok' : ''}`} />
            </div>
            <div className="text-xs text-gray-400 w-20">≤100,000</div>
            <div className="w-12 text-center">
              {tvc && (+tvc > LAB_LIMITS.tvcMax
                ? <span className="text-xs text-red-600">✗</span>
                : <span className="text-xs text-green-600">✓</span>
              )}
            </div>
          </div>

          {/* E.coli */}
          <div className="flex items-center gap-3">
            <div className="w-32 text-sm text-gray-600">E.coli CFU/გ</div>
            <div className="flex-1">
              <input type="number" value={ecoli} onChange={e => setEcoli(e.target.value)}
                placeholder="შ." className={`inp ${ecoli && +ecoli > LAB_LIMITS.ecoliMax ? 'inp-err' : ecoli ? 'inp-ok' : ''}`} />
            </div>
            <div className="text-xs text-gray-400 w-20">≤10</div>
            <div className="w-12 text-center">
              {ecoli && (+ecoli > LAB_LIMITS.ecoliMax
                ? <span className="text-xs text-red-600">✗</span>
                : <span className="text-xs text-green-600">✓</span>
              )}
            </div>
          </div>

          {/* Salmonella */}
          <div className="flex items-center gap-3">
            <div className="w-32 text-sm font-semibold text-red-700">Salmonella</div>
            <div className="flex-1">
              <select value={salm} onChange={e => setSalm(e.target.value)} className="inp">
                <option value="">— არ ც. / not tested</option>
                <option value="false">არ გ-ვლ. / Not detected ✓</option>
                <option value="true">გ-ვლ.! / DETECTED! 🚨</option>
              </select>
            </div>
            <div className="text-xs text-red-500 w-20">0/25გ!</div>
            <div className="w-12 text-center">
              {salm === 'false' && <span className="text-xs text-green-600">✓</span>}
              {salm === 'true' && <span className="text-xs text-red-600 font-bold">🚨</span>}
            </div>
          </div>

          {/* Listeria */}
          <div className="flex items-center gap-3">
            <div className="w-32 text-sm font-semibold text-red-700">Listeria m.</div>
            <div className="flex-1">
              <select value={list} onChange={e => setList(e.target.value)} className="inp">
                <option value="">— არ ც. / not tested</option>
                <option value="false">არ გ-ვლ. / Not detected ✓</option>
                <option value="true">გ-ვლ.! / DETECTED! 🚨</option>
              </select>
            </div>
            <div className="text-xs text-red-500 w-20">0/25გ!</div>
            <div className="w-12 text-center">
              {list === 'false' && <span className="text-xs text-green-600">✓</span>}
              {list === 'true' && <span className="text-xs text-red-600 font-bold">🚨</span>}
            </div>
          </div>

          {/* Staph */}
          <div className="flex items-center gap-3">
            <div className="w-32 text-sm text-gray-600">S.aureus CFU/გ</div>
            <div className="flex-1">
              <input type="number" value={staph} onChange={e => setStaph(e.target.value)}
                placeholder="შ." className={`inp ${staph && +staph > 100 ? 'inp-err' : staph ? 'inp-ok' : ''}`} />
            </div>
            <div className="text-xs text-gray-400 w-20">≤100</div>
            <div className="w-12"></div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
          <div className="fg">
            <label className="fl">ოპ. * / Operator *</label>
            <input value={op} onChange={e => setOp(e.target.value)} placeholder="სახ. / Name" className="inp" />
          </div>
          <div className="fg">
            <label className="fl">კომ. / Notes</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="სურ." className="inp" />
          </div>
        </div>

        <button onClick={save} disabled={saving} className="btn-primary w-full">
          <Save className="w-4 h-4" />
          {saving ? 'ი... / Saving...' : 'F-007 შ. / Save'}
        </button>
      </div>
    </div>
  )
}
