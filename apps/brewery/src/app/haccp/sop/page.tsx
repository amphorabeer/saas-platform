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
  code: string
  title: string
  description: string
}[] = [
  {
    type: 'CLEANING',
    code: 'SOP-01',
    title: 'რეცხვა-დეზინფექცია',
    description:
      'ზედაპირების, ინსტრუმენტებისა და აღჭურვილობის სისტემური გაწმენდა და დეზინფექცია დამტკიცებული სქემით. ქიმიური საშუალებების კონცენტრაციისა და კონტაქტის დროის დაცვა.',
  },
  {
    type: 'CALIBRATION',
    code: 'SOP-02',
    title: 'დაკალიბრება (თერმომეტრი)',
    description:
      'საწარმოო თერმომეტრების პერიოდული შემოწმება და კალიბრაცია სანდო საყრდენზე. ჩანაწერები HACCP ფაილში და ეტიკეტირება ვარგისიანობის თარიღით.',
  },
  {
    type: 'PERSONNEL_HYGIENE',
    code: 'SOP-03',
    title: 'პერსონალის ჰიგიენა',
    description:
      'სამუშაო ტანსაცმელი, პირადი სისუფთავე, აკრძალული სამკაული და ჯანმრთელობის მდგომარეობის შეტყობინება. ვიზიტორების რეგისტრაცია და ზონებში შესვლის წესები.',
  },
  {
    type: 'HAND_WASHING',
    code: 'SOP-04',
    title: 'ხელის დაბანა',
    description:
      'ხელის დაბანის სწორი ტექნიკა: წყალი, საპონი, ხელის შეფერება, გაშრობა ერთჯერადი ქაღალდით. სავალდებულოა საწარმოო ზონაში შესვლამდე და საკვებთან კონტაქტის შემდეგ.',
  },
  {
    type: 'WASTE',
    code: 'SOP-05',
    title: 'ნარჩენების მართვა',
    description:
      'ნარჩენების დაყოფა, შეგროვება და გატანა ლიცენზირებულ ორგანიზაციაში. კონტეინერების სანიტარია და ჩანაწერების შენახვა კანონმდებლობის შესაბამისად.',
  },
  {
    type: 'PEST',
    code: 'SOP-06',
    title: 'მავნებლების კონტროლი',
    description:
      'მონიტორინგი, სათანდო ხაზები და ქიმიური/მექანიკური ღონისძიებები სერტიფიცირებული მიმწოდებლის რეკომენდაციით. ჩანაწერები ჟურნალში ყოველი ღონისძიების შემდეგ.',
  },
  {
    type: 'CHEMICALS',
    code: 'SOP-07',
    title: 'ქიმიური საშუალებები',
    description:
      'შენახვა ჩაკეტილ ადგილას, ეტიკეტირება, MSDS-ის ხელმისაწვდომობა და უსაფრთხოების საშუალებების გამოყენება. ხსნარების მომზადება მხოლოდ ინსტრუქციის მიხედვით.',
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
                    {last ? formatDateTime(last.completedAt) : '—'}
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
                <Button
                  type="button"
                  size="sm"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 hover:shadow-emerald-500/30"
                  onClick={() => {
                    setNotesModal(sop.type)
                    setNotes('')
                  }}
                >
                  შესრულდა
                </Button>
              </CardBody>
            </Card>
          )
        })}
      </div>

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
