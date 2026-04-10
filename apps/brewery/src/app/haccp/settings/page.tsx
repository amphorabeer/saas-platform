'use client'

import { useCallback, useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout'
import { Card, CardBody, CardHeader, Button } from '@/components/ui'
import { HaccpSubNav } from '@/components/haccp/HaccpSubNav'

type FermentationVessel = 'QVEVRI' | 'TANK' | 'BOTH'
type JournalFrequency = 'DAILY' | 'PER_SHIFT' | 'PER_BATCH'

const CCP_OPTIONS = [
  { id: 'BOILING', label: 'CCP-1 ხარშვა' },
  { id: 'VESSEL_SANITATION', label: 'CCP-2 ფერმენტაციის ჭურჭლის სანიტარია' },
] as const

const SOP_OPTIONS = [
  { id: 'CLEANING', label: 'SOP-01 რეცხვა-დეზინფექცია' },
  { id: 'CALIBRATION', label: 'SOP-02 დაკალიბრება (თერმომეტრი)' },
  { id: 'PERSONNEL_HYGIENE', label: 'SOP-03 პერსონალის ჰიგიენა' },
  { id: 'HAND_WASHING', label: 'SOP-04 ხელის დაბანა' },
  { id: 'WASTE', label: 'SOP-05 ნარჩენების მართვა' },
  { id: 'PEST', label: 'SOP-06 მავნებლების კონტროლი' },
  { id: 'CHEMICALS', label: 'SOP-07 ქიმიური საშუალებები' },
] as const

export default function HaccpSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [fermentationVessel, setFermentationVessel] = useState<FermentationVessel>('BOTH')
  const [activeCcps, setActiveCcps] = useState<string[]>([])
  const [activeSops, setActiveSops] = useState<string[]>([])
  const [journalFrequency, setJournalFrequency] = useState<JournalFrequency>('DAILY')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/haccp/config')
      if (res.ok) {
        const data = await res.json()
        const c = data.config || {}
        if (c.fermentationVessel === 'QVEVRI' || c.fermentationVessel === 'TANK' || c.fermentationVessel === 'BOTH') {
          setFermentationVessel(c.fermentationVessel)
        }
        setActiveCcps(Array.isArray(c.activeCcps) ? c.activeCcps.map(String) : [])
        setActiveSops(Array.isArray(c.activeSops) ? c.activeSops.map(String) : [])
        if (c.journalFrequency === 'DAILY' || c.journalFrequency === 'PER_SHIFT' || c.journalFrequency === 'PER_BATCH') {
          setJournalFrequency(c.journalFrequency)
        }
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const toggle = (arr: string[], id: string, set: (v: string[]) => void) => {
    if (arr.includes(id)) set(arr.filter((x) => x !== id))
    else set([...arr, id])
  }

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/haccp/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: {
            fermentationVessel,
            activeCcps,
            activeSops,
            journalFrequency,
          },
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(err?.error?.message || 'შენახვა ვერ მოხერხდა')
        return
      }
      alert('შენახულია')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout title="HACCP კონფიგურაცია" breadcrumb="მთავარი / HACCP / კონფიგურაცია">
        <HaccpSubNav />
        <p className="text-text-muted text-center py-12">იტვირთება...</p>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="HACCP კონფიგურაცია" breadcrumb="მთავარი / HACCP / კონფიგურაცია">
      <HaccpSubNav />

      <Card>
        <CardHeader>
          <h2 className="font-semibold">პარამეტრები</h2>
        </CardHeader>
        <CardBody className="space-y-8">
          <section>
            <h3 className="text-sm font-semibold text-text-secondary mb-3">ფერმენტაციის ჭურჭელი</h3>
            <div className="space-y-2">
              {(
                [
                  { v: 'QVEVRI' as const, label: 'ქვევრი' },
                  { v: 'TANK' as const, label: 'ავზი' },
                  { v: 'BOTH' as const, label: 'ორივე' },
                ] as const
              ).map((opt) => (
                <label key={opt.v} className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="vessel"
                    checked={fermentationVessel === opt.v}
                    onChange={() => setFermentationVessel(opt.v)}
                    className="accent-copper"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-text-secondary mb-3">აქტიური CCP</h3>
            <div className="space-y-2">
              {CCP_OPTIONS.map((c) => (
                <label key={c.id} className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={activeCcps.includes(c.id)}
                    onChange={() => toggle(activeCcps, c.id, setActiveCcps)}
                    className="rounded border-border accent-copper"
                  />
                  {c.label}
                </label>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-text-secondary mb-3">აქტიური SOP</h3>
            <div className="space-y-2">
              {SOP_OPTIONS.map((s) => (
                <label key={s.id} className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={activeSops.includes(s.id)}
                    onChange={() => toggle(activeSops, s.id, setActiveSops)}
                    className="rounded border-border accent-copper"
                  />
                  {s.label}
                </label>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-text-secondary mb-3">ჟურნალის სიხშირე</h3>
            <div className="space-y-2">
              {(
                [
                  { v: 'DAILY' as const, label: 'დღიურად' },
                  { v: 'PER_SHIFT' as const, label: 'ცვლაზე' },
                  { v: 'PER_BATCH' as const, label: 'პარტიაზე' },
                ] as const
              ).map((opt) => (
                <label key={opt.v} className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="freq"
                    checked={journalFrequency === opt.v}
                    onChange={() => setJournalFrequency(opt.v)}
                    className="accent-copper"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </section>

          <Button type="button" onClick={save} disabled={saving}>
            {saving ? 'ინახება...' : 'შენახვა'}
          </Button>
        </CardBody>
      </Card>
    </DashboardLayout>
  )
}
