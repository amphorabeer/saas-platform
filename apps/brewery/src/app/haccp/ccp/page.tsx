'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { DashboardLayout } from '@/components/layout'
import { Card, CardBody, CardHeader, Button } from '@/components/ui'
import { HaccpSubNav } from '@/components/haccp/HaccpSubNav'
import { formatDateTime } from '@/lib/utils'

type CcpResult = 'PASS' | 'FAIL' | 'CORRECTIVE_ACTION'

interface BatchOption {
  id: string
  batchNumber: string
  status: string
}

function parseYmd(s: string): { y: number; m: number; d: number } | null {
  const p = s.split('-').map(Number)
  if (p.length !== 3 || p.some((n) => Number.isNaN(n))) return null
  return { y: p[0], m: p[1], d: p[2] }
}

function dayStampFromIso(iso: string): number {
  const d = new Date(iso)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

function isLogInDateRange(recordedAt: string, dateFrom: string, dateTo: string): boolean {
  const day = dayStampFromIso(recordedAt)
  if (dateFrom) {
    const p = parseYmd(dateFrom)
    if (p) {
      const start = new Date(p.y, p.m - 1, p.d).getTime()
      if (day < start) return false
    }
  }
  if (dateTo) {
    const p = parseYmd(dateTo)
    if (p) {
      const end = new Date(p.y, p.m - 1, p.d).getTime()
      if (day > end) return false
    }
  }
  return true
}

interface CcpLogRow {
  id: string
  ccpType: string
  temperature: number | null
  duration: number | null
  phLevel: number | null
  visualCheck: boolean | null
  result: string
  correctiveAction: string | null
  recordedAt: string
  batch: { batchNumber: string } | null
  user: {
    id?: string
    name: string | null
    email: string | null
    signatureUrl?: string | null
  }
}

function OperatorCell({ user }: { user: CcpLogRow['user'] }) {
  const label = user.name || user.email || '—'
  return (
    <div className="flex items-center gap-2 min-w-0 max-w-[200px]">
      {user.signatureUrl ? (
        <img
          src={user.signatureUrl}
          alt=""
          width={40}
          height={20}
          className="signature-img shrink-0 object-contain rounded border border-border bg-white"
        />
      ) : null}
      <span className="truncate text-sm">{label}</span>
    </div>
  )
}

const inputClass =
  'w-full px-4 py-2 bg-bg-card border border-border rounded-lg text-sm text-text-primary'
const ACTIVE_STATUSES = new Set(['PLANNED', 'BREWING', 'FERMENTING', 'CONDITIONING', 'READY', 'PACKAGING'])

function isCipSourcedCcp2(correctiveAction: string | null): boolean {
  return Boolean(
    correctiveAction?.includes('ავტომატურად CIP-იდან') && correctiveAction.includes('CIP ID:')
  )
}

function equipmentNameFromCipNote(correctiveAction: string | null): string | null {
  if (!correctiveAction) return null
  const m = correctiveAction.match(/\|\s*ავზი:\s*(.+)$/)
  return m ? m[1].trim() : null
}

function ResultBadge({ result }: { result: string }) {
  const base =
    'ccp-haccp-result-badge inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium'
  if (result === 'PASS') {
    return <span className={`${base} bg-emerald-500/15 text-emerald-700 dark:text-emerald-400`}>PASS</span>
  }
  if (result === 'FAIL') {
    return <span className={`${base} bg-red-500/15 text-red-700 dark:text-red-400`}>FAIL</span>
  }
  if (result === 'CORRECTIVE_ACTION') {
    return (
      <span className={`${base} bg-amber-500/15 text-amber-800 dark:text-amber-300`}>CORRECTIVE_ACTION</span>
    )
  }
  return <span className={base}>{result}</span>
}

function isBatchSourcedCcp1(correctiveAction: string | null): boolean {
  return Boolean(correctiveAction?.includes('ავტომატურად გენერირებული'))
}

function batchNumberFromBoilingNote(correctiveAction: string | null): string | null {
  if (!correctiveAction) return null
  const m = correctiveAction.match(/\|\s*პარტია:\s*([^|]+)/)
  return m ? m[1].trim() : null
}

function plannedBoilFromNote(correctiveAction: string | null): { temp: number; min: number } | null {
  const m = correctiveAction?.match(/გეგმიული:\s*([\d.]+)°C,\s*(\d+)\s*წთ/)
  if (!m) return null
  const temp = Number(m[1])
  const min = parseInt(m[2], 10)
  if (Number.isNaN(temp) || Number.isNaN(min)) return null
  return { temp, min }
}

function BoilingCcpTableRow({
  row,
  onUpdated,
}: {
  row: CcpLogRow
  onUpdated: () => Promise<void>
}) {
  const fromBatch = isBatchSourcedCcp1(row.correctiveAction)
  const planned = plannedBoilFromNote(row.correctiveAction)
  const batchLabel =
    row.batch?.batchNumber ?? batchNumberFromBoilingNote(row.correctiveAction) ?? '—'

  const [tempDraft, setTempDraft] = useState(
    row.temperature != null ? String(row.temperature) : ''
  )
  const [durDraft, setDurDraft] = useState(row.duration != null ? String(row.duration) : '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setTempDraft(row.temperature != null ? String(row.temperature) : '')
    setDurDraft(row.duration != null ? String(row.duration) : '')
  }, [row.id, row.temperature, row.duration])

  const parsedTemp = tempDraft.trim() === '' ? NaN : Number(tempDraft.replace(',', '.'))
  const parsedDur = durDraft.trim() === '' ? NaN : parseInt(durDraft, 10)
  const draftBreach =
    (!Number.isNaN(parsedTemp) && parsedTemp < 100) ||
    (!Number.isNaN(parsedDur) && parsedDur < 60)
  const manualBreach =
    !fromBatch &&
    ((row.temperature != null && row.temperature < 100) ||
      (row.duration != null && row.duration < 60))
  const showLimitWarning = fromBatch ? draftBreach : manualBreach

  const saveBoilingActuals = async () => {
    if (Number.isNaN(parsedTemp)) {
      alert('შეიყვანეთ ტემპერატურა')
      return
    }
    if (Number.isNaN(parsedDur)) {
      alert('შეიყვანეთ ხანგრძლივობა')
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/haccp/ccp/${row.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          temperature: parsedTemp,
          duration: parsedDur,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(err?.error?.message || 'შენახვა ვერ მოხერხდა')
        return
      }
      await onUpdated()
    } finally {
      setSaving(false)
    }
  }

  const dirty =
    fromBatch &&
    (tempDraft !== (row.temperature != null ? String(row.temperature) : '') ||
      durDraft !== (row.duration != null ? String(row.duration) : ''))

  const tempRed = !Number.isNaN(parsedTemp) && parsedTemp < 100
  const durRed = !Number.isNaN(parsedDur) && parsedDur < 60

  return (
    <tr className={`border-b border-border/60 ${fromBatch ? 'bg-sky-500/[0.04]' : ''}`}>
      <td className="p-3 whitespace-nowrap">
        <div className="flex items-center gap-2">
          {showLimitWarning && (
            <span
              title="კრიტიკული ლიმიტი: ≥100°C, ≥60 წთ"
              className="text-amber-600 dark:text-amber-400 shrink-0"
            >
              <AlertTriangle className="w-4 h-4" aria-hidden />
            </span>
          )}
          <span>{formatDateTime(row.recordedAt)}</span>
        </div>
        {fromBatch && (
          <span className="mt-1 inline-flex items-center gap-1 rounded-md border border-border bg-bg-card px-2 py-0.5 text-[11px] text-text-muted">
            <span style={{ whiteSpace: 'nowrap' }}>🍺 პარტიიდან</span>
          </span>
        )}
      </td>
      <td className="p-3 font-medium">{batchLabel}</td>
      <td className="p-3 min-w-[8rem]">
        {fromBatch ? (
          <div className="space-y-1">
            {planned && (
              <p className="text-xs text-text-muted">
                გეგმიული: {planned.temp}°C
              </p>
            )}
            <input
              type="number"
              step="0.1"
              className={`${inputClass} py-1.5 text-sm ${tempRed ? 'text-red-600 dark:text-red-400 border-red-400/60' : ''}`}
              value={tempDraft}
              onChange={(e) => setTempDraft(e.target.value)}
            />
          </div>
        ) : (
          <span
            className={
              row.temperature != null && row.temperature < 100
                ? 'text-red-600 dark:text-red-400 font-medium'
                : ''
            }
          >
            {row.temperature ?? '—'}
          </span>
        )}
      </td>
      <td className="p-3 min-w-[8rem]">
        {fromBatch ? (
          <div className="space-y-1">
            {planned && (
              <p className="text-xs text-text-muted">გეგმიული: {planned.min} წთ</p>
            )}
            <input
              type="number"
              step="1"
              className={`${inputClass} py-1.5 text-sm ${durRed ? 'text-red-600 dark:text-red-400 border-red-400/60' : ''}`}
              value={durDraft}
              onChange={(e) => setDurDraft(e.target.value)}
            />
          </div>
        ) : (
          <span
            className={
              row.duration != null && row.duration < 60
                ? 'text-red-600 dark:text-red-400 font-medium'
                : ''
            }
          >
            {row.duration ?? '—'}
          </span>
        )}
      </td>
      <td className="p-3">
        <ResultBadge result={row.result} />
      </td>
      <td className="p-3">
        <OperatorCell user={row.user} />
      </td>
      <td className="p-3">
        <div className="flex flex-col items-start gap-2">
          {fromBatch ? (
            <span className="text-sm text-text-muted" style={{ whiteSpace: 'nowrap' }}>
              პარტიიდან 🍺
            </span>
          ) : (
            <span className="text-sm text-text-muted" style={{ whiteSpace: 'nowrap' }}>
              ხელით ✍️
            </span>
          )}
          {fromBatch && (
            <Button
              type="button"
              size="sm"
              className="print:hidden"
              disabled={saving || !dirty}
              onClick={saveBoilingActuals}
            >
              {saving ? '...' : 'შენახვა'}
            </Button>
          )}
        </div>
      </td>
    </tr>
  )
}

function VesselCcpTableRow({
  row,
  onUpdated,
}: {
  row: CcpLogRow
  onUpdated: () => Promise<void>
}) {
  const fromCip = isCipSourcedCcp2(row.correctiveAction)
  const vesselOrBatchLabel = fromCip
    ? equipmentNameFromCipNote(row.correctiveAction) ?? '—'
    : row.batch?.batchNumber ?? '—'
  const needsManual = row.phLevel == null || row.visualCheck == null
  const showIncompleteWarning =
    fromCip && (row.phLevel == null || row.visualCheck == null)
  const phEditable = row.phLevel == null
  const visualEditable = row.visualCheck == null

  const [phDraft, setPhDraft] = useState(row.phLevel != null ? String(row.phLevel) : '')
  const [visualDraft, setVisualDraft] = useState<'unset' | 'true' | 'false'>(
    row.visualCheck === null ? 'unset' : row.visualCheck ? 'true' : 'false'
  )
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setPhDraft(row.phLevel != null ? String(row.phLevel) : '')
    setVisualDraft(row.visualCheck === null ? 'unset' : row.visualCheck ? 'true' : 'false')
  }, [row.id, row.phLevel, row.visualCheck])

  const saveIncompleteFields = async () => {
    const parsedPh =
      phDraft.trim() === '' ? null : Number(phDraft.replace(',', '.'))
    if (parsedPh !== null && (Number.isNaN(parsedPh) || parsedPh < 0 || parsedPh > 14)) {
      alert('შეიყვანეთ სწორი pH (0–14)')
      return
    }
    const parsedVisual: boolean | null =
      visualDraft === 'unset' ? null : visualDraft === 'true'

    const payload: { phLevel?: number | null; visualCheck?: boolean | null } = {}
    if (row.phLevel == null) {
      if (parsedPh === null) {
        alert('შეიყვანეთ pH დონე')
        return
      }
      payload.phLevel = parsedPh
    }
    if (row.visualCheck == null) {
      if (parsedVisual === null) {
        alert('აირჩიეთ ვიზუალური შემოწმება')
        return
      }
      payload.visualCheck = parsedVisual
    }
    if (Object.keys(payload).length === 0) {
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/haccp/ccp/${row.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(err?.error?.message || 'შენახვა ვერ მოხერხდა')
        return
      }
      await onUpdated()
    } finally {
      setSaving(false)
    }
  }

  return (
    <tr className={`border-b border-border/60 ${fromCip ? 'bg-amber-500/[0.04]' : ''}`}>
      <td className="p-3 whitespace-nowrap">
        <div className="flex items-center gap-2">
          {showIncompleteWarning && (
            <span title="საჭიროა ხელით შევსება" className="text-amber-600 dark:text-amber-400 shrink-0">
              <AlertTriangle className="w-4 h-4" aria-hidden />
            </span>
          )}
          <span>{formatDateTime(row.recordedAt)}</span>
        </div>
        {fromCip && (
          <span className="mt-1 inline-flex items-center gap-1 rounded-md border border-border bg-bg-card px-2 py-0.5 text-[11px] text-text-muted">
            <span style={{ whiteSpace: 'nowrap' }}>🔄 CIP-იდან</span>
          </span>
        )}
      </td>
      <td className="p-3">{vesselOrBatchLabel}</td>
      <td className="p-3 min-w-[7rem]">
        {phEditable ? (
          <input
            type="number"
            step="0.01"
            className={`${inputClass} py-1.5 text-sm`}
            value={phDraft}
            onChange={(e) => setPhDraft(e.target.value)}
            placeholder="pH"
          />
        ) : (
          <span>
            {typeof row.phLevel === 'number'
              ? row.phLevel
              : row.phLevel != null
                ? String(row.phLevel)
                : '—'}
          </span>
        )}
      </td>
      <td className="p-3 min-w-[8rem]">
        {visualEditable ? (
          <select
            className={`${inputClass} py-1.5 text-sm`}
            value={visualDraft}
            onChange={(e) => setVisualDraft(e.target.value as 'unset' | 'true' | 'false')}
          >
            <option value="unset">—</option>
            <option value="true">კი</option>
            <option value="false">არა</option>
          </select>
        ) : (
          <span>{row.visualCheck == null ? '—' : row.visualCheck ? 'კი' : 'არა'}</span>
        )}
      </td>
      <td className="p-3">
        <ResultBadge result={row.result} />
      </td>
      <td className="p-3">
        <OperatorCell user={row.user} />
      </td>
      <td className="p-3">
        <div className="flex flex-col items-start gap-2">
          {fromCip ? (
            <span className="text-sm text-text-muted" style={{ whiteSpace: 'nowrap' }}>
              CIP-იდან 🔄
            </span>
          ) : (
            <span className="text-sm text-text-muted" style={{ whiteSpace: 'nowrap' }}>
              ხელით ✍️
            </span>
          )}
          {needsManual && (
            <Button
              type="button"
              size="sm"
              className="print:hidden"
              disabled={saving}
              onClick={saveIncompleteFields}
            >
              {saving ? '...' : 'შენახვა'}
            </Button>
          )}
        </div>
      </td>
    </tr>
  )
}

export default function HaccpCcpPage() {
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState<CcpLogRow[]>([])
  const [batches, setBatches] = useState<BatchOption[]>([])

  const [b1Batch, setB1Batch] = useState('')
  const [b1Temp, setB1Temp] = useState('')
  const [b1Dur, setB1Dur] = useState('')
  const [b1Result, setB1Result] = useState<CcpResult>('PASS')
  const [b1Corrective, setB1Corrective] = useState('')
  const [b1Submitting, setB1Submitting] = useState(false)

  const [b2Batch, setB2Batch] = useState('')
  const [b2Ph, setB2Ph] = useState('')
  const [b2Visual, setB2Visual] = useState(true)
  const [b2Result, setB2Result] = useState<CcpResult>('PASS')
  const [b2Corrective, setB2Corrective] = useState('')
  const [b2Submitting, setB2Submitting] = useState(false)

  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [printMenuOpen, setPrintMenuOpen] = useState(false)

  const loadLogs = useCallback(async () => {
    const res = await fetch('/api/haccp/ccp?limit=200')
    if (res.ok) {
      const data = await res.json()
      setLogs(data.ccpLogs || [])
    }
  }, [])

  const loadBatches = useCallback(async () => {
    const res = await fetch('/api/batches?limit=120')
    if (res.ok) {
      const data = await res.json()
      const raw = Array.isArray(data) ? data : data.batches || []
      const list: BatchOption[] = raw.map((b: any) => ({
        id: b.id,
        batchNumber: b.batchNumber,
        status: b.status,
      }))
      setBatches(list.filter((b) => ACTIVE_STATUSES.has(String(b.status).toUpperCase())))
    }
  }, [])

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      await Promise.all([loadLogs(), loadBatches()])
      setLoading(false)
    })()
  }, [loadLogs, loadBatches])

  const filteredLogs = useMemo(
    () => logs.filter((l) => isLogInDateRange(l.recordedAt, dateFrom, dateTo)),
    [logs, dateFrom, dateTo]
  )
  const boilingLogs = useMemo(
    () => filteredLogs.filter((l) => l.ccpType === 'BOILING'),
    [filteredLogs]
  )
  const vesselLogs = useMemo(
    () => filteredLogs.filter((l) => l.ccpType === 'VESSEL_SANITATION'),
    [filteredLogs]
  )

  const runPdfExport = async (section: 'ccp1' | 'ccp2' | 'both') => {
    setPrintMenuOpen(false)
    const printSection = section === 'ccp1' ? 'CCP1' : section === 'ccp2' ? 'CCP2' : 'ALL'
    const params = new URLSearchParams({ section: printSection })
    if (dateFrom) params.set('dateFrom', dateFrom)
    if (dateTo) params.set('dateTo', dateTo)
    try {
      const res = await fetch(`/api/haccp/ccp/pdf?${params.toString()}`, {
        credentials: 'include',
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        console.error(err)
        alert(err?.error?.message || 'PDF ფაილის შექმნა ვერ მოხერხდა')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `HACCP-CCP-${new Date().toISOString().split('T')[0]}.pdf`
      a.rel = 'noopener'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error(e)
      alert('PDF ფაილის შექმნა ვერ მოხერხდა')
    }
  }

  const submitBoiling = async (e: React.FormEvent) => {
    e.preventDefault()
    const temp = Number(b1Temp)
    const dur = parseInt(b1Dur, 10)
    if (Number.isNaN(temp) || temp < 100) {
      alert('ტემპერატურა უნდა იყოს მინიმუმ 100°C')
      return
    }
    if (Number.isNaN(dur) || dur < 60) {
      alert('ხანგრძლივობა უნდა იყოს მინიმუმ 60 წუთი')
      return
    }
    if ((b1Result === 'FAIL' || b1Result === 'CORRECTIVE_ACTION') && !b1Corrective.trim()) {
      alert('შეიყვანეთ კორექციული ქმედება')
      return
    }
    setB1Submitting(true)
    try {
      const res = await fetch('/api/haccp/ccp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ccpType: 'BOILING',
          batchId: b1Batch || null,
          temperature: temp,
          duration: dur,
          result: b1Result,
          correctiveAction:
            b1Result === 'FAIL' || b1Result === 'CORRECTIVE_ACTION' ? b1Corrective.trim() : null,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(err?.error?.message || 'შენახვა ვერ მოხერხდა')
        return
      }
      setB1Temp('')
      setB1Dur('')
      setB1Corrective('')
      setB1Result('PASS')
      await loadLogs()
    } finally {
      setB1Submitting(false)
    }
  }

  const submitVessel = async (e: React.FormEvent) => {
    e.preventDefault()
    const ph = Number(b2Ph)
    if (Number.isNaN(ph)) {
      alert('შეიყვანეთ pH')
      return
    }
    if ((b2Result === 'FAIL' || b2Result === 'CORRECTIVE_ACTION') && !b2Corrective.trim()) {
      alert('შეიყვანეთ კორექციული ქმედება')
      return
    }
    setB2Submitting(true)
    try {
      const res = await fetch('/api/haccp/ccp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ccpType: 'VESSEL_SANITATION',
          batchId: b2Batch || null,
          phLevel: ph,
          visualCheck: b2Visual,
          result: b2Result,
          correctiveAction:
            b2Result === 'FAIL' || b2Result === 'CORRECTIVE_ACTION' ? b2Corrective.trim() : null,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(err?.error?.message || 'შენახვა ვერ მოხერხდა')
        return
      }
      setB2Ph('')
      setB2Corrective('')
      setB2Result('PASS')
      setB2Visual(true)
      await loadLogs()
    } finally {
      setB2Submitting(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout title="CCP მონიტორინგი" breadcrumb="მთავარი / HACCP / CCP">
        <HaccpSubNav />
        <p className="text-text-muted text-center py-12">იტვირთება...</p>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="CCP მონიტორინგი" breadcrumb="მთავარი / HACCP / CCP">
      <div className="flex flex-col gap-4 mb-4">
        <div className="flex flex-wrap items-end gap-3 justify-end">
          <div>
            <label className="block text-xs text-text-muted mb-1">თარიღიდან</label>
            <input
              type="date"
              className={inputClass}
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">თარიღამდე</label>
            <input
              type="date"
              className={inputClass}
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              setDateFrom('')
              setDateTo('')
            }}
          >
            ყველას ჩვენება
          </Button>
          <div className="relative">
            <Button type="button" size="sm" onClick={() => setPrintMenuOpen((o) => !o)}>
              📄 PDF ▾
            </Button>
            {printMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  aria-hidden
                  onClick={() => setPrintMenuOpen(false)}
                />
                <div className="absolute right-0 top-full mt-1 py-1 bg-bg-card border border-border rounded-lg shadow-lg z-50 min-w-[220px] text-sm">
                  <button
                    type="button"
                    className="w-full text-left px-4 py-2 hover:bg-bg-tertiary text-text-primary"
                    onClick={() => runPdfExport('ccp1')}
                  >
                    CCP-1 PDF
                  </button>
                  <button
                    type="button"
                    className="w-full text-left px-4 py-2 hover:bg-bg-tertiary text-text-primary"
                    onClick={() => runPdfExport('ccp2')}
                  >
                    CCP-2 PDF
                  </button>
                  <button
                    type="button"
                    className="w-full text-left px-4 py-2 hover:bg-bg-tertiary text-text-primary"
                    onClick={() => runPdfExport('both')}
                  >
                    სრული PDF
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-8">
        <HaccpSubNav />

        <div>
          <Card>
            <CardHeader>
              <h2 className="font-semibold text-lg">CCP-1 (ხარშვა)</h2>
            </CardHeader>
            <CardBody className="space-y-6">
              <form
                onSubmit={submitBoiling}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
              <div>
                <label className="block text-xs text-text-muted mb-1">პარტია</label>
                <select
                  className={inputClass}
                  value={b1Batch}
                  onChange={(e) => setB1Batch(e.target.value)}
                >
                  <option value="">—</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.batchNumber} ({b.status})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">ტემპერატურა (°C), ≥100</label>
                <input
                  type="number"
                  step="0.1"
                  className={inputClass}
                  value={b1Temp}
                  onChange={(e) => setB1Temp(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">ხანგრძლივობა (წთ), ≥60</label>
                <input
                  type="number"
                  className={inputClass}
                  value={b1Dur}
                  onChange={(e) => setB1Dur(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">შედეგი</label>
                <select
                  className={inputClass}
                  value={b1Result}
                  onChange={(e) => setB1Result(e.target.value as CcpResult)}
                >
                  <option value="PASS">PASS</option>
                  <option value="FAIL">FAIL</option>
                  <option value="CORRECTIVE_ACTION">CORRECTIVE_ACTION</option>
                </select>
              </div>
              {(b1Result === 'FAIL' || b1Result === 'CORRECTIVE_ACTION') && (
                <div className="md:col-span-2">
                  <label className="block text-xs text-text-muted mb-1">კორექციული ქმედება</label>
                  <textarea
                    className={`${inputClass} min-h-[88px]`}
                    value={b1Corrective}
                    onChange={(e) => setB1Corrective(e.target.value)}
                    rows={3}
                  />
                </div>
              )}
              <div className="md:col-span-2">
                <Button type="submit" disabled={b1Submitting}>
                  {b1Submitting ? 'ინახება...' : 'ჩანიშვნა'}
                </Button>
              </div>
            </form>

            <div className="overflow-x-auto border border-border rounded-xl">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-bg-tertiary/50 text-left text-text-muted">
                    <th className="p-3">თარიღი</th>
                    <th className="p-3">პარტია</th>
                    <th className="p-3">ტემპერატურა °C</th>
                    <th className="p-3">ხანგრძლივობა (წთ)</th>
                    <th className="p-3">შედეგი</th>
                    <th className="p-3">შემსრულებელი</th>
                    <th className="p-3">წყარო</th>
                  </tr>
                </thead>
                <tbody>
                  {boilingLogs.map((row) => (
                    <BoilingCcpTableRow key={row.id} row={row} onUpdated={loadLogs} />
                  ))}
                </tbody>
              </table>
              {boilingLogs.length === 0 && (
                <p className="p-4 text-text-muted text-sm">ჩანაწერები არ არის</p>
              )}
            </div>
          </CardBody>
        </Card>
        </div>

        <div>
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-lg">CCP-2 (ქვევრი/ავზის სანიტარია)</h2>
          </CardHeader>
          <CardBody className="space-y-6">
            <form
              onSubmit={submitVessel}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <div>
                <label className="block text-xs text-text-muted mb-1">პარტია</label>
                <select
                  className={inputClass}
                  value={b2Batch}
                  onChange={(e) => setB2Batch(e.target.value)}
                >
                  <option value="">—</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.batchNumber} ({b.status})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">pH</label>
                <input
                  type="number"
                  step="0.01"
                  className={inputClass}
                  value={b2Ph}
                  onChange={(e) => setB2Ph(e.target.value)}
                  required
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={b2Visual}
                    onChange={(e) => setB2Visual(e.target.checked)}
                    className="rounded border-border"
                  />
                  ვიზუალური შემოწმება
                </label>
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">შედეგი</label>
                <select
                  className={inputClass}
                  value={b2Result}
                  onChange={(e) => setB2Result(e.target.value as CcpResult)}
                >
                  <option value="PASS">PASS</option>
                  <option value="FAIL">FAIL</option>
                  <option value="CORRECTIVE_ACTION">CORRECTIVE_ACTION</option>
                </select>
              </div>
              {(b2Result === 'FAIL' || b2Result === 'CORRECTIVE_ACTION') && (
                <div className="md:col-span-2">
                  <label className="block text-xs text-text-muted mb-1">კორექციული ქმედება</label>
                  <textarea
                    className={`${inputClass} min-h-[88px]`}
                    value={b2Corrective}
                    onChange={(e) => setB2Corrective(e.target.value)}
                    rows={3}
                  />
                </div>
              )}
              <div className="md:col-span-2">
                <Button type="submit" disabled={b2Submitting}>
                  {b2Submitting ? 'ინახება...' : 'ჩანიშვნა'}
                </Button>
              </div>
            </form>

            <div className="overflow-x-auto border border-border rounded-xl">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-bg-tertiary/50 text-left text-text-muted">
                    <th className="p-3">თარიღი</th>
                    <th className="p-3">ავზი/ქვევრი</th>
                    <th className="p-3">pH დონე</th>
                    <th className="p-3">ვიზუალური შემოწმება</th>
                    <th className="p-3">შედეგი</th>
                    <th className="p-3">შემსრულებელი</th>
                    <th className="p-3">წყარო</th>
                  </tr>
                </thead>
                <tbody>
                  {vesselLogs.map((row) => (
                    <VesselCcpTableRow key={row.id} row={row} onUpdated={loadLogs} />
                  ))}
                </tbody>
              </table>
              {vesselLogs.length === 0 && (
                <p className="p-4 text-text-muted text-sm">ჩანაწერები არ არის</p>
              )}
            </div>
          </CardBody>
        </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
