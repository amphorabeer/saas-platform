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
  const [users, setUsers] = useState<{ id: string; name: string | null; email: string | null }[]>([])
  const [team, setTeam] = useState<{ userId: string; role: string; customRole?: string }[]>([])

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
        setTeam(Array.isArray(c.team) ? c.team : [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    fetch('/api/users')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.users) setUsers(data.users)
      })
      .catch(() => {})
  }, [])

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
            team,
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

          <section>
            <h3 className="text-sm font-semibold text-text-secondary mb-3">HACCP გუნდი (სუჯ)</h3>
            <p className="text-xs text-text-muted mb-3">დაამატეთ გუნდის წევრები და მათი როლები</p>

            {/* Team members list */}
            <div className="space-y-2 mb-3">
              {team.map((member, idx) => {
                const user = users.find((u) => u.id === member.userId)
                return (
                  <div
                    key={idx}
                    className="flex items-center gap-2 p-3 bg-bg-tertiary rounded-lg border border-border"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{user?.name || user?.email || member.userId}</p>
                      <p className="text-xs text-copper-light">{member.role}</p>
                    </div>
                    <button
                      type="button"
                      className="text-xs text-red-400 hover:text-red-300 shrink-0"
                      onClick={() => setTeam(team.filter((_, i) => i !== idx))}
                    >
                      ✕
                    </button>
                  </div>
                )
              })}
              {team.length === 0 && (
                <p className="text-xs text-text-muted py-2">გუნდის წევრები არ არის</p>
              )}
            </div>

            {/* Add member form */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 bg-bg-tertiary/50 rounded-lg border border-border">
              <div>
                <label className="block text-xs text-text-muted mb-1">მომხმარებელი</label>
                <select
                  id="team-user-select"
                  className="w-full px-3 py-2 bg-bg-card border border-border rounded-lg text-sm text-text-primary"
                  defaultValue=""
                >
                  <option value="">— აირჩიეთ —</option>
                  {users
                    .filter((u) => !team.find((m) => m.userId === u.id))
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name || u.email}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">როლი</label>
                <select
                  id="team-role-select"
                  className="w-full px-3 py-2 bg-bg-card border border-border rounded-lg text-sm text-text-primary"
                  defaultValue=""
                >
                  <option value="">— აირჩიეთ —</option>
                  <option value="საბჭოს თავმჯდომარე">საბჭოს თავმჯდომარე</option>
                  <option value="HACCP ლიდერი">HACCP ლიდერი</option>
                  <option value="მიწოდების ჯაჭვის მენეჯერი">მიწ. ჯაჭვის მენეჯ.</option>
                  <option value="ლუდსახარშის უფროსი">ლუდსახარშის უფროსი</option>
                  <option value="ტექნიკური მენეჯერი">ტექნიკური მენეჯერი</option>
                  <option value="უსაფრთხოების მენეჯერი">უსაფრ. მენეჯერი</option>
                  <option value="სან-ჰიგიენისტი">სან-ჰიგიენისტი</option>
                  <option value="სხვა">სხვა</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  className="w-full px-3 py-2 bg-copper/20 text-copper-light border border-copper/30 rounded-lg text-sm hover:bg-copper/30 transition-colors"
                  onClick={() => {
                    const userSel = document.getElementById('team-user-select') as HTMLSelectElement
                    const roleSel = document.getElementById('team-role-select') as HTMLSelectElement
                    const userId = userSel?.value
                    const role = roleSel?.value
                    if (!userId || !role) return
                    if (team.find((m) => m.userId === userId)) return
                    setTeam([...team, { userId, role }])
                    userSel.value = ''
                    roleSel.value = ''
                  }}
                >
                  + დამატება
                </button>
              </div>
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
