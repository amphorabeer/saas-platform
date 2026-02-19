'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  ComposedChart,
} from 'recharts';

type RevenueData = {
  period: { from: string; to: string };
  posSales: {
    total: number;
    count: number;
    cash: number;
    card: number;
    avgCheck: number;
  };
  invoiceRevenue: {
    total: number;
    count: number;
    pending: number;
    overdue: number;
  };
  totalRevenue: number;
  daily: Array<{ date: string; pos: number; invoices: number }>;
};

export default function RevenuePage() {
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('from', from);
    params.set('to', to);
    const res = await fetch(`/api/finance/revenue?${params}`, { credentials: 'include' });
    if (res.ok) {
      const json = await res.json();
      setData(json);
    } else {
      setData(null);
    }
    setLoading(false);
  }, [from, to]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const chartData =
    data?.daily.map((d) => ({
      ...d,
      displayDate: new Date(d.date).toLocaleDateString('ka-GE', { month: 'short', day: 'numeric' }),
      total: d.pos + d.invoices,
    })) ?? [];

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-semibold text-white">შემოსავლები</h1>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-[#1E293B]/50 p-4">
        <div>
          <label className="block text-xs text-slate-400 mb-1">დან</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">მდე</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
          />
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border border-white/10 bg-[#1E293B]/50 p-8 text-center text-slate-400">იტვირთება...</div>
      ) : data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-white/10 bg-[#1E293B]/50 p-4">
              <p className="text-sm text-slate-400">სულ შემოსავალი</p>
              <p className="text-2xl font-bold text-emerald-400">₾{data.totalRevenue.toFixed(2)}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#1E293B]/50 p-4">
              <p className="text-sm text-slate-400">POS გაყიდვები</p>
              <p className="text-2xl font-bold text-white">₾{data.posSales.total.toFixed(2)}</p>
              <p className="text-xs text-slate-500">{data.posSales.count} შეკვეთა · საშ. ჩეკი ₾{data.posSales.avgCheck.toFixed(2)}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#1E293B]/50 p-4">
              <p className="text-sm text-slate-400">ინვოისებიდან</p>
              <p className="text-2xl font-bold text-white">₾{data.invoiceRevenue.total.toFixed(2)}</p>
              <p className="text-xs text-slate-500">{data.invoiceRevenue.count} ინვოისი</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#1E293B]/50 p-4">
              <p className="text-sm text-slate-400">გადასახდელი ინვოისები</p>
              <p className="text-2xl font-bold text-red-400">₾{(data.invoiceRevenue.pending + data.invoiceRevenue.overdue).toFixed(2)}</p>
              <p className="text-xs text-slate-500">გაგზავნილი + ვადაგადაცილებული</p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-[#1E293B]/50 p-4">
              <h3 className="text-sm font-medium text-slate-400 mb-3">POS — ნაღდი vs ბარათი</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">ნაღდი</span>
                  <span className="text-white">₾{data.posSales.cash.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">ბარათი</span>
                  <span className="text-white">₾{data.posSales.card.toFixed(2)}</span>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#1E293B]/50 p-4">
              <h3 className="text-sm font-medium text-slate-400 mb-3">ინვოისები</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">გადახდილი</span>
                  <span className="text-emerald-400">₾{data.invoiceRevenue.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">გაგზავნილი (unpaid)</span>
                  <span className="text-amber-400">₾{data.invoiceRevenue.pending.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">ვადაგადაცილებული</span>
                  <span className="text-red-400">₾{data.invoiceRevenue.overdue.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {chartData.length > 0 && (
            <div className="rounded-xl border border-white/10 bg-[#1E293B]/50 p-4">
              <h3 className="text-sm font-medium text-slate-400 mb-4">დღიური შემოსავალი</h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="displayDate" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => `₾${v}`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.1)' }}
                      formatter={(value: number, name: string) => [`₾${value.toFixed(2)}`, name === 'pos' ? 'POS' : name === 'invoices' ? 'ინვოისები' : 'სულ']}
                    />
                    <Legend formatter={(v) => (v === 'pos' ? 'POS' : v === 'invoices' ? 'ინვოისები' : v)} />
                    <Bar dataKey="pos" stackId="a" fill="#F97316" name="pos" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="invoices" stackId="a" fill="#22c55e" name="invoices" radius={[0, 0, 0, 0]} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-xl border border-white/10 bg-[#1E293B]/50 p-8 text-center text-slate-500">მონაცემები ვერ ჩაიტვირთა</div>
      )}
    </div>
  );
}
