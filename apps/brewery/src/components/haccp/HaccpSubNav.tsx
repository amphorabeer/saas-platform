'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/haccp', label: 'დეშბორდი' },
  { href: '/haccp/ccp', label: 'CCP' },
  { href: '/haccp/journals', label: 'ჟურნალები' },
  { href: '/haccp/sop', label: 'SOP' },
  { href: '/haccp/documents', label: 'დოკუმენტები' },
  { href: '/haccp/settings', label: 'კონფიგურაცია' },
] as const

export function HaccpSubNav() {
  const pathname = usePathname()
  return (
    <nav className="flex flex-wrap gap-2 mb-6 pb-4 border-b border-border print:hidden">
      {links.map((l) => {
        const active =
          l.href === '/haccp' ? pathname === '/haccp' : pathname.startsWith(l.href)
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              active
                ? 'bg-copper/20 text-copper-light border border-copper/30'
                : 'bg-bg-tertiary text-text-secondary hover:text-text-primary border border-transparent'
            }`}
          >
            {l.label}
          </Link>
        )
      })}
    </nav>
  )
}
