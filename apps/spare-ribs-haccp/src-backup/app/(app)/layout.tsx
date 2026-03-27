'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Thermometer, Wind, Archive,
  Droplets, Package, FlaskConical, AlertTriangle,
  ClipboardCheck, BarChart3, ShieldCheck, LogOut,
  ChevronDown, ChevronRight, Menu, X
} from 'lucide-react'
import { useState } from 'react'

const nav = [
  { href: '/dashboard', label: 'Dashboard / დ.', labelKa: 'Dashboard', icon: LayoutDashboard },
  { divider: 'CCP კონტ. / CCP Control' },
  { href: '/ccp-1', label: 'CCP-1 Sous-Vide', sub: '≥74°C / 12სთ', icon: Thermometer, dot: 'ok' },
  { href: '/ccp-2', label: 'CCP-2 Blast Chill', sub: '≤4°C / 90წთ', icon: Wind, dot: 'warn' },
  { href: '/ccp-3', label: 'CCP-3 შ. / Storage', sub: '0–4°C / -18°C', icon: Archive, dot: 'ok' },
  { href: '/ccp-4', label: 'CCP-4 CIP', sub: 'NaOH / PAA', icon: Droplets, dot: 'ok' },
  { divider: 'ჟ ურ. / Journals' },
  { href: '/raw-materials', label: 'ნ-ლ. F-005 / Raw Mat.', icon: Package },
  { href: '/lab-tests', label: 'Lab F-007', icon: FlaskConical },
  { href: '/corrective-actions', label: 'კ. ქ. F-006 / Corr. Act.', icon: AlertTriangle, badge: 1, badgeColor: 'bg-red-500' },
  { divider: 'სისტ. / System' },
  { href: '/audit', label: 'შ. აუდ. / Audit', icon: ClipboardCheck },
  { href: '/reports', label: 'ანგ. / Reports', icon: BarChart3 },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-56 bg-white border-r border-gray-200 flex flex-col
        transform transition-transform duration-200
        lg:relative lg:translate-x-0
        ${open ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-gray-100">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-gray-900">Spare Ribs</div>
            <div className="text-[10px] text-gray-400">HACCP სისტ.</div>
          </div>
          <button onClick={() => setOpen(false)} className="ml-auto lg:hidden p-1 rounded hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-2 overflow-y-auto">
          {nav.map((item, i) => {
            if ('divider' in item) {
              return (
                <div key={i} className="px-4 pt-4 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  {item.divider}
                </div>
              )
            }
            const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href!))
            return (
              <Link
                key={item.href}
                href={item.href!}
                onClick={() => setOpen(false)}
                className={`nav-it ${active ? 'active' : ''}`}
              >
                {'dot' in item && (
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    item.dot === 'ok' ? 'bg-green-500' :
                    item.dot === 'warn' ? 'bg-orange-400' : 'bg-red-500'
                  }`} />
                )}
                {item.icon && <item.icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-blue-600' : 'text-gray-400'}`} />}
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{item.label}</div>
                  {'sub' in item && item.sub && (
                    <div className="text-[10px] text-gray-400">{item.sub}</div>
                  )}
                </div>
                {'badge' in item && item.badge! > 0 && (
                  <span className={`text-[10px] text-white font-bold px-1.5 py-0.5 rounded-full ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-gray-100 p-3">
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-gray-50 cursor-pointer">
            <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 text-xs font-bold">ა</div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-gray-800">ადმინი</div>
              <div className="text-[10px] text-gray-400">admin@sparerib.ge</div>
            </div>
            <LogOut className="w-3.5 h-3.5 text-gray-400" />
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {open && <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-4 py-2.5 flex items-center gap-3 flex-shrink-0">
          <button onClick={() => setOpen(true)} className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100">
            <Menu className="w-4 h-4" />
          </button>
          <div className="text-xs text-gray-500">
            <span suppressHydrationWarning>
              {new Date().toLocaleDateString('ka-GE', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="badge badge-green text-[10px]">● სისტ. მ.</span>
            <span className="badge badge-orange text-[10px]">⚠ 1 გ-ხ.</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
