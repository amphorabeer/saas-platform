'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV_ITEMS } from '@/constants'

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 h-screen w-[260px] bg-bg-secondary border-r border-border flex flex-col z-40">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <Link href="/" className="flex items-center gap-3">
          <span className="text-3xl">🍺</span>
          <div>
            <h1 className="font-display text-xl font-bold text-copper-light">BrewMaster</h1>
            <p className="text-[10px] text-text-muted uppercase tracking-wider">PRO Edition</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    isActive
                      ? 'bg-copper/20 text-copper-light border border-copper/30'
                      : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-bg-tertiary">
          <div className="w-10 h-10 rounded-full bg-copper/30 flex items-center justify-center text-copper-light font-semibold">
            ნზ
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">ნიკა ზედგინიძე</p>
            <p className="text-xs text-text-muted">მთავარი ტექნოლოგი</p>
          </div>
        </div>
      </div>
    </aside>
  )
}











