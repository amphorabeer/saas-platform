'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, AlertTriangle } from 'lucide-react'
import { checkLab, LAB_LIMITS } from '@/types'
import LotSelect from '@/components/LotSelect'

export default function NewLabTest() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [lot, setLot] = useState('')
  const [lab, setLab] = useState('')
  const [tvc, setTvc] = useState('')
  const [ecoli, setEcoli] = useState('')
  const [salm, setSalm] = useState('')
  const [list, setList] = useState('')
  const [staph, setStaph] = useState('')
  const [op, setOp] = useState('')
  const [notes, setNotes] = useState('')

  const liveCheck = (tvc || ecoli || salm || list)
    ? checkLab(
        tvc ? +tvc : undefined,
        ecoli ? +ecoli : undefined,
        salm === 'true' ? true : salm === 'false' ? false : undefined,
        list === 'true' ? true : list === 'false' ? false : undefined,
      )
    : null

  const save = async () => {
    if (!lab || !op) { alert('ლაბ. სახ. + ოპ. სავ.'); return }
    const r = checkLab(tvc ? +tvc : undefined, ecoli ? +ecoli : undefined, salm === 'true', list === 'true')
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
        alert(`🚨 RECALL!\n${r.issues.join('\n')}\nF-006 + სააგ. ☎ 1524!`)
      } else if (!r.compliant) {
        alert(`⚠ Lab FAIL!\n${r.issues.join('\n')}\nF-006 საჭ.!`)
      } else {
        alert('✓ F-007 შენახულია!')
      }
      window.location.href = '/lab-tests'
    } catch { alert('შეცდ.') }
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
          <p className="page-sub">მიკრობიოლოგიური ტესტი</p>
        </div>
      </div>

      <div className="lim-ok">
        ლიმ.: TVC ≤100,000 | E.coli ≤10 | Salmonella/Listeria = 0/25გ (RECALL!)
      </div>

      {liveCheck && !liveCheck.compliant && (
        <div className={liveCheck.requiresRecall ? 'alert-err' : 'alert-warn'}>
          <AlertTriangle className={`w-4 h-4 flex-shrink-0 ${liveCheck.requiresRecall ? 'text-red-500' : 'text-orange-500'}`} />
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
            <label className="fl">ლაბ. სახელი *</label>
            <input value={lab} onChange={e => setLab(e.target.value)} placeholder="ლაბ. სახ." className="inp" />
          </div>
          <div className="fg">
            <label className="fl">LOT № (F-005-დან)</label>
            <LotSelect value={lot} onChange={setLot} source="raw-materials" />
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">შედეგები</p>

          {[
            { label: 'TVC CFU/გ', id: 'tvc', val: tvc, setVal: setTvc, limit: '≤100,000', check: tvc ? +tvc > LAB_LIMITS.tvcMax : null },
            { label: 'E.coli CFU/გ', id: 'ecoli', val: ecoli, setVal: setEcoli, limit: '≤10', check: ecoli ? +ecoli > LAB_LIMITS.ecoliMax : null },
            { label: 'S.aureus CFU/გ', id: 'staph', val: staph, setVal: setStaph, limit: '≤100', check: staph ? +staph > 100 : null },
          ].map(f => (
            <div key={f.id} className="flex items-center gap-3">
              <div className="w-36 text-sm text-gray-600">{f.label}</div>
              <div className="flex-1">
                <input type="number" value={f.val} onChange={e => f.setVal(e.target.value)}
                  placeholder="შ."
                  className={`inp ${f.check === true ? 'inp-err' : f.check === false ? 'inp-ok' : ''}`} />
              </div>
              <div className="text-xs text-gray-400 w-20">{f.limit}</div>
              <div className="w-6 text-center text-xs">
                {f.check === true && <span className="text-red-600">✗</span>}
                {f.check === false && <span className="text-green-600">✓</span>}
              </div>
            </div>
          ))}

          {/* Salmonella */}
          <div className="flex items-center gap-3">
            <div className="w-36 text-sm font-semibold text-red-700">Salmonella</div>
            <div className="flex-1">
              <select value={salm} onChange={e => setSalm(e.target.value)} className="inp">
                <option value="">— არ ცნობილია —</option>
                <option value="false">არ გამოვლინდა ✓</option>
                <option value="true">გამოვლინდა! 🚨</option>
              </select>
            </div>
            <div className="text-xs text-red-500 w-20">0/25გ!</div>
            <div className="w-6 text-center text-xs">
              {salm === 'false' && <span className="text-green-600">✓</span>}
              {salm === 'true' && <span className="text-red-600 font-bold">🚨</span>}
            </div>
          </div>

          {/* Listeria */}
          <div className="flex items-center gap-3">
            <div className="w-36 text-sm font-semibold text-red-700">Listeria m.</div>
            <div className="flex-1">
              <select value={list} onChange={e => setList(e.target.value)} className="inp">
                <option value="">— არ ცნობილია —</option>
                <option value="false">არ გამოვლინდა ✓</option>
                <option value="true">გამოვლინდა! 🚨</option>
              </select>
            </div>
            <div className="text-xs text-red-500 w-20">0/25გ!</div>
            <div className="w-6 text-center text-xs">
              {list === 'false' && <span className="text-green-600">✓</span>}
              {list === 'true' && <span className="text-red-600 font-bold">🚨</span>}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
          <div className="fg">
            <label className="fl">ოპერატორი *</label>
            <input value={op} onChange={e => setOp(e.target.value)} placeholder="სახელი" className="inp" />
          </div>
          <div className="fg">
            <label className="fl">შენიშვნა</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} className="inp" />
          </div>
        </div>

        <button onClick={save} disabled={saving} className="btn-primary w-full">
          <Save className="w-4 h-4" />
          {saving ? 'ინახება...' : 'F-007 შენახვა'}
        </button>
      </div>
    </div>
  )
}
