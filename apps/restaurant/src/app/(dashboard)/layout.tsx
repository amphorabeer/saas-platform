'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  UtensilsCrossed,
  Grid3X3,
  ShoppingCart,
  ChefHat,
  Users,
  Warehouse,
  Package,
  Receipt,
  UserCircle,
  BarChart3,
  CalendarClock,
  MessageSquareText,
  Settings,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  Wallet,
  FileText,
  CreditCard,
  TrendingUp,
} from 'lucide-react';

type NavItem = { href: string; icon: React.ComponentType<{ className?: string }>; label: string };

const primaryItems: NavItem[] = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'დეშბორდი' },
  { href: '/pos', icon: ShoppingCart, label: 'POS' },
  { href: '/kds', icon: ChefHat, label: 'KDS სამზარეულო' },
  { href: '/reservations', icon: CalendarClock, label: 'რეზერვაცია' },
];

const managementItems: NavItem[] = [
  { href: '/menu', icon: UtensilsCrossed, label: 'მენიუ' },
  { href: '/tables', icon: Grid3X3, label: 'მაგიდები' },
  { href: '/waiters', icon: Users, label: 'ოფიციანტები' },
];

const financesItems: NavItem[] = [
  { href: '/finance', icon: Wallet, label: 'ფინანსები' },
  { href: '/finance/revenue', icon: TrendingUp, label: 'შემოსავლები' },
  { href: '/finance/invoices', icon: FileText, label: 'ინვოისები' },
  { href: '/finance/expenses', icon: CreditCard, label: 'ხარჯები და შესყიდვები' },
  { href: '/finance/pnl', icon: BarChart3, label: 'მოგება-ზარალი' },
  { href: '/sales', icon: Receipt, label: 'გაყიდვები' },
  { href: '/reports', icon: BarChart3, label: 'რეპორტები' },
  { href: '/customers', icon: UserCircle, label: 'მომხმარებლები' },
];

const operationsItems: NavItem[] = [
  { href: '/inventory', icon: Warehouse, label: 'საწყობი' },
  { href: '/purchases', icon: Package, label: 'მომწოდებლები' },
];

const bottomItems: NavItem[] = [
  { href: '/ai-chat', icon: MessageSquareText, label: 'AI ასისტენტი' },
  { href: '/settings', icon: Settings, label: 'პარამეტრები' },
];

const expandableGroups = [
  { id: 'management', label: 'მენეჯმენტი', items: managementItems },
  { id: 'finances', label: 'ფინანსები', items: financesItems },
  { id: 'operations', label: 'ოპერაციები', items: operationsItems },
] as const;

function isPathInItems(pathname: string, items: NavItem[]) {
  return items.some((i) => i.href === pathname || (i.href !== '/' && pathname.startsWith(i.href + '/')));
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    management: true,
    finances: true,
    operations: true,
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [status, router]);

  useEffect(() => {
    setExpanded((prev) => {
      const next = { ...prev };
      if (isPathInItems(pathname, managementItems)) next.management = true;
      if (isPathInItems(pathname, financesItems)) next.finances = true;
      if (isPathInItems(pathname, operationsItems)) next.operations = true;
      return next;
    });
  }, [pathname]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0F172A]">
        <span className="text-slate-400">იტვირთება...</span>
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  const restCode = (session.user as { restCode?: string }).restCode ?? '';
  const isFullScreen = pathname === '/pos' || pathname === '/kds';

  const linkClass = (href: string) => {
    const isActive = pathname === href || (href !== '/' && pathname.startsWith(href + '/'));
    return `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
      isActive ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'
    }`;
  };

  const renderNavLink = (item: NavItem) => {
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        className={linkClass(item.href)}
        onClick={() => setMobileOpen(false)}
      >
        <Icon className="h-5 w-5 shrink-0" />
        {item.label}
      </Link>
    );
  };

  return (
    <div className="flex min-h-screen bg-[#0F172A]">
      {!isFullScreen && (
      <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-white/5 bg-[#1E293B]/80 backdrop-blur-xl">
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/5 px-4">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-red-500 text-white">
              <UtensilsCrossed className="h-5 w-5" />
            </div>
            <span className="font-semibold text-white">RestoPOS</span>
            {restCode && (
              <span className="rounded bg-white/10 px-2 py-0.5 text-xs font-mono text-slate-300">
                {restCode}
              </span>
            )}
          </Link>
          <button
            type="button"
            className="lg:hidden rounded p-2 text-slate-400 hover:bg-white/5 hover:text-white"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex min-h-0 flex-1 flex-col overflow-hidden p-3">
          <div className="space-y-0.5 overflow-y-auto">
            {primaryItems.map(renderNavLink)}

            {expandableGroups.map((group) => {
              const isExpanded = expanded[group.id] ?? true;
              return (
                <div key={group.id} className="pt-2">
                  <button
                    type="button"
                    onClick={() => setExpanded((p) => ({ ...p, [group.id]: !isExpanded }))}
                    className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                    aria-expanded={isExpanded}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0" />
                    )}
                    {group.label}
                  </button>
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-0.5 pt-1">
                          {group.items.map(renderNavLink)}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          <div className="mt-auto shrink-0 border-t border-white/5 pt-3">
            <div className="space-y-0.5">
              {bottomItems.map(renderNavLink)}
            </div>
          </div>
        </nav>

        <div className="shrink-0 border-t border-white/5 p-3">
          <div className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-500/20 text-sm font-medium text-orange-400">
              {(session.user.name ?? session.user.email ?? '?').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">
                {session.user.name ?? 'მომხმარებელი'}
              </p>
              <p className="truncate text-xs text-slate-400">{session.user.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="mt-2 w-full rounded-lg px-3 py-2 text-left text-sm text-slate-400 hover:bg-white/5 hover:text-white"
          >
            გასვლა
          </button>
        </div>
      </aside>
      )}

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 bg-black/50 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Main */}
      <div className={`flex flex-1 flex-col ${isFullScreen ? 'pl-0' : 'pl-64'}`}>
        {!isFullScreen && (
          <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-white/5 bg-[#0F172A]/80 px-6 backdrop-blur-sm">
            <button
              type="button"
              className="lg:hidden rounded p-2 text-slate-400 hover:bg-white/5"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex-1" />
          </header>
        )}
        <main className={`flex-1 overflow-auto ${isFullScreen ? 'p-0' : 'p-6'}`}>{children}</main>
      </div>
    </div>
  );
}
