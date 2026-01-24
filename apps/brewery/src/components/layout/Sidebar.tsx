'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { NAV_ITEMS } from '@/constants'
import { usePlan } from '@/lib/usePlan'
import { PLAN_NAMES, getRequiredPlanForFeature, PlanFeatures } from '@/lib/plan-features'

// Role display mapping
const roleLabels: Record<string, string> = {
  OWNER: 'მფლობელი',
  SUPER_ADMIN: 'სუპერ ადმინი',
  ADMIN: 'ადმინისტრატორი',
  MANAGER: 'მენეჯერი',
  BREWER: 'მეღვინე',
  OPERATOR: 'ოპერატორი',
  VIEWER: 'მნახველი',
}

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { plan, hasFeature, loading: planLoading } = usePlan()

  // Get user info from session
  const user = session?.user
  const userName = user?.name || 'მომხმარებელი'
  const userRole = (user as any)?.role || 'OPERATOR'
  const roleLabel = roleLabels[userRole] || userRole

  // Generate initials from name
  const getInitials = (name: string) => {
    const parts = name.trim().split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  const initials = getInitials(userName)

  // Filter nav items based on plan
  const getNavItemAccess = (item: typeof NAV_ITEMS[0]) => {
    if (item.alwaysShow) return { hasAccess: true, locked: false };
    if (!item.requiredFeature) return { hasAccess: true, locked: false };
    
    const hasAccess = hasFeature(item.requiredFeature as keyof PlanFeatures['features']);
    return { hasAccess, locked: !hasAccess };
  };

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

      {/* Plan Badge */}
      {plan && (
        <div className="px-4 py-2 border-b border-border">
          <div className="flex items-center justify-between px-3 py-2 bg-bg-tertiary rounded-lg">
            <span className="text-xs text-text-muted">პაკეტი:</span>
            <span className={`text-xs font-semibold ${
              plan === 'ENTERPRISE' ? 'text-purple-400' :
              plan === 'PROFESSIONAL' ? 'text-amber-400' :
              'text-slate-400'
            }`}>
              {PLAN_NAMES[plan]}
            </span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href
            const { hasAccess, locked } = getNavItemAccess(item)
            
            if (locked) {
              // Locked item - show with lock icon
              const requiredPlan = item.requiredFeature 
                ? getRequiredPlanForFeature(item.requiredFeature as keyof PlanFeatures['features'])
                : 'PROFESSIONAL';
              
              return (
                <li key={item.href}>
                  <div
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-text-muted/50 cursor-not-allowed group relative"
                    title={`საჭიროა ${PLAN_NAMES[requiredPlan]} პაკეტი`}
                  >
                    <span className="text-lg opacity-50">{item.icon}</span>
                    <span className="text-sm font-medium flex-1">{item.label}</span>
                    <span className="text-xs">🔒</span>
                    
                    {/* Tooltip on hover */}
                    <div className="absolute left-full ml-2 px-3 py-2 bg-slate-800 rounded-lg text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-lg">
                      საჭიროა {PLAN_NAMES[requiredPlan]}
                      <a 
                        href="https://geobiz.app/modules/brewery/pricing"
                        className="block mt-1 text-amber-400 hover:underline pointer-events-auto"
                        target="_blank"
                      >
                        განახლება →
                      </a>
                    </div>
                  </div>
                </li>
              )
            }
            
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
        <Link href="/settings" className="block">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-bg-tertiary hover:bg-bg-tertiary/80 transition-colors cursor-pointer">
            <div className="w-10 h-10 rounded-full bg-copper/30 flex items-center justify-center text-copper-light font-semibold">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{userName}</p>
              <p className="text-xs text-text-muted">{roleLabel}</p>
            </div>
          </div>
        </Link>
      </div>
    </aside>
  )
}