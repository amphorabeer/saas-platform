'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import {
  ShieldCheck, AlertTriangle,
  Package, FlaskConical, ClipboardCheck,
  TrendingUp, LogOut, RefreshCw
} from 'lucide-react'

interface Stats {
  logsToday: number
  devsToday: number
  openCa: number
  batchesOnHold: number
  complianceRate: number
  ccpBreakdown: { ccp: string; total: number; compliant: number; rate: number }[]
  recentLogs: {
    id: string
    ccpNumber: string
    batchLot: string
    isCompliant: boolean
    loggedAt: string
  }[]
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/haccp/stats')
      if (res.ok) setStats(await res.json())
    } catch { }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchStats() }, [])

  const ccpCards = [
    { num: 'CCP-1', slug: 'ccp-1', nameKa: 'Sous-Vide — SmartVide 4', limit: '≥74°C / ≥12საათი' },
    { num: 'CCP-2', slug: 'ccp-2', nameKa: 'სწრაფი გაციება', limit: '≤4°C / ≤90წუთი' },
    { num: 'CCP-3', slug: 'ccp-3', nameKa: 'შენახვის ტემპერატურა', limit: 'მაცივარი: 0–4°C | საყინ.: ≤-18°C' },
    { num: 'CCP-4', slug: 'ccp-4', nameKa: 'CIP სანიტარია', limit: 'NaOH 1.5–2% | PAA 150–200ppm' },
  ].map(c => {
    const bd = stats?.ccpBreakdown?.find(b => b.ccp === c.num)
    return { ...c, rate: bd?.rate ?? 100, total: bd?.total ?? 0 }
  })

  return (
    <div className="page">
      {/* სათაური */}
      <div className="page-hdr">
        <div>
          <h1 className="page-title">მთავარი - HACCP</h1>
          <p className="page-sub" suppressHydrationWarning>
            Spare Ribs |{' '}
            <span suppressHydrationWarning>
              {(() => {
                const d = new Date()
                return `${d.getDate()} ${d.toLocaleDateString('ka-GE', { month: 'long' })}, ${d.getFullYear()}`
              })()}
            </span>
            {session?.user && <span className="ml-2 text-gray-400"> | {session.user.name}</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchStats} className="btn-secondary btn-sm" title="განახლება">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link href="/corrective-actions/new" className="btn-danger btn-sm">
            + გადახრის ოქმი F-006
          </Link>
          <button onClick={() => signOut({ callbackUrl: '/login' })} className="btn-secondary btn-sm" title="გასვლა">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* გაფრთხილებები */}
      {!loading && (stats?.batchesOnHold || 0) > 0 && (
        <div className="alert-err">
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800">{stats!.batchesOnHold} პარტია HOLD სტატუსზე</p>
            <p className="text-xs text-red-600">CCP გადახრის გამო — შეავსე F-006</p>
          </div>
          <Link href="/corrective-actions" className="btn-sm btn-secondary text-xs">დეტ. →</Link>
        </div>
      )}

      {!loading && (stats?.openCa || 0) > 0 && (
        <div className="alert-warn">
          <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-orange-800">{stats!.openCa} ღია კორექტ. ქმედება (F-006)</p>
            <p className="text-xs text-orange-600">დახურვა სავალდებულოა</p>
          </div>
          <Link href="/corrective-actions" className="btn-sm btn-secondary text-xs">გახსნა →</Link>
        </div>
      )}

      {/* სტატისტიკა */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="stat">
          <div className="stat-lbl">ჩანაწერი დღეს</div>
          <div className="stat-val">{loading ? '...' : stats?.logsToday || 0}</div>
        </div>
        <div className="stat">
          <div className="stat-lbl">გადახრა</div>
          <div className={`stat-val ${(stats?.devsToday || 0) > 0 ? 'text-red-600' : 'text-green-700'}`}>
            {loading ? '...' : stats?.devsToday || 0}
          </div>
        </div>
        <div className="stat">
          <div className="stat-lbl">ღია ოქმები</div>
          <div className={`stat-val ${(stats?.openCa || 0) > 0 ? 'text-red-600' : 'text-green-700'}`}>
            {loading ? '...' : stats?.openCa || 0}
          </div>
        </div>
        <div className="stat">
          <div className="stat-lbl">შესაბამისობა 30დ.</div>
          <div className={`stat-val ${(stats?.complianceRate || 100) >= 95 ? 'text-green-700' : 'text-orange-600'}`}>
            {loading ? '...' : `${stats?.complianceRate?.toFixed(1) || 100}%`}
          </div>
        </div>
      </div>

      {/* CCP კარტები */}
      <div>
        <h2 className="text-sm font-semibold text-gray-600 mb-3 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          CCP სტატუსი
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {ccpCards.map(c => {
            const ok = c.rate >= 95 || c.total === 0
            return (
              <div key={c.num} className={`card border-l-4 ${ok ? 'border-l-green-500' : 'border-l-red-500'} p-4`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="text-[10px] font-bold text-gray-400">{c.num}</div>
                    <div className="text-sm font-semibold text-gray-800">{c.nameKa}</div>
                    <div className="text-[10px] text-gray-400">{c.limit}</div>
                  </div>
                  <span className={`badge ${ok ? 'badge-green' : 'badge-red'}`}>
                    {c.total === 0 ? 'ჩანაწერი არ არის' : `${c.rate.toFixed(0)}%`}
                  </span>
                </div>
                {c.total > 0 && (
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-3">
                    <div className={`h-full rounded-full ${ok ? 'bg-green-500' : 'bg-red-500'}`}
                      style={{ width: `${c.rate}%` }} />
                  </div>
                )}
                <div className="flex gap-2">
                  <Link href={`/${c.slug}/new`} className="btn-primary btn-sm flex-1 text-center">+ ახალი</Link>
                  <Link href={`/${c.slug}`} className="btn-secondary btn-sm flex-1 text-center">ჟურნალი</Link>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ქვედა ნაწილი */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <h2 className="text-sm font-semibold text-gray-600 mb-3">სწრაფი ბმულები</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { href: '/raw-materials/new', label: 'ნედლეული F-005', icon: Package, bg: 'bg-blue-50', ic: 'text-blue-600' },
              { href: '/lab-tests/new', label: 'Lab ტესტი F-007', icon: FlaskConical, bg: 'bg-purple-50', ic: 'text-purple-600' },
              { href: '/corrective-actions/new', label: 'გადახრის ოქმი F-006', icon: AlertTriangle, bg: 'bg-red-50', ic: 'text-red-600' },
              { href: '/audit', label: 'შიდა აუდიტი', icon: ClipboardCheck, bg: 'bg-green-50', ic: 'text-green-600' },
            ].map(l => (
              <Link key={l.href} href={l.href}
                className="card flex items-center gap-3 hover:border-blue-300 transition-all p-3">
                <div className={`p-2 rounded-lg ${l.bg}`}><l.icon className={`w-4 h-4 ${l.ic}`} /></div>
                <div className="text-xs font-semibold text-gray-800">{l.label}</div>
              </Link>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-title"><TrendingUp className="w-4 h-4 text-blue-600" />ბოლო ჩანაწერები</div>
          {loading ? (
            <div className="text-center py-6 text-sm text-gray-400">იტვირთება...</div>
          ) : !stats?.recentLogs?.length ? (
            <div className="text-center py-6">
              <p className="text-sm text-gray-400 mb-2">ჩანაწერი არ არის</p>
              <Link href="/ccp-1/new" className="btn-primary btn-sm">+ პირველი ჩანაწერი</Link>
            </div>
          ) : (
            <table className="tbl">
              <thead><tr><th>LOT</th><th>CCP</th><th>სტატუსი</th><th>თარიღი</th></tr></thead>
              <tbody>
                {stats.recentLogs.slice(0, 6).map(l => (
                  <tr key={l.id}>
                    <td><span className="font-mono text-xs text-blue-700">{l.batchLot}</span></td>
                    <td><span className="badge badge-blue text-xs">{l.ccpNumber}</span></td>
                    <td><span className={`badge ${l.isCompliant ? 'badge-green' : 'badge-red'}`}>{l.isCompliant ? 'ნორმა' : '⚠ გადახ.'}</span></td>
                    <td className="text-xs text-gray-400">
                      {new Date(l.loggedAt).toLocaleDateString('ka-GE', { day: '2-digit', month: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
