'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  ShoppingCart,
  ChefHat,
  Grid3X3,
  CalendarClock,
  ChevronRight,
} from 'lucide-react';
import { DashboardReservations } from '@/components/reservations/DashboardReservations';
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { SalesChart } from '@/components/dashboard/SalesChart';
import { TopItemsChart } from '@/components/dashboard/TopItemsChart';

const quickActions = [
  { href: '/pos', label: 'ახალი შეკვეთა', icon: ShoppingCart },
  { href: '/kds', label: 'KDS', icon: ChefHat },
  { href: '/tables', label: 'მაგიდები', icon: Grid3X3 },
  { href: '/reservations', label: 'რეზერვაცია', icon: CalendarClock },
];

function KDSStatsWidget() {
  const [stats, setStats] = useState<{ new: number; preparing: number; ready: number } | null>(null);
  useEffect(() => {
    fetch('/api/kds/stats')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setStats(data));
  }, []);
  if (stats === null) {
    return <div className="mt-4 text-slate-500 text-sm">იტვირთება...</div>;
  }
  return (
    <div className="mt-4 flex flex-wrap gap-6">
      <span className="text-red-400 font-semibold">ახალი: {stats.new}</span>
      <span className="text-amber-400 font-semibold">მომზადება: {stats.preparing}</span>
      <span className="text-emerald-400 font-semibold">მზადაა: {stats.ready}</span>
    </div>
  );
}

function DashboardChartsWidget() {
  const [charts, setCharts] = useState<{ last7Days: Array<{ date: string; totalSales: number }>; topItems: Array<{ name: string; quantity: number; revenue: number }> } | null>(null);
  useEffect(() => {
    fetch('/api/dashboard/charts')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setCharts(d));
  }, []);
  if (!charts) return <div className="h-64 flex items-center justify-center text-slate-500">იტვირთება...</div>;
  return (
    <div className="h-64">
      <SalesChart data={charts.last7Days} />
    </div>
  );
}

function DashboardTopItemsWidget() {
  const [charts, setCharts] = useState<{ topItems: Array<{ name: string; quantity: number; revenue: number }> } | null>(null);
  useEffect(() => {
    fetch('/api/dashboard/charts')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setCharts(d));
  }, []);
  if (!charts) return <div className="h-64 flex items-center justify-center text-slate-500">იტვირთება...</div>;
  return (
    <div className="h-64">
      <TopItemsChart data={charts.topItems} />
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<{
    totalSales: number;
    orderCount: number;
    guestCount: number;
    avgCheck: number;
    salesChangePercent: number;
    ordersChangePercent: number;
  } | null>(null);

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setStats(d));
  }, []);

  return (
    <div className="space-y-8">
      <motion.h1
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-bold text-white"
      >
        დეშბორდი
      </motion.h1>

      {stats ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          <DashboardStats
            totalSales={stats.totalSales}
            orderCount={stats.orderCount}
            guestCount={stats.guestCount}
            avgCheck={stats.avgCheck}
            salesChangePercent={stats.salesChangePercent}
            ordersChangePercent={stats.ordersChangePercent}
          />
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-white/5 bg-[#1E293B]/80 p-6 backdrop-blur-sm">
            <p className="text-sm text-slate-400">იტვირთება...</p>
          </div>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex flex-wrap gap-3"
      >
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.href}
              href={action.href}
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#1E293B]/80 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/5"
            >
              <Icon className="h-4 w-4" />
              {action.label}
            </Link>
          );
        })}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="rounded-xl border border-white/5 bg-[#1E293B]/80 p-6 backdrop-blur-sm"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-slate-400">სამზარეულო (KDS)</h3>
          <Link
            href="/kds"
            className="flex items-center gap-1 text-sm font-medium text-orange-400 hover:text-orange-300"
          >
            KDS ეკრანზე გადასვლა
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <KDSStatsWidget />
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
      >
        <DashboardReservations />
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-1 gap-6 lg:grid-cols-2"
      >
        <div className="rounded-xl border border-white/5 bg-[#1E293B]/80 p-6 backdrop-blur-sm">
          <h3 className="text-sm font-medium text-slate-400">ბოლო 7 დღის გაყიდვები</h3>
          <div className="mt-4">
            <DashboardChartsWidget />
          </div>
        </div>
        <div className="rounded-xl border border-white/5 bg-[#1E293B]/80 p-6 backdrop-blur-sm">
          <h3 className="text-sm font-medium text-slate-400">პოპულარული კერძები (top 5)</h3>
          <div className="mt-4">
            <DashboardTopItemsWidget />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
