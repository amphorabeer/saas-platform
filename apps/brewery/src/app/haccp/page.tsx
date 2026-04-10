'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout'
import { Card, CardBody, CardHeader, Button } from '@/components/ui'
import { HaccpSubNav } from '@/components/haccp/HaccpSubNav'
import { formatDateTime } from '@/lib/utils'

interface SopCompletion {
  id: string
  sopType: string
  completedAt: string
  user?: { name: string | null; email: string | null }
}

interface CcpLog {
  id: string
  ccpType: string
  result: string
  recordedAt: string
}

interface JournalRow {
  id: string
  recordedAt: string
}

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

function weekAgoIso() {
  const d = new Date()
  d.setDate(d.getDate() - 7)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

export default function HaccpDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [sopTodayDone, setSopTodayDone] = useState(0)
  const [ccpWeekPass, setCcpWeekPass] = useState(0)
  const [ccpWeekFail, setCcpWeekFail] = useState(0)
  const [ccpWeekCorrective, setCcpWeekCorrective] = useState(0)
  const [lastSanitation, setLastSanitation] = useState<string | null>(null)
  const [supplierCount, setSupplierCount] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const from = startOfTodayIso()
      const to = endOfTodayIso()
      const wk = weekAgoIso()

      const [sopRes, ccpRes, sanRes, supRes] = await Promise.all([
        fetch(`/api/haccp/sop?dateFrom=${encodeURIComponent(from)}&dateTo=${encodeURIComponent(to)}&limit=500`),
        fetch('/api/haccp/ccp?limit=500'),
        fetch('/api/haccp/journals?type=SANITATION&limit=1'),
        fetch('/api/haccp/suppliers?limit=500'),
      ])

      if (!sopRes.ok || !ccpRes.ok || !sanRes.ok || !supRes.ok) {
        setError('მონაცემების ჩატვირთვა ვერ მოხერხდა')
        return
      }

      const sopData = await sopRes.json()
      const ccpData = await ccpRes.json()
      const sanData = await sanRes.json()
      const supData = await supRes.json()

      const completions: SopCompletion[] = sopData.sopCompletions || []
      const uniqueTypes = new Set(completions.map((c) => c.sopType))
      setSopTodayDone(uniqueTypes.size)

      const logs: CcpLog[] = ccpData.ccpLogs || []
      const weekLogs = logs.filter((l) => new Date(l.recordedAt) >= new Date(wk))
      setCcpWeekPass(weekLogs.filter((l) => l.result === 'PASS').length)
      setCcpWeekFail(weekLogs.filter((l) => l.result === 'FAIL').length)
      setCcpWeekCorrective(weekLogs.filter((l) => l.result === 'CORRECTIVE_ACTION').length)

      const sanJournals: JournalRow[] = sanData.journals || []
      setLastSanitation(sanJournals[0]?.recordedAt ?? null)

      const suppliers = supData.suppliers || []
      setSupplierCount(suppliers.length)
    } catch (e) {
      console.error(e)
      setError('ქსელის შეცდომა')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <DashboardLayout title="🛡️ HACCP" breadcrumb="მთავარი / HACCP">
        <HaccpSubNav />
        <div className="text-center py-12">
          <p className="text-text-muted">იტვირთება...</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="🛡️ HACCP" breadcrumb="მთავარი / HACCP">
      <HaccpSubNav />

      {error && (
        <p className="text-danger text-sm mb-4" role="alert">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-text-secondary">SOP დღეს</h3>
          </CardHeader>
          <CardBody>
            <p className="text-3xl font-bold text-copper-light">
              {sopTodayDone} / 7
            </p>
            <p className="text-xs text-text-muted mt-1">დღევანდელი შესრულებული ტიპების რაოდენობა</p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-text-secondary">CCP (7 დღე)</h3>
          </CardHeader>
          <CardBody>
            <p className="text-lg">
              <span className="text-green-400 font-semibold">{ccpWeekPass}</span>
              {' · '}
              <span className="text-red-400 font-semibold">{ccpWeekFail}</span>
              {' · '}
              <span className="text-amber-400 font-semibold">{ccpWeekCorrective}</span>
            </p>
            <p className="text-xs text-text-muted mt-1">
              წარმატებული / ჩაჭრილი / საკორექციო
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-text-secondary">ბოლო სანიტაცია</h3>
          </CardHeader>
          <CardBody>
            <p className="text-lg font-medium text-text-primary">
              {lastSanitation ? formatDateTime(new Date(lastSanitation)) : '—'}
            </p>
            <p className="text-xs text-text-muted mt-1">ჟურნალი: სანიტაცია</p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-text-secondary">მომწოდებლები</h3>
          </CardHeader>
          <CardBody>
            <p className="text-3xl font-bold text-copper-light">{supplierCount}</p>
            <p className="text-xs text-text-muted mt-1">აქტიური ჩანაწერების რაოდენობა</p>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h3 className="font-semibold">სწრაფი მოქმედებები</h3>
        </CardHeader>
        <CardBody>
          <div className="flex flex-wrap gap-3">
            <Link href="/haccp/ccp">
              <Button type="button">+ CCP ჩანიშვნა</Button>
            </Link>
            <Link href="/haccp/journals">
              <Button type="button" variant="secondary">
                + ჟურნალი
              </Button>
            </Link>
            <Link href="/haccp/sop">
              <Button type="button" variant="secondary">
                SOP შესრულება
              </Button>
            </Link>
          </div>
        </CardBody>
      </Card>
    </DashboardLayout>
  )
}
