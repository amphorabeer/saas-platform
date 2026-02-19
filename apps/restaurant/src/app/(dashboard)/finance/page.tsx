'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Wallet, FileText, Package, CreditCard, Receipt, BarChart3, ArrowRight } from 'lucide-react';

type DashboardStats = {
  monthRevenue?: number;
  monthExpenses?: number;
  monthProfit?: number;
  marginPercent?: number;
  overdueInvoices?: { count: number; total: number };
  overduePurchases?: { count: number; total: number };
};

export default function FinancePage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/finance/dashboard', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setStats(data ?? null);
      })
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  const links = [
    { href: '/finance/invoices', icon: FileText, label: 'ინვოისები' },
    { href: '/finance/purchases', icon: Package, label: 'შესყიდვები' },
    { href: '/finance/expenses', icon: CreditCard, label: 'ხარჯები' },
    { href: '/finance/pnl', icon: BarChart3, label: 'მოგება-ზარალი (P&L)' },
    { href: '/sales', icon: Receipt, label: 'გაყიდვები' },
    { href: '/reports', icon: BarChart3, label: 'რეპორტები' },
  ];

  return (
    <div className="space-y-8 p-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-orange-500/20 p-3">
          <Wallet className="h-8 w-8 text-orange-400" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-white">ფინანსები</h1>
          <p className="text-slate-400">შემოსავალი, ხარჯები, ინვოისები და შესყიდვები</p>
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border border-white/10 bg-[#1E293B]/50 p-8 text-center text-slate-400">იტვირთება...</div>
      ) : stats ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-white/10 bg-[#1E293B]/50 p-4">
            <p className="text-sm text-slate-400">თვის შემოსავალი</p>
            <p className="text-xl font-bold text-white">₾{(stats.monthRevenue ?? 0).toFixed(2)}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#1E293B]/50 p-4">
            <p className="text-sm text-slate-400">თვის ხარჯები</p>
            <p className="text-xl font-bold text-white">₾{(stats.monthExpenses ?? 0).toFixed(2)}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#1E293B]/50 p-4">
            <p className="text-sm text-slate-400">წმინდა მოგება</p>
            <p className="text-xl font-bold text-emerald-400">₾{(stats.monthProfit ?? 0).toFixed(2)}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#1E293B]/50 p-4">
            <p className="text-sm text-slate-400">მარჟა %</p>
            <p className="text-xl font-bold text-white">{(stats.marginPercent ?? 0).toFixed(1)}%</p>
          </div>
        </div>
      ) : null}

      {stats?.overdueInvoices && (stats.overdueInvoices.count > 0) && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="font-medium text-amber-300">ვადაგადაცილებული ინვოისები: {stats.overdueInvoices.count} — ₾{stats.overdueInvoices.total.toFixed(2)}</p>
          <Link href="/finance/invoices?status=OVERDUE" className="mt-2 inline-block text-sm text-amber-400 hover:underline">ნახვა →</Link>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {links.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center justify-between rounded-xl border border-white/10 bg-[#1E293B]/50 p-4 text-white transition hover:border-orange-500/30 hover:bg-white/5"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-white/10 p-2">
                <Icon className="h-5 w-5" />
              </div>
              <span className="font-medium">{label}</span>
            </div>
            <ArrowRight className="h-5 w-5 text-slate-500" />
          </Link>
        ))}
      </div>
    </div>
  );
}
