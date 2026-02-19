'use client';

import { TrendingUp, Receipt, Users, Wallet, Gift, MessageCircle } from 'lucide-react';
import { KPICard } from '@/components/reports/KPICard';

export function DailySummary({
  date,
  totalSales,
  orderCount,
  avgCheck,
  guestCount,
  tipsTotal,
  discountsTotal,
  paymentBreakdown,
  typeBreakdown,
  topItems,
}: {
  date: string;
  totalSales: number;
  orderCount: number;
  avgCheck: number;
  guestCount: number;
  tipsTotal: number;
  discountsTotal: number;
  paymentBreakdown: Record<string, { amount: number; count: number }>;
  typeBreakdown: Record<string, { amount: number; count: number }>;
  topItems: Array<{ name: string; quantity: number; revenue: number }>;
}) {
  const TYPE_LABEL: Record<string, string> = {
    DINE_IN: 'Dine In',
    TAKEAWAY: 'Take Away',
    DELIVERY: 'Delivery',
  };
  const PAY_LABEL: Record<string, string> = {
    CASH: 'ნაღდი',
    CARD: 'ბარათი',
    SPLIT: 'Split',
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <KPICard label="სულ გაყიდვები" value={`₾${totalSales.toFixed(2)}`} icon={TrendingUp} gradient="from-orange-500 to-red-500" />
        <KPICard label="შეკვეთები" value={orderCount} icon={Receipt} gradient="from-emerald-500 to-teal-500" />
        <KPICard label="საშუალო ჩეკი" value={`₾${avgCheck.toFixed(2)}`} icon={Wallet} gradient="from-blue-500 to-cyan-500" />
        <KPICard label="სტუმრები" value={guestCount} icon={Users} gradient="from-violet-500 to-purple-500" />
        <KPICard label="Tips ჯამი" value={`₾${tipsTotal.toFixed(2)}`} icon={MessageCircle} gradient="from-amber-500 to-orange-500" />
        <KPICard label="ფასდაკლებები" value={`₾${discountsTotal.toFixed(2)}`} icon={Gift} gradient="from-slate-500 to-slate-600" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-[#1E293B]/50 p-4">
          <h3 className="mb-3 text-sm font-medium text-slate-400">გადახდის მეთოდები</h3>
          <ul className="space-y-2">
            {Object.entries(paymentBreakdown).map(([method, data]) => (
              <li key={method} className="flex justify-between text-sm">
                <span className="text-slate-300">{PAY_LABEL[method] ?? method}</span>
                <span className="text-emerald-400">₾{data.amount.toFixed(2)} ({data.count})</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#1E293B]/50 p-4">
          <h3 className="mb-3 text-sm font-medium text-slate-400">შეკვეთის ტიპები</h3>
          <ul className="space-y-2">
            {Object.entries(typeBreakdown).map(([type, data]) => (
              <li key={type} className="flex justify-between text-sm">
                <span className="text-slate-300">{TYPE_LABEL[type] ?? type}</span>
                <span className="text-emerald-400">₾{data.amount.toFixed(2)} ({data.count})</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-[#1E293B]/50 p-4">
        <h3 className="mb-3 text-sm font-medium text-slate-400">პოპულარული კერძები (top 10)</h3>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-slate-500">
              <th className="pb-2">კერძი</th>
              <th className="pb-2 text-right">რაოდენობა</th>
              <th className="pb-2 text-right">გაყიდვები</th>
            </tr>
          </thead>
          <tbody>
            {topItems.map((item) => (
              <tr key={item.name} className="border-b border-white/5 text-slate-300">
                <td className="py-1.5">{item.name}</td>
                <td className="text-right py-1.5">{item.quantity}</td>
                <td className="text-right py-1.5 text-emerald-400">₾{item.revenue.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
