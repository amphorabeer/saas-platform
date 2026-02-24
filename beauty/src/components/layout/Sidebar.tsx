'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { cn, getInitials } from '@/lib/utils';
import {
  Scissors,
  LayoutDashboard,
  Calendar,
  Users,
  Sparkles,
  UserCircle,
  CreditCard,
  Package,
  BarChart3,
  DollarSign,
  Gift,
  Star,
  Globe,
  Settings,
  Bot,
  LogOut,
  ChevronLeft,
  Menu,
} from 'lucide-react';

const navigation = [
  { name: 'დეშბორდი', href: '/dashboard', icon: LayoutDashboard },
  { name: 'ჯავშნები', href: '/appointments', icon: Calendar },
  { name: 'სპეციალისტები', href: '/staff', icon: Users },
  { name: 'სერვისები', href: '/services', icon: Sparkles },
  { name: 'კლიენტები', href: '/clients', icon: UserCircle },
  { name: 'POS / გადახდა', href: '/pos', icon: CreditCard },
  { name: 'ინვენტარი', href: '/inventory', icon: Package },
  { name: 'რეპორტები', href: '/reports', icon: BarChart3 },
  { name: 'ფინანსები', href: '/finance', icon: DollarSign },
  { name: 'ლოიალობა', href: '/loyalty', icon: Gift },
  { name: 'შეფასებები', href: '/reviews', icon: Star },
  { name: 'ონლაინ ჯავშანი', href: '/booking', icon: Globe },
  { name: 'AI ასისტენტი', href: '/ai-assistant', icon: Bot },
  { name: 'პარამეტრები', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-dark-800 border border-dark-700 rounded-lg text-dark-300 hover:text-white"
      >
        <Menu size={20} />
      </button>

      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed top-0 left-0 z-40 h-screen bg-dark-800 border-r border-dark-700 flex flex-col transition-all duration-300',
          collapsed ? 'w-[72px]' : 'w-64',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex items-center gap-3 px-4 h-16 border-b border-dark-700 shrink-0">
          <div className="w-9 h-9 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center shrink-0">
            <Scissors className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-white truncate">BeautySalon PRO</h1>
              <p className="text-[10px] text-dark-400 truncate">
                {session?.user?.salonName || 'სილამაზის სალონი'}
              </p>
            </div>
          )}
          <button
            onClick={() => {
              setCollapsed(!collapsed);
              setMobileOpen(false);
            }}
            className={cn(
              'ml-auto p-1.5 text-dark-400 hover:text-white rounded-lg hover:bg-dark-700 transition-colors hidden lg:block',
              collapsed && 'ml-0'
            )}
          >
            <ChevronLeft
              size={16}
              className={cn('transition-transform', collapsed && 'rotate-180')}
            />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;

            if (item.disabled) {
              return (
                <div
                  key={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-dark-500 cursor-not-allowed',
                    collapsed && 'justify-center px-2'
                  )}
                  title={collapsed ? item.name : undefined}
                >
                  <Icon size={20} className="shrink-0" />
                  {!collapsed && <span className="text-sm truncate">{item.name}</span>}
                  {!collapsed && (
                    <span className="ml-auto text-[10px] bg-dark-700 text-dark-500 px-1.5 py-0.5 rounded">
                      მალე
                    </span>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                  isActive
                    ? 'bg-primary-500/10 text-primary-400'
                    : 'text-dark-300 hover:bg-dark-700 hover:text-white',
                  collapsed && 'justify-center px-2'
                )}
                title={collapsed ? item.name : undefined}
              >
                <Icon size={20} className="shrink-0" />
                {!collapsed && <span className="text-sm truncate">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-dark-700 p-3">
          {session?.user && (
            <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
              <div className="w-8 h-8 bg-primary-500/20 text-primary-400 rounded-lg flex items-center justify-center text-xs font-bold shrink-0">
                {getInitials(session.user.name || 'U')}
              </div>
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">{session.user.name}</p>
                  <p className="text-[10px] text-dark-400 truncate">
                    {session.user.role === 'OWNER' ? 'მფლობელი' : 'სპეციალისტი'}
                  </p>
                </div>
              )}
              {!collapsed && (
                <button
                  onClick={() => signOut({ callbackUrl: '/auth/login' })}
                  className="p-1.5 text-dark-400 hover:text-red-400 rounded-lg hover:bg-dark-700 transition-colors"
                  title="გასვლა"
                >
                  <LogOut size={16} />
                </button>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
