'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { DashboardLayout } from '@/components/layout'
import { Card, CardBody, CardHeader, Button } from '@/components/ui'
import { HaccpSubNav } from '@/components/haccp/HaccpSubNav'
import { HaccpPrintHeader } from '@/components/haccp/HaccpPrintHeader'
import { formatDateTime } from '@/lib/utils'
import { useUIStore } from '@/store/ui.store'

type SopTypeApi =
  | 'CLEANING'
  | 'CALIBRATION'
  | 'PERSONNEL_HYGIENE'
  | 'HAND_WASHING'
  | 'WASTE'
  | 'PEST'
  | 'CHEMICALS'

interface SopCompletion {
  id: string
  sopType: SopTypeApi
  completedAt: string
  notes: string | null
  user: {
    id?: string
    name: string | null
    email: string | null
    signatureUrl?: string | null
  }
}

function SopOperatorLine({ user }: { user: SopCompletion['user'] }) {
  const label = user.name || user.email || '—'
  return (
    <span className="inline-flex items-center gap-2 flex-wrap">
      {user.signatureUrl ? (
        <img
          src={user.signatureUrl}
          alt=""
          width={40}
          height={20}
          className="signature-img object-contain rounded border border-border bg-white shrink-0"
        />
      ) : null}
      <span>{label}</span>
    </span>
  )
}

const SOP_DEFS: {
  type: SopTypeApi
  id: string
  code: string
  title: string
  frequency: string
  steps: string[]
}[] = [
  {
    type: 'CLEANING',
    id: 'SOP-01',
    code: 'SOP-01',
    title: 'რეცხვა-დეზინფექცია',
    frequency: 'ყოველდღიური',
    steps: [
      'ცივი წყლით წინასწარი ჩამოვლება (5 წუთი)',
      'NaOH ხსნარი 2% — 15 წუთი (60°C)',
      'ცხელი წყლით ჩამოვლება',
      'HNO3 მჟავა ხსნარი 1% — 10 წუთი',
      'სუფთა წყლით საბოლოო ჩამოვლება',
      'ვიზუალური შემოწმება — ნარჩენი სუნი არ უნდა იყოს',
    ],
  },
  {
    type: 'CALIBRATION',
    id: 'SOP-02',
    code: 'SOP-02',
    title: 'დაკალიბრება (თერმომეტრი)',
    frequency: 'კვირეული',
    steps: [
      'სარეფერენსო თერმომეტრი მოამზადეთ (სერტ. ≤12 თვე)',
      'ყინულის აბაზანა მოამზადეთ (0°C) — შეამოწმეთ კონტ. თერმომეტრი',
      'ჩაიწერეთ გაზომვის შედეგი',
      'სხვაობა >0.5°C — თერმომეტრი ამოიღეთ სამუშაოდან',
      'კალიბრაციის ჟურნალში ჩაიწერეთ',
    ],
  },
  {
    type: 'PERSONNEL_HYGIENE',
    id: 'SOP-03',
    code: 'SOP-03',
    title: 'პერსონალის ჰიგიენა',
    frequency: 'ყოველდღიური',
    steps: [
      'სამუშაო ტანსაცმელი გამოიცვალეთ გასახდელში',
      'სამუშაო ფეხსაცმელი გამოიყენეთ',
      'სამუშაო ადგილზე შესვლამდე ხელები დაიბანეთ',
      'სამკაული, საათი, ნეილი — ამოიღეთ',
      'ჯანმრთელობის მდგომარეობა — სიმპტომები არ გაქვთ?',
      'ვიზიტორებს ჰიგიენის წესები გააცანით',
    ],
  },
  {
    type: 'HAND_WASHING',
    id: 'SOP-04',
    code: 'SOP-04',
    title: 'ხელის დაბანა',
    frequency: 'ყოველ შეხებამდე',
    steps: [
      'ხელები გამოასველეთ თბილი წყლით',
      'საპონი 1-2 პომპი — 20 წამი გაიხეხეთ',
      'თითებს შორის, ფრჩხილებს ქვეშ გაიხეხეთ',
      'წყლით კარგად ჩამოიბანეთ',
      'ერთჯერადი ხელსახოცით გაიმშრალეთ',
      'სადეზინფექციო ხსნარი გაიხეხეთ',
    ],
  },
  {
    type: 'WASTE',
    id: 'SOP-05',
    code: 'SOP-05',
    title: 'ნარჩენების მართვა',
    frequency: 'ყოველდღიური',
    steps: [
      'ორგანული ნარჩენი (დრაბი) — განსაზღვრულ კონტეინერში',
      'შეფუთვის მასალა — გადამუშავების კონტეინერში',
      'ქიმიური ნარჩენი — სახიფათო ნარჩენის ადგილზე',
      'ყოველდღე კონტეინერები გაიტანეთ სათანადო ადგილზე',
      'კონტეინერები გარეცხეთ და დეზინფიცირებეთ',
      'ნარჩენების ჟურნალში ჩაიწერეთ',
    ],
  },
  {
    type: 'PEST',
    id: 'SOP-06',
    code: 'SOP-06',
    title: 'მავნებლების კონტროლი',
    frequency: 'კვირეული',
    steps: [
      'ხაფანგების შემოწმება — ყველა წერტილი',
      'შედეგი ჩაიწერეთ მავნებლების ჟურნალში',
      'კარები და ფანჯრები — ბადეები მთლიანია?',
      'ნარჩენების კონტეინერები — დახურულია?',
      'ნებისმიერი ნიშანი — მყისიერად შეატყობინეთ',
      'ქიმიური პროცედურა — კომპანიის კონტრაქტორი',
    ],
  },
  {
    type: 'CHEMICALS',
    id: 'SOP-07',
    code: 'SOP-07',
    title: 'ქიმიური საშუალებები',
    frequency: 'ყოველი გამოყენებისას',
    steps: [
      'სახიფათო ნივთიერება — SDS ფურცელი წაიკითხეთ',
      'დამცავი აღჭურვილობა — ხელთათმანი, სათვალე',
      'სწორი კონცენტრაცია — გაზომეთ, არ გამოიცნოთ',
      'ეტიკეტი — ყველა კონტეინერს ჰქონდეს',
      'საკეტი სათავსო — ბავშვებისგან, საკვებისგან განცალკევებით',
      'გამოყენება ჩაიწერეთ ქიმიკატების ჟურნალში',
    ],
  },
]

function startOfTodayIso() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function endOfTodayIso() {
  const d = new Date()
  d.setHours(23, 59, 59, 999)
  return d.toISOString()
}

export default function HaccpSopPage() {
  const showSuccess = useUIStore((s) => s.showSuccess)
  const [loading, setLoading] = useState(true)
  const [completions, setCompletions] = useState<SopCompletion[]>([])
  const [notesModal, setNotesModal] = useState<SopTypeApi | null>(null)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [checkedSteps, setCheckedSteps] = useState<Record<string, boolean[]>>({})
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState<SopCompletion[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  const getChecked = (sopId: string, stepsLen: number): boolean[] => {
    const raw = checkedSteps[sopId]
    if (!Array.isArray(raw) || raw.length !== stepsLen) {
      return Array(stepsLen).fill(false)
    }
    return raw
  }

  const toggleStep = (sopId: string, idx: number, stepsLen: number) => {
    const current = getChecked(sopId, stepsLen)
    const updated = [...current]
    updated[idx] = !updated[idx]
    setCheckedSteps((prev) => ({ ...prev, [sopId]: updated }))
  }

  const allChecked = (sopId: string, stepsLen: number): boolean => {
    return getChecked(sopId, stepsLen).every(Boolean)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/haccp/sop?limit=500')
      if (res.ok) {
        const data = await res.json()
        setCompletions(data.sopCompletions || [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    setMounted(true)
  }, [])

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const res = await fetch('/api/haccp/sop?limit=200')
      if (res.ok) {
        const data = await res.json()
        setHistory(data.sopCompletions || [])
      }
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  useEffect(() => {
    if (showHistory) loadHistory()
  }, [showHistory, loadHistory])

  const exportSopPdf = async () => {
    // Load history if not loaded yet
    let data: SopCompletion[] = history
    if (data.length === 0) {
      try {
        const res = await fetch('/api/haccp/sop?limit=500')
        if (res.ok) {
          const json = await res.json()
          data = (json.sopCompletions || []) as SopCompletion[]
        }
      } catch {
        /* use empty */
      }
    }

    const SOP_LABELS: Record<string, string> = {
      CLEANING: 'SOP-01 — რეცხვა-დეზინფექცია',
      CALIBRATION: 'SOP-02 — დაკალიბრება',
      PERSONNEL_HYGIENE: 'SOP-03 — პერსონალის ჰიგიენა',
      HAND_WASHING: 'SOP-04 — ხელის დაბანა',
      WASTE: 'SOP-05 — ნარჩენების მართვა',
      PEST: 'SOP-06 — მავნებლების კონტ.',
      CHEMICALS: 'SOP-07 — ქიმიური საშ.',
    }

    const rows = data
      .map(
        (c, i) => `
      <tr style="border-bottom:1px solid #ddd">
        <td style="padding:5px 8px;font-size:10px">${i + 1}</td>
        <td style="padding:5px 8px;font-size:10px;font-weight:500">
          ${SOP_LABELS[c.sopType] || c.sopType}
        </td>
        <td style="padding:5px 8px;font-size:10px;white-space:nowrap">
          ${new Date(c.completedAt).toLocaleString('ka-GE')}
        </td>
        <td style="padding:5px 8px;font-size:10px">
          ${c.user?.name || c.user?.email || '—'}
        </td>
        <td style="padding:5px 8px;font-size:10px;color:#666">
          ${c.notes || '—'}
        </td>
      </tr>`
      )
      .join('')

    const html = `<!DOCTYPE html>
<html lang="ka">
<head>
  <meta charset="UTF-8">
  <title>SOP ისტორია</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Arial,sans-serif;font-size:11px;padding:16px;color:#111}
    .header{text-align:center;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid #111}
    .title{font-size:13px;font-weight:700;margin-bottom:2px}
    .subtitle{font-size:10px;color:#666}
    table{width:100%;border-collapse:collapse;margin-top:8px}
    th{background:#111;color:#fff;padding:6px 8px;text-align:left;font-size:10px}
    tr:nth-child(even){background:#f9f9f9}
    .footer{margin-top:10px;font-size:9px;color:#999;
            border-top:1px solid #eee;padding-top:6px;
            display:flex;justify-content:space-between}
    @media print{body{padding:8px} @page{size:A4;margin:8mm}}
  </style>
</head>
<body>
  <div class="header">
    <div class="title">SOP პროცედურების შესრულების ისტორია</div>
    <div class="subtitle">სულ ჩანაწ.: ${data.length} | 
      დაბეჭდვა: ${new Date().toLocaleDateString('ka-GE')}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width:30px">№</th>
        <th>SOP</th>
        <th>თარიღი/დრო</th>
        <th>შემსრულებელი</th>
        <th>შენიშვნა</th>
      </tr>
    </thead>
    <tbody>
      ${rows || '<tr><td colspan="5" style="text-align:center;padding:20px;color:#999">ჩანაწერები არ არის</td></tr>'}
    </tbody>
  </table>
  <div class="footer">
    <span>BrewMaster PRO · SOP ისტორია</span>
    <span>${new Date().toLocaleDateString('ka-GE')}</span>
  </div>
  <script>window.onload=()=>window.print()</script>
</body>
</html>`

    const win = window.open('', '_blank')
    if (win) {
      win.document.write(html)
      win.document.close()
    }
  }

  const todayFrom = startOfTodayIso()
  const todayTo = endOfTodayIso()

  const { lastByType, doneToday } = useMemo(() => {
    const last: Partial<Record<SopTypeApi, SopCompletion>> = {}
    for (const c of completions) {
      if (!last[c.sopType]) last[c.sopType] = c
    }
    const todaySet = new Set<SopTypeApi>()
    for (const c of completions) {
      const t = new Date(c.completedAt).getTime()
      if (t >= new Date(todayFrom).getTime() && t <= new Date(todayTo).getTime()) {
        todaySet.add(c.sopType)
      }
    }
    return { lastByType: last, doneToday: todaySet }
  }, [completions, todayFrom, todayTo])

  const complete = async (sopType: SopTypeApi, noteText: string | null) => {
    setSubmitting(true)
    try {
      const res = await fetch('/api/haccp/sop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sopType,
          notes: noteText?.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(err?.error?.message || 'შენახვა ვერ მოხერხდა')
        return
      }
      const doneDef = SOP_DEFS.find((d) => d.type === sopType)
      showSuccess('SOP დადასტურდა', doneDef?.title)
      if (doneDef) setCheckedSteps((prev) => ({ ...prev, [doneDef.id]: [] }))
      setNotesModal(null)
      setNotes('')
      await load()
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout title="SOP პროცედურები" breadcrumb="მთავარი / HACCP / SOP">
        <HaccpSubNav />
        <p className="text-text-muted text-center py-12">იტვირთება...</p>
      </DashboardLayout>
    )
  }

  const completionSopDef = notesModal ? SOP_DEFS.find((d) => d.type === notesModal) : undefined

  return (
    <DashboardLayout title="SOP პროცედურები" breadcrumb="მთავარი / HACCP / SOP">
      <HaccpPrintHeader sectionTitle="SOP პროცედურები" />
      <div className="flex items-center justify-end gap-3 print:hidden mb-4">
        <button
          type="button"
          onClick={() => window.print()}
          className="text-sm font-medium text-copper hover:text-copper-light"
        >
          🖨️ ბეჭდვა
        </button>
        <button
          type="button"
          onClick={() => setShowHistory(!showHistory)}
          className="text-sm font-medium text-copper hover:text-copper-light"
        >
          📋 {showHistory ? 'ბარათები' : 'ისტორია'}
        </button>
        <button
          type="button"
          onClick={exportSopPdf}
          className="text-sm font-medium text-copper hover:text-copper-light"
        >
          📄 PDF
        </button>
      </div>
      <HaccpSubNav />

      <div className="hidden print:block haccp-print-table mb-4 text-black">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="border border-gray-400 p-2 text-left print:bg-transparent print:text-black">SOP</th>
              <th className="border border-gray-400 p-2 text-left print:bg-transparent print:text-black">
                ბოლო შესრულება
              </th>
              <th className="border border-gray-400 p-2 text-left print:bg-transparent print:text-black">
                შემსრულებელი
              </th>
              <th className="border border-gray-400 p-2 text-left print:bg-transparent print:text-black">
                ხელმოწერა
              </th>
            </tr>
          </thead>
          <tbody>
            {SOP_DEFS.map((sop) => {
              const last = lastByType[sop.type]
              const who = last ? last.user?.name || last.user?.email || '—' : '—'
              return (
                <tr key={sop.type}>
                  <td className="border border-gray-400 p-2 align-top">
                    {sop.code} — {sop.title}
                  </td>
                  <td className="border border-gray-400 p-2 align-top">
                    {last && mounted ? new Date(last.completedAt).toLocaleString('ka-GE') : '—'}
                  </td>
                  <td className="border border-gray-400 p-2 align-top">{who}</td>
                  <td className="border border-gray-400 p-2 align-top">
                    {last?.user?.signatureUrl ? (
                      <img
                        src={last.user.signatureUrl}
                        alt=""
                        width={100}
                        height={40}
                        className="signature-img max-h-10 w-auto object-contain border border-gray-400 bg-white"
                      />
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {!showHistory ? (
        <div className="grid print:hidden grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {SOP_DEFS.map((sop) => {
            const last = lastByType[sop.type]
            const today = doneToday.has(sop.type)
            return (
              <Card key={sop.type} hover>
                <CardHeader>
                  <div>
                    <p className="text-xs text-copper-light font-semibold">{sop.code}</p>
                    <h3 className="font-semibold text-text-primary">{sop.title}</h3>
                  </div>
                </CardHeader>
                <CardBody className="space-y-3">
                  <div className="text-xs text-text-muted space-y-1">
                    <p>
                      ბოლო შესრულება:{' '}
                      {last ? (
                        <>
                          {formatDateTime(last.completedAt)} — <SopOperatorLine user={last.user} />
                        </>
                      ) : (
                        '—'
                      )}
                    </p>
                    <p>დღევანდელი სტატუსი: {today ? '✅ შესრულებული' : '⏳ მოლოდინში'}</p>
                  </div>
                  {sop.steps && sop.steps.length > 0 && (
                    <div className="space-y-1 my-3">
                      {sop.steps.map((step, idx) => {
                        const checked = getChecked(sop.id, sop.steps.length)[idx]
                        return (
                          <label
                            key={idx}
                            className={`flex items-start gap-2 p-2 rounded-lg cursor-pointer transition-colors text-xs ${
                              checked
                                ? 'bg-emerald-900/20 text-emerald-300 line-through opacity-70'
                                : 'bg-bg-tertiary text-text-secondary hover:bg-bg-secondary'
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="mt-0.5 w-3 h-3 accent-emerald-500 shrink-0"
                              checked={checked}
                              onChange={() => toggleStep(sop.id, idx, sop.steps.length)}
                            />
                            <span>{step}</span>
                          </label>
                        )
                      })}
                    </div>
                  )}
                  {sop.steps && sop.steps.length > 0 && (
                    <div className="mb-2">
                      <div className="flex justify-between text-xs text-text-muted mb-1">
                        <span>პროგრესი</span>
                        <span>
                          {getChecked(sop.id, sop.steps.length).filter(Boolean).length}/{sop.steps.length}
                        </span>
                      </div>
                      <div className="w-full bg-bg-tertiary rounded-full h-1.5">
                        <div
                          className="bg-emerald-500 h-1.5 rounded-full transition-all"
                          style={{
                            width: `${(getChecked(sop.id, sop.steps.length).filter(Boolean).length / sop.steps.length) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    className="w-full bg-emerald-600 hover:bg-emerald-500 hover:shadow-emerald-500/30"
                    disabled={sop.steps?.length > 0 && !allChecked(sop.id, sop.steps.length)}
                    onClick={() => {
                      setNotesModal(sop.type)
                      setNotes('')
                    }}
                  >
                    შესრულდა
                  </Button>
                  {sop.steps?.length > 0 && !allChecked(sop.id, sop.steps.length) && (
                    <p className="text-xs text-text-muted text-center mt-1">✗ ყველა ნაბიჯი მონიშნეთ</p>
                  )}
                </CardBody>
              </Card>
            )
          })}
        </div>
      ) : (
        <div className="space-y-4 print:hidden">
          <Card>
            <CardHeader>
              <h2 className="font-semibold">SOP შესრულების ისტორია</h2>
            </CardHeader>
            <CardBody>
              {historyLoading ? (
                <p className="text-text-muted text-sm">იტვირთება...</p>
              ) : (
                <div className="overflow-x-auto border border-border rounded-xl">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-bg-tertiary/50 text-left text-text-muted">
                        <th className="p-3">SOP</th>
                        <th className="p-3">თარიღი/დრო</th>
                        <th className="p-3">შემსრულებელი</th>
                        <th className="p-3">შენიშვნა</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((c) => {
                        const SOP_LABELS: Record<string, string> = {
                          CLEANING: 'SOP-01 რეცხვა-დეზინფ.',
                          CALIBRATION: 'SOP-02 დაკალიბრება',
                          PERSONNEL_HYGIENE: 'SOP-03 პერს. ჰიგიენა',
                          HAND_WASHING: 'SOP-04 ხელის დაბანა',
                          WASTE: 'SOP-05 ნარჩენები',
                          PEST: 'SOP-06 მავნებლები',
                          CHEMICALS: 'SOP-07 ქიმიური საშ.',
                        }
                        return (
                          <tr key={c.id} className="border-b border-border/60">
                            <td className="p-3 font-medium">{SOP_LABELS[c.sopType] || c.sopType}</td>
                            <td className="p-3 whitespace-nowrap">
                              {mounted ? new Date(c.completedAt).toLocaleString('ka-GE') : ''}
                            </td>
                            <td className="p-3">
                              <SopOperatorLine user={c.user} />
                            </td>
                            <td className="p-3 text-text-muted">{c.notes || '—'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  {history.length === 0 && (
                    <p className="p-4 text-text-muted text-sm">ჩანაწერები არ არის</p>
                  )}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      )}

      {notesModal && completionSopDef && (
        <div
          className="print:hidden fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => !submitting && setNotesModal(null)}
        >
          <div
            className="bg-bg-card border border-border rounded-2xl max-w-md w-full p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-xs text-copper-light font-semibold mb-1">{completionSopDef.code}</p>
            <h3 className="font-semibold text-lg text-text-primary mb-1">{completionSopDef.title}</h3>
            <p className="text-sm text-text-muted mb-4">დაადასტურეთ SOP-ის შესრულება.</p>
            <label className="block text-xs text-text-muted mb-1">შენიშვნა (არასავალდებულო)</label>
            <textarea
              className="w-full px-4 py-2 bg-bg-secondary border border-border rounded-lg text-sm min-h-[100px] mb-4"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="დამატებითი ინფორმაცია..."
            />
            <div className="flex gap-2">
              <Button type="button" onClick={() => complete(notesModal, notes)} disabled={submitting}>
                {submitting ? 'ინახება...' : 'დადასტურება'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setNotesModal(null)} disabled={submitting}>
                გაუქმე
              </Button>
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
