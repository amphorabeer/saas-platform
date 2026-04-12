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
  notes?: string | null
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
  const [alerts, setAlerts] = useState<
    Array<{
      level: 'critical' | 'warning' | 'info'
      type: string
      message: string
      lastDate: string | null
      daysSince: number | null
    }>
  >([])
  const [alertCounts, setAlertCounts] = useState({ critical: 0, warning: 0, info: 0 })
  const [mounted, setMounted] = useState(false)
  const [printFrom, setPrintFrom] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  const [printTo, setPrintTo] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  const [printLoading, setPrintLoading] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const from = startOfTodayIso()
      const to = endOfTodayIso()
      const wk = weekAgoIso()

      const [sopRes, ccpRes, sanRes, supRes, alertsRes] = await Promise.all([
        fetch(`/api/haccp/sop?dateFrom=${encodeURIComponent(from)}&dateTo=${encodeURIComponent(to)}&limit=500`),
        fetch('/api/haccp/ccp?limit=500'),
        fetch('/api/haccp/journals?type=SANITATION&limit=1'),
        fetch('/api/haccp/suppliers?limit=500'),
        fetch('/api/haccp/alerts'),
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

      if (alertsRes.ok) {
        const alertsData = await alertsRes.json()
        setAlerts(alertsData.alerts || [])
        setAlertCounts(alertsData.counts || { critical: 0, warning: 0, info: 0 })
      }
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

  const printAllJournals = async () => {
    setPrintLoading(true)
    try {
      const from = new Date(printFrom + 'T00:00:00').toISOString()
      const to = new Date(printTo + 'T23:59:59').toISOString()

      const TYPES = [
        'SANITATION',
        'INCOMING_CONTROL',
        'PEST_CONTROL',
        'WASTE_MANAGEMENT',
        'TEMPERATURE',
        'KEG_WASHING',
        'FILLING',
        'INCIDENT',
        'HEALTH_CHECK',
        'THERMOMETER_CALIBRATION',
        'TRAINING',
        'HYGIENE_VIOLATION',
        'CHEMICAL_LOG',
        'STORAGE_CONTROL',
        'JOURNAL_VERIFICATION',
        'MANAGEMENT_REVIEW',
        'AUDIT',
        'CORRECTIVE_ACTION',
        'RODENT_TRAP',
      ]

      const TYPE_LABELS: Record<string, string> = {
        SANITATION: 'სანიტაცია',
        INCOMING_CONTROL: 'შემავალი კონტროლი',
        PEST_CONTROL: 'მავნებლების კონტ.',
        WASTE_MANAGEMENT: 'ნარჩენების მართვა',
        TEMPERATURE: 'ტემპერატურა',
        KEG_WASHING: 'კეგის რეცხვა',
        FILLING: 'ჩამოსხმა',
        INCIDENT: 'ინციდენტი',
        HEALTH_CHECK: 'პერს. ჯანმრთ.',
        THERMOMETER_CALIBRATION: 'თერმომ. კალიბ.',
        TRAINING: 'ტრენინგი',
        HYGIENE_VIOLATION: 'ჰიგ. დარღვევა',
        CHEMICAL_LOG: 'ქიმიკატები',
        STORAGE_CONTROL: 'საწყობი',
        JOURNAL_VERIFICATION: 'ჟ. გადამოწმება',
        MANAGEMENT_REVIEW: 'მენეჯ. განხილვა',
        AUDIT: 'HACCP აუდიტი',
        CORRECTIVE_ACTION: 'მაკორექტ. ქმედება',
        RODENT_TRAP: 'სათაგურები',
      }

      const fromQ = encodeURIComponent(from)
      const toQ = encodeURIComponent(to)

      const results = await Promise.all(
        TYPES.map((type) =>
          fetch(`/api/haccp/journals?type=${type}&dateFrom=${fromQ}&dateTo=${toQ}&limit=200`)
            .then((r) => (r.ok ? r.json() : { journals: [] }))
            .then((d) => ({ type, journals: d.journals || [] }))
        )
      )

      const sopRes = await fetch(`/api/haccp/sop?dateFrom=${fromQ}&dateTo=${toQ}&limit=200`)
      const sopData = await sopRes.json()
      const sopCompletions: SopCompletion[] = sopData.sopCompletions || []

      const fromLabel = new Date(printFrom).toLocaleDateString('ka-GE')
      const toLabel = new Date(printTo).toLocaleDateString('ka-GE')

      let sections = ''

      if (sopCompletions.length > 0) {
        const SOP_LABELS: Record<string, string> = {
          CLEANING: 'SOP-01 რეცხვა-დეზინფ.',
          CALIBRATION: 'SOP-02 დაკალიბრება',
          PERSONNEL_HYGIENE: 'SOP-03 პერს. ჰიგიენა',
          HAND_WASHING: 'SOP-04 ხელის დაბანა',
          WASTE: 'SOP-05 ნარჩენები',
          PEST: 'SOP-06 მავნებლები',
          CHEMICALS: 'SOP-07 ქიმიური საშ.',
        }
        sections += `
          <div class="section">
            <h2>SOP პროცედურები (${sopCompletions.length})</h2>
            <table>
              <thead><tr>
                <th>SOP</th><th>თარიღი/დრო</th><th>შემსრ.</th><th>შენ.</th>
              </tr></thead>
              <tbody>
                ${sopCompletions
                  .map(
                    (c) => `
                  <tr>
                    <td>${SOP_LABELS[c.sopType] || c.sopType}</td>
                    <td>${new Date(c.completedAt).toLocaleString('ka-GE')}</td>
                    <td>${c.user?.name || c.user?.email || '—'}</td>
                    <td>${c.notes || '—'}</td>
                  </tr>`
                  )
                  .join('')}
              </tbody>
            </table>
          </div>`
      }

      for (const { type, journals } of results) {
        if (journals.length === 0) continue
        sections += `
          <div class="section">
            <h2>${TYPE_LABELS[type] || type} (${journals.length})</h2>
            <table>
              <thead><tr>
                <th>თარიღი</th><th>შინაარსი</th><th>ავტორი</th>
              </tr></thead>
              <tbody>
                ${journals
                  .map((j: { recordedAt: string; data?: Record<string, unknown>; user?: { name: string | null; email: string | null } }) => {
                    const d = j.data || {}
                    const content = Object.entries(d)
                      .filter(([k]) => !['source', 'autoTag'].includes(k))
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(', ')
                      .substring(0, 100)
                    return `
                    <tr>
                      <td style="white-space:nowrap">${new Date(j.recordedAt).toLocaleString('ka-GE')}</td>
                      <td>${content || '—'}</td>
                      <td>${j.user?.name || j.user?.email || '—'}</td>
                    </tr>`
                  })
                  .join('')}
              </tbody>
            </table>
          </div>`
      }

      if (!sections) {
        sections =
          '<p style="text-align:center;color:#999;padding:40px">ამ პერიოდში ჩანაწერები არ არის</p>'
      }

      const html = `<!DOCTYPE html>
<html lang="ka"><head>
  <meta charset="UTF-8">
  <title>HACCP ჟურნალები</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Arial,sans-serif;font-size:10px;color:#111;padding:12px}
    .header{text-align:center;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid #111}
    .header h1{font-size:14px;font-weight:700}
    .header p{font-size:10px;color:#666;margin-top:2px}
    .section{margin-bottom:16px;page-break-inside:avoid}
    .section h2{font-size:11px;font-weight:700;background:#f0f0f0;
                padding:4px 8px;border-left:3px solid #333;margin-bottom:4px}
    table{width:100%;border-collapse:collapse;font-size:9px}
    th{background:#333;color:#fff;padding:4px 6px;text-align:left}
    td{padding:3px 6px;border-bottom:1px solid #eee;vertical-align:top}
    tr:nth-child(even) td{background:#fafafa}
    .footer{margin-top:12px;font-size:9px;color:#999;
            border-top:1px solid #eee;padding-top:6px;
            display:flex;justify-content:space-between}
    @media print{
      body{padding:6px}
      @page{size:A4;margin:6mm}
      .section{page-break-inside:avoid}
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>HACCP ჟურნალები</h1>
    <p>პერიოდი: ${fromLabel} — ${toLabel} | დაბეჭდვა: ${new Date().toLocaleDateString('ka-GE')}</p>
  </div>
  ${sections}
  <div class="footer">
    <span>BrewMaster PRO · HACCP ჟურნალები</span>
    <span>${fromLabel} — ${toLabel}</span>
  </div>
  <script>window.onload=()=>window.print()</script>
</body></html>`

      const win = window.open('', '_blank')
      if (win) {
        win.document.write(html)
        win.document.close()
      }
    } finally {
      setPrintLoading(false)
    }
  }

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

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-semibold text-text-secondary">⚠️ გაფრთხილებები</h2>
            {alertCounts.critical > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-red-500/20 text-red-400 font-semibold">
                {alertCounts.critical} კრიტიკული
              </span>
            )}
            {alertCounts.warning > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-amber-500/20 text-amber-400 font-semibold">
                {alertCounts.warning} გაფრთხ.
              </span>
            )}
            {alertCounts.info > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-blue-500/20 text-blue-400 font-semibold">
                {alertCounts.info} ინფო
              </span>
            )}
          </div>
          <div className="space-y-2">
            {alerts.map((alert, idx) => (
              <div
                key={idx}
                className={`flex items-start gap-3 p-3 rounded-lg border ${
                  alert.level === 'critical'
                    ? 'bg-red-500/10 border-red-500/30 text-red-300'
                    : alert.level === 'warning'
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                      : 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                }`}
              >
                <span className="text-lg shrink-0">
                  {alert.level === 'critical' ? '🔴' : alert.level === 'warning' ? '⚠️' : 'ℹ️'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{alert.message}</p>
                  {alert.lastDate && mounted && (
                    <p className="text-xs opacity-70 mt-0.5">
                      ბოლო: {new Date(alert.lastDate).toLocaleDateString('ka-GE')}
                    </p>
                  )}
                </div>
                <Link
                  href="/haccp/journals"
                  className="text-xs opacity-70 hover:opacity-100 shrink-0 underline"
                >
                  შევსება →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {alerts.length === 0 && !loading && (
        <div className="mb-6 flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
          <span>✅</span>
          <p className="text-sm font-medium">ყველა ჟურნალი განახლებულია — კრიტიკული გაფრთხილება არ არის</p>
        </div>
      )}

      {/* Journal print section */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-text-secondary mb-3">🖨️ ჟურნალების ბეჭდვა</h2>
        <div className="flex flex-wrap items-end gap-3 p-4 bg-bg-card border border-border rounded-2xl">
          <div>
            <label className="block text-xs text-text-muted mb-1">დან</label>
            <input
              type="date"
              value={printFrom}
              onChange={(e) => setPrintFrom(e.target.value)}
              className="px-3 py-2 bg-bg-secondary border border-border rounded-xl text-sm text-text-primary"
            />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">მდე</label>
            <input
              type="date"
              value={printTo}
              onChange={(e) => setPrintTo(e.target.value)}
              className="px-3 py-2 bg-bg-secondary border border-border rounded-xl text-sm text-text-primary"
            />
          </div>
          <button
            type="button"
            onClick={printAllJournals}
            disabled={printLoading}
            className="px-5 py-2 bg-copper text-white rounded-xl text-sm font-medium hover:bg-copper/90 disabled:opacity-50 transition-colors"
          >
            {printLoading ? '⏳ იტვირთება...' : '🖨️ ყველა ჟურნალის ბეჭდვა'}
          </button>
        </div>
      </div>

      {/* Hazard Analysis Section */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-text-secondary mb-3">
          🔬 საფრთხეების ანალიზი
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              icon: '🦠',
              title: 'ბიოლოგიური',
              color: 'red',
              risks: [
                { stage: 'ნედლეული', risk: 'მიკრობიოლ. დაბინძ.', level: 'HIGH', control: 'შემავ. კონტ.' },
                { stage: 'ფერმენტაცია', risk: 'გარეული საფუვარი', level: 'HIGH', control: 'CCP-2, CIP' },
                { stage: 'ჩამოსხმა', risk: 'პათოგენები', level: 'MED', control: 'სანიტ., CCP-2' },
              ],
            },
            {
              icon: '⚗️',
              title: 'ქიმიური',
              color: 'amber',
              risks: [
                { stage: 'ნედლეული', risk: 'პესტიციდები', level: 'MED', control: 'სერტ. მომწოდ.' },
                { stage: 'CIP', risk: 'საწმ. ქიმიკ. ნარჩ.', level: 'HIGH', control: 'CCP-2, pH კონტ.' },
                { stage: 'მოვლა', risk: 'საპოხი მასალა', level: 'LOW', control: 'FG საპოხი' },
              ],
            },
            {
              icon: '🔩',
              title: 'ფიზიკური',
              color: 'blue',
              risks: [
                { stage: 'ხარშვა', risk: 'უცხო სხეული', level: 'MED', control: 'ფილტრაცია' },
                { stage: 'ჩამოსხმა', risk: 'მინის ნამსხვრ.', level: 'HIGH', control: 'ვიზ. კონტ.' },
                { stage: 'საფუთ.', risk: 'ლითონის ნაწ.', level: 'MED', control: 'მაგნ. სეპ.' },
              ],
            },
          ].map((category) => (
            <div key={category.title}
              className={`bg-bg-card border border-border rounded-2xl overflow-hidden`}>
              <div className={`px-4 py-3 border-b border-border flex items-center gap-2 ${
                category.color === 'red' ? 'bg-red-500/10' :
                category.color === 'amber' ? 'bg-amber-500/10' : 'bg-blue-500/10'
              }`}>
                <span className="text-xl">{category.icon}</span>
                <h3 className={`font-semibold text-sm ${
                  category.color === 'red' ? 'text-red-400' :
                  category.color === 'amber' ? 'text-amber-400' : 'text-blue-400'
                }`}>{category.title} საფრთხეები</h3>
              </div>
              <div className="divide-y divide-border">
                {category.risks.map((risk, i) => (
                  <div key={i} className="px-4 py-2.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-text-primary">{risk.stage}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                        risk.level === 'HIGH' ? 'bg-red-500/20 text-red-400' :
                        risk.level === 'MED' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-emerald-500/20 text-emerald-400'
                      }`}>{risk.level === 'HIGH' ? 'მაღ.' : risk.level === 'MED' ? 'საშ.' : 'დაბ.'}</span>
                    </div>
                    <p className="text-xs text-text-muted">{risk.risk}</p>
                    <p className="text-xs text-copper-light mt-0.5">🛡️ {risk.control}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
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
