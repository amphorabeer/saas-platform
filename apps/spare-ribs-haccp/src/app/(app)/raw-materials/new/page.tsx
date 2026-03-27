'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save } from 'lucide-react'
import { genLot } from '@/types'

export default function NewRawMaterial() {
  const router = useRouter()
  const [lot] = useState(genLot)
  const [sup, setSup] = useState('')
  const [kg, setKg] = useState('')
  const [temp, setTemp] = useState('')
  const [coa, setCoa] = useState(false)
  const [vet, setVet] = useState(false)
  const [vetNum, setVetNum] = useState('')
  const [visual, setVisual] = useState(true)
  const [op, setOp] = useState('')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!sup || !kg || !op) { alert('მომწოდებელი, წონა, ოპერატორი სავალდებულოა'); return }
    const tempOk = parseFloat(temp) <= 4
    const docsOk = coa && vet
    const accepted = tempOk && docsOk && visual
    setSaving(true)
    try {
      await fetch('/api/haccp/raw-materials', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lotNumber: lot, supplier: sup, weightKg: +kg, tempArrival: +temp, hasCoa: coa, hasVetCert: vet, vetCertNum: vetNum, visualOk: visual, isAccepted: accepted, receivedById: 'demo' }),
      })
      alert(accepted ? `✓ LOT: ${lot} — მიღებულია!` : `⚠ LOT: ${lot} — უარყოფილია!\n${!tempOk?'ტემპ. > 4°C':''}\n${!docsOk?'დოკ. ნაკლ.':''}`)
      router.push('/raw-materials')
    } catch { alert('შეცდომა') }
    finally { setSaving(false) }
  }

  return (
    <div className="page max-w-xl">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-gray-100"><ArrowLeft className="w-4 h-4" /></button>
        <div><h1 className="page-title">ნედლეული — F-005</h1><p className="page-sub">{lot}</p></div>
      </div>
      <div className="lim-ok">ლიმიტი: ≤4°C | COA + ვეტ. სერტ. სავალდებულო</div>
      <div className="card space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="fg"><label className="fl">LOT №</label><input value={lot} readOnly className="inp bg-gray-50" /></div>
          <div className="fg"><label className="fl">მომწოდებელი *</label><input value={sup} onChange={e=>setSup(e.target.value)} className="inp" /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="fg"><label className="fl">წონა (კგ) *</label><input type="number" step="0.1" value={kg} onChange={e=>setKg(e.target.value)} className="inp" /></div>
          <div className="fg">
            <label className="fl">ტემპ. °C * (≤4°C)</label>
            <input type="number" step="0.1" value={temp} onChange={e=>setTemp(e.target.value)}
              className={`inp ${temp && +temp>4?'inp-err':temp&&+temp<=4?'inp-ok':''}`} />
            {temp && +temp > 4 && <p className="text-xs text-red-500 mt-0.5">⚠ {temp}°C &gt; 4°C — გადახრა!</p>}
          </div>
        </div>
        <div className="flex gap-4 flex-wrap">
          <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={coa} onChange={e=>setCoa(e.target.checked)} className="w-4 h-4" />COA ✓</label>
          <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={vet} onChange={e=>setVet(e.target.checked)} className="w-4 h-4" />ვეტ. სერტ. ✓</label>
          <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={visual} onChange={e=>setVisual(e.target.checked)} className="w-4 h-4" />ვიზ. შემ. ✓</label>
        </div>
        {vet && <div className="fg"><label className="fl">ვეტ. სერტ. №</label><input value={vetNum} onChange={e=>setVetNum(e.target.value)} className="inp" /></div>}
        <div className="fg"><label className="fl">ოპერატორი *</label><input value={op} onChange={e=>setOp(e.target.value)} placeholder="სახელი" className="inp" /></div>
        <button onClick={save} disabled={saving} className="btn-primary w-full"><Save className="w-4 h-4" />{saving?'ინახება...':'F-005 შენახვა'}</button>
      </div>
    </div>
  )
}
