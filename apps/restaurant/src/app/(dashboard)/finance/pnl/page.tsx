'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

type PnLData = {
  period: { from: string; to: string };
  revenue: { posSales: number; invoiceRevenue: number; total: number };
  expenses: {
    categories: Array<{ id: string; name: string; icon: string | null; color: string | null; amount: number }>;
    purchaseTotal: number;
    total: number;
  };
  netProfit: number;
  marginPercent: number;
  chartData: Array<{ period: string; displayLabel: string; revenue: number; expenses: number }>;
  expenseBreakdown: Array<{ name: string; amount: number; color: string; percent: number }>;
};

export default function PnLPage() {
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<PnLData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('from', from);
    params.set('to', to);
    const res = await fetch(`/api/finance/pnl?${params}`, { credentials: 'include' });
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

  const exportCSV = () => {
    if (!data) return;
    const rows: string[][] = [
      ['კატეგორია', 'თანხა'],
      ['შემოსავალი - POS გაყიდვები', String(data.revenue.posSales)],
      ['შემოსავალი - ინვოისები', String(data.revenue.invoiceRevenue)],
      ...data.expenses.categories.map((c) => [`ხარჯი - ${c.name}`, String(c.amount)]),
      ...(data.expenses.purchaseTotal > 0 ? [['ხარჯი - შესყიდვები', String(data.expenses.purchaseTotal)]] : []),
      ['სულ შემოსავალი', String(data.revenue.total)],
      ['სულ ხარჯები', String(data.expenses.total)],
      ['წმინდა მოგება', String(data.netProfit)],
      ['მარჟა %', String(data.marginPercent.toFixed(1))],
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PnL_${from}_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading && !data) {
    return (
      <div className="p-6">
        <p className="text-slate-400">იტვირთება...</p>
      </div>
    );
  }

  const totalRevenue = data?.revenue.total ?? 0;
  const pct = (v: number) => (totalRevenue > 0 ? ((v / totalRevenue) * 100).toFixed(1) : '0');

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-white">მოგება-ზარალი (P&L)</h1>
        <div className="flex flex-wrap items-center gap-3">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white" />
          <span className="text-slate-500">—</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white" />
          <button
            type="button"
            onClick={exportCSV}
            disabled={!data}
            className="rounded-xl bg-[#1E293B]/50 border border-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 disabled:opacity-50"
          >
            📥 Export
          </button>
        </div>
      </div>

      {!data ? (
        <div className="rounded-2xl border border-white/10 bg-[#1E293B]/50 p-8 text-center text-slate-500">მონაცემები ვერ ჩაიტვირთა</div>
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#1E293B]/50 backdrop-blur">
            <table className="w-full">
              <tbody className="text-sm">
                <tr className="bg-emerald-500/10">
                  <td className="p-3 font-medium text-emerald-300">შემოსავალი</td>
                  <td className="p-3 text-right"></td>
                  <td className="p-3 w-28 text-right"></td>
                </tr>
                <tr className="bg-emerald-500/10">
                  <td className="p-3 pl-6 text-slate-300">POS გაყიდვები</td>
                  <td className="p-3 text-right text-white">₾{data.revenue.posSales.toFixed(2)}</td>
                  <td className="p-3 text-right text-slate-400">({pct(data.revenue.posSales)}%)</td>
                </tr>
                <tr className="bg-emerald-500/10">
                  <td className="p-3 pl-6 text-slate-300">ინვოისები</td>
                  <td className="p-3 text-right text-white">₾{data.revenue.invoiceRevenue.toFixed(2)}</td>
                  <td className="p-3 text-right text-slate-400">({pct(data.revenue.invoiceRevenue)}%)</td>
                </tr>
                <tr className="bg-red-500/10">
                  <td className="p-3 font-medium text-red-300">ხარჯები</td>
                  <td className="p-3 text-right"></td>
                  <td className="p-3 text-right"></td>
                </tr>
                {data.expenses.categories.map((c) => (
                  <tr key={c.id} className="bg-red-500/10">
                    <td className="p-3 pl-6 flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: c.color || '#64748b' }} />
                      <span className="text-slate-300">{c.name}</span>
                    </td>
                    <td className="p-3 text-right text-white">₾{c.amount.toFixed(2)}</td>
                    <td className="p-3 text-right text-slate-400">({pct(c.amount)}%)</td>
                  </tr>
                ))}
                {data.expenses.purchaseTotal > 0 && (
                  <tr className="bg-red-500/10">
                    <td className="p-3 pl-6 flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full shrink-0 bg-orange-500" />
                      <span className="text-slate-300">შესყიდვები</span>
                    </td>
                    <td className="p-3 text-right text-white">₾{data.expenses.purchaseTotal.toFixed(2)}</td>
                    <td className="p-3 text-right text-slate-400">({pct(data.expenses.purchaseTotal)}%)</td>
                  </tr>
                )}
                <tr className="border-t border-white/10">
                  <td className="p-4 font-bold text-lg" colSpan={2}>
                    წმინდა მოგება
                  </td>
                  <td className={`p-4 text-right text-lg font-bold ${data.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    ₾{data.netProfit.toFixed(2)}
                    <span className="block text-sm font-normal text-slate-400">მარჟა {data.marginPercent.toFixed(1)}%</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-[#1E293B]/50 p-4 backdrop-blur">
              <h3 className="text-sm font-medium text-slate-400 mb-4">
                {Math.ceil((new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60 * 24)) <= 31 ? 'დღიური' : 'ყოველთვიური'} შემოსავალი vs ხარჯები
              </h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="displayLabel" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `₾${v}`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.1)' }}
                      formatter={(value: number, name: string) => [`₾${Number(value).toFixed(2)}`, name === 'revenue' ? 'შემოსავალი' : 'ხარჯები']}
                      labelFormatter={(label) => label}
                    />
                    <Legend formatter={(v) => (v === 'revenue' ? 'შემოსავალი' : 'ხარჯები')} />
                    <Bar dataKey="revenue" fill="#22c55e" name="revenue" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="expenses" fill="#ef4444" name="expenses" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#1E293B]/50 p-4 backdrop-blur">
              <h3 className="text-sm font-medium text-slate-400 mb-4">ხარჯების სტრუქტურა</h3>
              {data.expenseBreakdown.length === 0 ? (
                <div className="h-72 flex items-center justify-center text-slate-500">ხარჯები არ არის</div>
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.expenseBreakdown}
                        dataKey="amount"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius="55%"
                        outerRadius="85%"
                        paddingAngle={2}
                        label={({ name, payload }: { name: string; payload?: { percent: number } }) => `${name} ${(payload?.percent ?? 0).toFixed(0)}%`}
                      >
                        {data.expenseBreakdown.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.1)' }}
                        formatter={(value: number, name: string, props: { payload: { percent: number } }) => [
                          `₾${Number(value).toFixed(2)} (${props.payload.percent.toFixed(1)}%)`,
                          name,
                        ]}
                      />
                      <Legend formatter={(_value, name, item: { payload?: { amount: number; percent: number } }) => `${name} — ₾${item.payload?.amount.toFixed(2) ?? 0} (${(item.payload?.percent ?? 0).toFixed(1)}%)`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
