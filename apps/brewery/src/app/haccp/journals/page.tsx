'use client'

import { useCallback, useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout'
import { Card, CardBody, CardHeader, Button } from '@/components/ui'
import { HaccpSubNav } from '@/components/haccp/HaccpSubNav'
import { HaccpPrintHeader } from '@/components/haccp/HaccpPrintHeader'
import { formatDateTime } from '@/lib/utils'

const inputClass =
  'w-full px-4 py-2 bg-bg-card border border-border rounded-lg text-sm text-text-primary'

type JournalType =
  | 'SANITATION'
  | 'INCOMING_CONTROL'
  | 'PEST_CONTROL'
  | 'WASTE_MANAGEMENT'
  | 'TEMPERATURE'

const TABS: { type: JournalType; label: string }[] = [
  { type: 'SANITATION', label: 'სანიტაცია' },
  { type: 'INCOMING_CONTROL', label: 'შემავალი კონტროლი' },
  { type: 'PEST_CONTROL', label: 'მავნებლები' },
  { type: 'WASTE_MANAGEMENT', label: 'ნარჩენები' },
  { type: 'TEMPERATURE', label: 'ტემპერატურა' },
]

interface JournalRow {
  id: string
  type: string
  data: Record<string, unknown>
  recordedAt: string
  user: { name: string | null; email: string | null }
}

function fmtJournalValue(v: unknown): string {
  if (v === undefined || v === null || v === '') return ''
  if (typeof v === 'boolean') return v ? 'დიახ' : 'არა'
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

/** Full field list for print/PDF (current tab). */
function formatJournalDataFull(type: JournalType, data: Record<string, unknown>): string {
  const d = data || {}
  const lines: string[] = []
  const push = (label: string, key: string) => {
    const s = fmtJournalValue(d[key])
    if (s) lines.push(`${label}: ${s}`)
  }
  switch (type) {
    case 'SANITATION':
      push('ზონა', 'area')
      push('მეთოდი', 'method')
      push('ქიმიური საშუალება', 'chemical')
      push('კონცენტრაცია', 'concentration')
      push('შემსრულებელი', 'executedBy')
      push('შენიშვნები', 'notes')
      break
    case 'INCOMING_CONTROL':
      push('პროდუქტი', 'product')
      push('მომწოდებელი', 'supplier')
      push('რაოდენობა', 'quantity')
      push('ერთეული', 'unit')
      if (d.vehicleHygiene !== undefined) {
        lines.push(`ტრანსპორტის ჰიგიენა: ${fmtJournalValue(d.vehicleHygiene)}`)
      }
      push('დოკუმენტები', 'documents')
      push('დაბრუნებული რაოდენობა', 'returnedQty')
      push('შენიშვნები', 'notes')
      break
    case 'PEST_CONTROL':
      push('პროცედურა', 'procedure')
      push('მავნებელი', 'pest')
      push('ქიმიური საშუალება', 'chemical')
      push('დოზა', 'dose')
      push('ექსპოზიციის დრო', 'exposureTime')
      push('ზონა', 'area')
      push('შედეგი', 'result')
      push('შენიშვნები', 'notes')
      break
    case 'WASTE_MANAGEMENT':
      push('ნარჩენის ტიპი', 'wasteType')
      push('მართვის მეთოდი', 'managementMethod')
      push('ხელშეკრულების №', 'contractNo')
      push('შენიშვნები', 'notes')
      break
    case 'TEMPERATURE':
      push('ზონა', 'area')
      if (d.temperature != null && d.temperature !== '') {
        lines.push(`ტემპერატურა: ${fmtJournalValue(d.temperature)}°C`)
      }
      if (d.humidity != null && d.humidity !== '') {
        lines.push(`ტენიანობა: ${fmtJournalValue(d.humidity)}%`)
      }
      push('შენიშვნები', 'notes')
      break
    default:
      break
  }
  return lines.join('\n') || '—'
}

function summarizeData(type: JournalType, data: Record<string, unknown>): string {
  switch (type) {
    case 'SANITATION':
      return [data.area, data.method, data.chemical].filter(Boolean).join(' · ') || '—'
    case 'INCOMING_CONTROL':
      return [data.product, data.supplier].filter(Boolean).join(' · ') || '—'
    case 'PEST_CONTROL':
      return [data.procedure, data.pest, data.result].filter(Boolean).join(' · ') || '—'
    case 'WASTE_MANAGEMENT':
      return [data.wasteType, data.managementMethod].filter(Boolean).join(' · ') || '—'
    case 'TEMPERATURE':
      return [data.area, data.temperature != null ? `${data.temperature}°C` : null].filter(Boolean).join(' · ') || '—'
    default:
      return '—'
  }
}

export default function HaccpJournalsPage() {
  const [tab, setTab] = useState<JournalType>('SANITATION')
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<JournalRow[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // SANITATION
  const [s_area, setS_area] = useState('')
  const [s_method, setS_method] = useState('')
  const [s_chemical, setS_chemical] = useState('')
  const [s_conc, setS_conc] = useState('')
  const [s_by, setS_by] = useState('')
  const [s_notes, setS_notes] = useState('')

  // INCOMING
  const [i_product, setI_product] = useState('')
  const [i_supplier, setI_supplier] = useState('')
  const [i_qty, setI_qty] = useState('')
  const [i_unit, setI_unit] = useState('')
  const [i_vehicle, setI_vehicle] = useState(false)
  const [i_docs, setI_docs] = useState('')
  const [i_returned, setI_returned] = useState('')
  const [i_notes, setI_notes] = useState('')

  // PEST
  const [p_proc, setP_proc] = useState('')
  const [p_pest, setP_pest] = useState('')
  const [p_chem, setP_chem] = useState('')
  const [p_dose, setP_dose] = useState('')
  const [p_exp, setP_exp] = useState('')
  const [p_area, setP_area] = useState('')
  const [p_result, setP_result] = useState('')
  const [p_notes, setP_notes] = useState('')

  // WASTE
  const [w_type, setW_type] = useState('')
  const [w_method, setW_method] = useState('')
  const [w_contract, setW_contract] = useState('')
  const [w_notes, setW_notes] = useState('')

  // TEMP
  const [t_area, setT_area] = useState('')
  const [t_temp, setT_temp] = useState('')
  const [t_hum, setT_hum] = useState('')
  const [t_notes, setT_notes] = useState('')

  const load = useCallback(async (t: JournalType) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/haccp/journals?type=${t}&limit=200`)
      if (res.ok) {
        const data = await res.json()
        setRows(data.journals || [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load(tab)
  }, [tab, load])

  const resetForms = () => {
    setS_area('')
    setS_method('')
    setS_chemical('')
    setS_conc('')
    setS_by('')
    setS_notes('')
    setI_product('')
    setI_supplier('')
    setI_qty('')
    setI_unit('')
    setI_vehicle(false)
    setI_docs('')
    setI_returned('')
    setI_notes('')
    setP_proc('')
    setP_pest('')
    setP_chem('')
    setP_dose('')
    setP_exp('')
    setP_area('')
    setP_result('')
    setP_notes('')
    setW_type('')
    setW_method('')
    setW_contract('')
    setW_notes('')
    setT_area('')
    setT_temp('')
    setT_hum('')
    setT_notes('')
  }

  const submitJournal = async () => {
    let data: Record<string, unknown> = {}
    if (tab === 'SANITATION') {
      data = {
        area: s_area,
        method: s_method,
        chemical: s_chemical,
        concentration: s_conc,
        executedBy: s_by,
        notes: s_notes,
      }
    } else if (tab === 'INCOMING_CONTROL') {
      data = {
        product: i_product,
        supplier: i_supplier,
        quantity: i_qty,
        unit: i_unit,
        vehicleHygiene: i_vehicle,
        documents: i_docs,
        returnedQty: i_returned,
        notes: i_notes,
      }
    } else if (tab === 'PEST_CONTROL') {
      data = {
        procedure: p_proc,
        pest: p_pest,
        chemical: p_chem,
        dose: p_dose,
        exposureTime: p_exp,
        area: p_area,
        result: p_result,
        notes: p_notes,
      }
    } else if (tab === 'WASTE_MANAGEMENT') {
      data = {
        wasteType: w_type,
        managementMethod: w_method,
        contractNo: w_contract,
        notes: w_notes,
      }
    } else {
      data = {
        area: t_area,
        temperature: t_temp === '' ? null : Number(t_temp),
        humidity: t_hum === '' ? null : Number(t_hum),
        notes: t_notes,
      }
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/haccp/journals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: tab, data }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(err?.error?.message || 'შენახვა ვერ მოხერხდა')
        return
      }
      setModalOpen(false)
      resetForms()
      await load(tab)
    } finally {
      setSubmitting(false)
    }
  }

  const tabLabel = TABS.find((x) => x.type === tab)?.label ?? ''

  return (
    <DashboardLayout title="HACCP ჟურნალები" breadcrumb="მთავარი / HACCP / ჟურნალები">
      <HaccpPrintHeader sectionTitle={`ჟურნალი — ${tabLabel}`} />
      <div className="flex items-center justify-end print:hidden mb-4">
        <button
          type="button"
          onClick={() => window.print()}
          className="text-sm font-medium text-copper hover:text-copper-light"
        >
          🖨️ ბეჭდვა
        </button>
      </div>
      <HaccpSubNav />

      <div className="flex flex-wrap gap-2 mb-6 print:hidden">
        {TABS.map((t) => (
          <button
            key={t.type}
            type="button"
            onClick={() => setTab(t.type)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.type
                ? 'bg-copper/20 text-copper-light border border-copper/30'
                : 'bg-bg-tertiary text-text-secondary border border-transparent hover:text-text-primary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="hidden print:block haccp-print-table mb-4 text-black">
        <h3 className="text-base font-semibold text-center mb-3">{tabLabel}</h3>
        {loading ? (
          <p className="text-sm text-center py-6">იტვირთება...</p>
        ) : (
          <>
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className="border border-gray-400 p-2 text-left print:bg-transparent print:text-black w-40">
                    დრო
                  </th>
                  <th className="border border-gray-400 p-2 text-left print:bg-transparent print:text-black">
                    ყველა ველი
                  </th>
                  <th className="border border-gray-400 p-2 text-left print:bg-transparent print:text-black w-36">
                    ავტორი
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="border border-gray-400 p-2 align-top whitespace-nowrap">
                      {formatDateTime(r.recordedAt)}
                    </td>
                    <td className="border border-gray-400 p-2 align-top whitespace-pre-wrap">
                      {formatJournalDataFull(tab, (r.data as Record<string, unknown>) || {})}
                    </td>
                    <td className="border border-gray-400 p-2 align-top">
                      {r.user?.name || r.user?.email || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 && <p className="text-sm text-center py-4">ჩანაწერები არ არის</p>}
          </>
        )}
      </div>

      <Card className="print:hidden">
        <CardHeader
          action={
            <Button type="button" size="sm" onClick={() => setModalOpen(true)}>
              + ჩანიშვნა
            </Button>
          }
        >
          <h2 className="font-semibold">{TABS.find((x) => x.type === tab)?.label}</h2>
        </CardHeader>
        <CardBody>
          {loading ? (
            <p className="text-text-muted py-8 text-center">იტვირთება...</p>
          ) : (
            <div className="overflow-x-auto border border-border rounded-xl">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-bg-tertiary/50 text-left text-text-muted">
                    <th className="p-3">დრო</th>
                    <th className="p-3">შინაარსი</th>
                    <th className="p-3">ავტორი</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b border-border/60">
                      <td className="p-3 whitespace-nowrap">{formatDateTime(r.recordedAt)}</td>
                      <td className="p-3 max-w-md">
                        {summarizeData(tab, (r.data as Record<string, unknown>) || {})}
                      </td>
                      <td className="p-3">{r.user?.name || r.user?.email || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length === 0 && (
                <p className="p-4 text-text-muted text-sm">ჩანაწერები არ არის</p>
              )}
            </div>
          )}
        </CardBody>
      </Card>

      {modalOpen && (
        <div
          className="print:hidden fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => !submitting && setModalOpen(false)}
        >
          <div
            className="bg-bg-card border border-border rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-border flex justify-between items-center">
              <h3 className="font-semibold">ახალი ჩანიშვნა — {TABS.find((x) => x.type === tab)?.label}</h3>
              <button
                type="button"
                className="text-text-muted hover:text-text-primary text-xl leading-none"
                onClick={() => !submitting && setModalOpen(false)}
                aria-label="დახურვა"
              >
                ×
              </button>
            </div>
            <div className="p-5 space-y-3">
              {tab === 'SANITATION' && (
                <>
                  <Field label="ზონა" value={s_area} onChange={setS_area} />
                  <Field label="მეთოდი" value={s_method} onChange={setS_method} />
                  <Field label="ქიმიური საშუალება" value={s_chemical} onChange={setS_chemical} />
                  <Field label="კონცენტრაცია" value={s_conc} onChange={setS_conc} />
                  <Field label="შემსრულებელი" value={s_by} onChange={setS_by} />
                  <TextArea label="შენიშვნები" value={s_notes} onChange={setS_notes} />
                </>
              )}
              {tab === 'INCOMING_CONTROL' && (
                <>
                  <Field label="პროდუქტი" value={i_product} onChange={setI_product} />
                  <Field label="მომწოდებელი" value={i_supplier} onChange={setI_supplier} />
                  <Field label="რაოდენობა" value={i_qty} onChange={setI_qty} />
                  <Field label="ერთეული" value={i_unit} onChange={setI_unit} />
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={i_vehicle} onChange={(e) => setI_vehicle(e.target.checked)} />
                    ტრანსპორტის ჰიგიენა
                  </label>
                  <Field label="დოკუმენტები" value={i_docs} onChange={setI_docs} />
                  <Field label="დაბრუნებული რაოდენობა" value={i_returned} onChange={setI_returned} />
                  <TextArea label="შენიშვნები" value={i_notes} onChange={setI_notes} />
                </>
              )}
              {tab === 'PEST_CONTROL' && (
                <>
                  <Field label="პროცედურა" value={p_proc} onChange={setP_proc} />
                  <Field label="მავნებელი" value={p_pest} onChange={setP_pest} />
                  <Field label="ქიმიური საშუალება" value={p_chem} onChange={setP_chem} />
                  <Field label="დოზა" value={p_dose} onChange={setP_dose} />
                  <Field label="ექსპოზიციის დრო" value={p_exp} onChange={setP_exp} />
                  <Field label="ზონა" value={p_area} onChange={setP_area} />
                  <Field label="შედეგი" value={p_result} onChange={setP_result} />
                  <TextArea label="შენიშვნები" value={p_notes} onChange={setP_notes} />
                </>
              )}
              {tab === 'WASTE_MANAGEMENT' && (
                <>
                  <Field label="ნარჩენის ტიპი" value={w_type} onChange={setW_type} />
                  <Field label="მართვის მეთოდი" value={w_method} onChange={setW_method} />
                  <Field label="ხელშეკრულების №" value={w_contract} onChange={setW_contract} />
                  <TextArea label="შენიშვნები" value={w_notes} onChange={setW_notes} />
                </>
              )}
              {tab === 'TEMPERATURE' && (
                <>
                  <Field label="ზონა" value={t_area} onChange={setT_area} />
                  <Field label="ტემპერატურა (°C)" value={t_temp} onChange={setT_temp} type="number" />
                  <Field label="ტენიანობა (%)" value={t_hum} onChange={setT_hum} type="number" />
                  <TextArea label="შენიშვნები" value={t_notes} onChange={setT_notes} />
                </>
              )}
              <div className="flex gap-2 pt-2">
                <Button type="button" onClick={submitJournal} disabled={submitting}>
                  {submitting ? 'ინახება...' : 'შენახვა'}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setModalOpen(false)} disabled={submitting}>
                  გაუქმება
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="hidden print:block text-center text-xs text-black mt-8 pt-4 border-t border-gray-400">
        დაბეჭდილია: {new Date().toLocaleString('ka-GE')}
      </div>
    </DashboardLayout>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
}) {
  return (
    <div>
      <label className="block text-xs text-text-muted mb-1">{label}</label>
      <input type={type} className={inputClass} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}

function TextArea({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="block text-xs text-text-muted mb-1">{label}</label>
      <textarea className={`${inputClass} min-h-[80px]`} value={value} onChange={(e) => onChange(e.target.value)} rows={3} />
    </div>
  )
}
