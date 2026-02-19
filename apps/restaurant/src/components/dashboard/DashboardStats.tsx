'use client';

import { TrendingUp, Receipt, Users, Wallet } from 'lucide-react';
import { KPICard } from '@/components/reports/KPICard';

export function DashboardStats({
  totalSales,
  orderCount,
  guestCount,
  avgCheck,
  salesChangePercent,
  ordersChangePercent,
}: {
  totalSales: number;
  orderCount: number;
  guestCount: number;
  avgCheck: number;
  salesChangePercent: number;
  ordersChangePercent: number;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-xl border border-white/5 bg-[#1E293B]/80 p-6 backdrop-blur-sm">
        <div className="mb-3 inline-flex rounded-lg bg-gradient-to-br from-orange-500 to-red-500 p-2 text-white">
          <TrendingUp className="h-5 w-5" />
        </div>
        <p className="text-sm text-slate-400">დღის გაყიდვები</p>
        <p className="mt-1 text-2xl font-bold text-white">₾{totalSales.toFixed(2)}</p>
        {salesChangePercent !== 0 && (
          <p className={`mt-0.5 text-xs ${salesChangePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {salesChangePercent >= 0 ? '↑' : '↓'} {Math.abs(salesChangePercent).toFixed(1)}% გუშინთან შედარებით
          </p>
        )}
      </div>
      <div className="rounded-xl border border-white/5 bg-[#1E293B]/80 p-6 backdrop-blur-sm">
        <div className="mb-3 inline-flex rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 p-2 text-white">
          <Receipt className="h-5 w-5" />
        </div>
        <p className="text-sm text-slate-400">შეკვეთები</p>
        <p className="mt-1 text-2xl font-bold text-white">{orderCount}</p>
        {ordersChangePercent !== 0 && (
          <p className={`mt-0.5 text-xs ${ordersChangePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {ordersChangePercent >= 0 ? '↑' : '↓'} {Math.abs(ordersChangePercent).toFixed(1)}% გუშინთან შედარებით
          </p>
        )}
      </div>
      <div className="rounded-xl border border-white/5 bg-[#1E293B]/80 p-6 backdrop-blur-sm">
        <div className="mb-3 inline-flex rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 p-2 text-white">
          <Users className="h-5 w-5" />
        </div>
        <p className="text-sm text-slate-400">სტუმრები</p>
        <p className="mt-1 text-2xl font-bold text-white">{guestCount}</p>
      </div>
      <div className="rounded-xl border border-white/5 bg-[#1E293B]/80 p-6 backdrop-blur-sm">
        <div className="mb-3 inline-flex rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 p-2 text-white">
          <Wallet className="h-5 w-5" />
        </div>
        <p className="text-sm text-slate-400">საშუალო ჩეკი</p>
        <p className="mt-1 text-2xl font-bold text-white">₾{avgCheck.toFixed(2)}</p>
      </div>
    </div>
  );
}
