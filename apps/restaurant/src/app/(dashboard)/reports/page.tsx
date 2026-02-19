'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DateRangePicker, type DateRangePreset } from '@/components/reports/DateRangePicker';
import { ZReport } from '@/components/reports/ZReport';
import { FoodCostTable } from '@/components/reports/FoodCostTable';
import { FoodCostChart } from '@/components/reports/FoodCostChart';
import { SalesLineChart } from '@/components/reports/SalesLineChart';
import { OrderTypePieChart } from '@/components/reports/OrderTypePieChart';
import { CategoryBarChart } from '@/components/reports/CategoryBarChart';
import { PeakHoursChart } from '@/components/reports/PeakHoursChart';
import { WaiterPerformanceTable } from '@/components/reports/WaiterPerformanceTable';
import { KPICard } from '@/components/reports/KPICard';
import { TrendingUp, Receipt, Clock, UtensilsCrossed } from 'lucide-react';

function getRange(preset: DateRangePreset): { dateFrom: string; dateTo: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (preset === 'today') return { dateFrom: today.toISOString().slice(0, 10), dateTo: today.toISOString().slice(0, 10) };
  if (preset === 'yesterday') {
    const y = new Date(today); y.setDate(y.getDate() - 1);
    return { dateFrom: y.toISOString().slice(0, 10), dateTo: y.toISOString().slice(0, 10) };
  }
  if (preset === 'week') {
    const day = today.getDay();
    const start = new Date(today); start.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
    return { dateFrom: start.toISOString().slice(0, 10), dateTo: now.toISOString().slice(0, 10) };
  }
  if (preset === 'month') {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    return { dateFrom: start.toISOString().slice(0, 10), dateTo: now.toISOString().slice(0, 10) };
  }
  return { dateFrom: '', dateTo: '' };
}

type TabId = 'z-report' | 'food-cost' | 'analytics' | 'waiters';

export default function ReportsPage() {
  const [tab, setTab] = useState<TabId>('z-report');

  const [zDate, setZDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [zData, setZData] = useState<Record<string, unknown> | null>(null);

  const [fcPreset, setFcPreset] = useState<DateRangePreset>('month');
  const [fcDateFrom, setFcDateFrom] = useState('');
  const [fcDateTo, setFcDateTo] = useState('');
  const [fcData, setFcData] = useState<{ items: Array<{ name: string; categoryName: string; quantitySold: number; revenue: number; foodCostPerUnit: number; foodCostTotal: number; foodCostPercent: number; profit: number }>; totalRevenue: number; totalFoodCost: number; overallFoodCostPercent: number } | null>(null);
  const [fcSortBy, setFcSortBy] = useState('foodCostPercent');

  const [anPreset, setAnPreset] = useState<DateRangePreset>('month');
  const [anDateFrom, setAnDateFrom] = useState('');
  const [anDateTo, setAnDateTo] = useState('');
  const [anData, setAnData] = useState<{ dailySales: Array<{ date: string; totalSales: number }>; categoryBreakdown: Array<{ categoryName: string; total: number }>; orderTypeBreakdown: Array<{ orderType: string; total: number }>; hourlyBreakdown: Array<{ hour: number; total: number; orderCount: number }>; kpis: { avgDailySales: number; avgOrdersPerDay: number; peakHour: number; topItem: string | null } } | null>(null);

  const [waiterPreset, setWaiterPreset] = useState<DateRangePreset>('month');
  const [waiterDateFrom, setWaiterDateFrom] = useState('');
  const [waiterDateTo, setWaiterDateTo] = useState('');
  const [waiterData, setWaiterData] = useState<Array<{ employeeId: string; name: string; orders: number; sales: number; avgCheck: number; tips: number; avgPrepTimeMinutes: number | null }>>([]);
  const [waiterSortBy, setWaiterSortBy] = useState('sales');

  useEffect(() => { const r = getRange(fcPreset); setFcDateFrom(r.dateFrom); setFcDateTo(r.dateTo); }, [fcPreset]);
  useEffect(() => { const r = getRange(anPreset); setAnDateFrom(r.dateFrom); setAnDateTo(r.dateTo); }, [anPreset]);
  useEffect(() => { const r = getRange(waiterPreset); setWaiterDateFrom(r.dateFrom); setWaiterDateTo(r.dateTo); }, [waiterPreset]);

  const fetchZ = useCallback(async () => {
    const res = await fetch(`/api/reports/z-report?date=${zDate}`);
    if (!res.ok) return;
    setZData(await res.json());
  }, [zDate]);

  const fetchFc = useCallback(async () => {
    if (!fcDateFrom || !fcDateTo) return;
    const res = await fetch(`/api/reports/food-cost?dateFrom=${fcDateFrom}&dateTo=${fcDateTo}`);
    if (!res.ok) return;
    setFcData(await res.json());
  }, [fcDateFrom, fcDateTo]);

  const fetchAn = useCallback(async () => {
    if (!anDateFrom || !anDateTo) return;
    const res = await fetch(`/api/reports/analytics?dateFrom=${anDateFrom}&dateTo=${anDateTo}`);
    if (!res.ok) return;
    setAnData(await res.json());
  }, [anDateFrom, anDateTo]);

  const fetchWaiters = useCallback(async () => {
    if (!waiterDateFrom || !waiterDateTo) return;
    const res = await fetch(`/api/reports/waiters?dateFrom=${waiterDateFrom}&dateTo=${waiterDateTo}`);
    if (!res.ok) return;
    setWaiterData(await res.json());
  }, [waiterDateFrom, waiterDateTo]);

  useEffect(() => { if (tab === 'z-report') fetchZ(); }, [tab, fetchZ]);
  useEffect(() => { if (tab === 'food-cost') fetchFc(); }, [tab, fetchFc]);
  useEffect(() => { if (tab === 'analytics') fetchAn(); }, [tab, fetchAn]);
  useEffect(() => { if (tab === 'waiters') fetchWaiters(); }, [tab, fetchWaiters]);

  const tabs: { id: TabId; label: string }[] = [
    { id: 'z-report', label: 'Z-რეპორტი' },
    { id: 'food-cost', label: 'Food Cost' },
    { id: 'analytics', label: 'გაყიდვების ანალიტიკა' },
    { id: 'waiters', label: 'ოფიციანტების ანალიტიკა' },
  ];

  return (
    <div className="space-y-6 p-4 md:p-6">
      <h1 className="text-2xl font-bold text-white">რეპორტები</h1>

      <div className="flex gap-2 border-b border-white/10">
        {tabs.map((t) => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)} className={`border-b-2 px-4 py-2 text-sm font-medium ${tab === t.id ? 'border-orange-500 text-orange-400' : 'border-transparent text-slate-400 hover:text-white'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === 'z-report' && (
          <motion.div key="z" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="mb-4">
              <input type="date" value={zDate} onChange={(e) => setZDate(e.target.value)} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white" />
            </div>
            {zData && (
              <ZReport
                date={zDate}
                firstOrderTime={zData.firstOrderTime as string | null}
                lastOrderTime={zData.lastOrderTime as string | null}
                totalOrders={zData.totalOrders as number}
                totalSales={zData.totalSales as number}
                cashTotal={zData.cashTotal as number}
                cardTotal={zData.cardTotal as number}
                splitTotal={zData.splitTotal as number}
                tipsTotal={zData.tipsTotal as number}
                discountsTotal={zData.discountsTotal as number}
                cancelledCount={zData.cancelledCount as number}
                cancelledAmount={zData.cancelledAmount as number}
                netSales={zData.netSales as number}
                onPrint={() => window.print()}
              />
            )}
          </motion.div>
        )}

        {tab === 'food-cost' && (
          <motion.div key="fc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <DateRangePicker preset={fcPreset} onPresetChange={setFcPreset} dateFrom={fcDateFrom} dateTo={fcDateTo} onDateFromChange={setFcDateFrom} onDateToChange={setFcDateTo} />
            {fcData && (
              <>
                <div className="flex flex-wrap gap-4">
                  <span className="text-slate-400">სულ გაყიდვები: <strong className="text-white">₾{fcData.totalRevenue.toFixed(2)}</strong></span>
                  <span className="text-slate-400">Food cost: <strong className="text-white">₾{fcData.totalFoodCost.toFixed(2)}</strong></span>
                  <span className={`font-medium ${fcData.overallFoodCostPercent < 30 ? 'text-emerald-400' : fcData.overallFoodCostPercent <= 35 ? 'text-amber-400' : 'text-red-400'}`}>
                    Food Cost %: {fcData.overallFoodCostPercent}%
                  </span>
                </div>
                <FoodCostTable items={fcData.items} sortBy={fcSortBy} onSort={setFcSortBy} />
                <FoodCostChart items={fcData.items.map((i) => ({ name: i.name, foodCostPercent: i.foodCostPercent }))} />
              </>
            )}
          </motion.div>
        )}

        {tab === 'analytics' && (
          <motion.div key="an" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
            <DateRangePicker preset={anPreset} onPresetChange={setAnPreset} dateFrom={anDateFrom} dateTo={anDateTo} onDateFromChange={setAnDateFrom} onDateToChange={setAnDateTo} />
            {anData && (
              <>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <KPICard label="საშ. დღიური გაყიდვა" value={`₾${anData.kpis.avgDailySales.toFixed(2)}`} icon={TrendingUp} gradient="from-orange-500 to-red-500" />
                  <KPICard label="საშ. შეკვეთა/დღე" value={anData.kpis.avgOrdersPerDay.toFixed(1)} icon={Receipt} gradient="from-emerald-500 to-teal-500" />
                  <KPICard label="პიკის საათი" value={`${anData.kpis.peakHour}:00`} icon={Clock} gradient="from-blue-500 to-cyan-500" />
                  <KPICard label="პოპულარული კერძი" value={anData.kpis.topItem ?? '—'} icon={UtensilsCrossed} gradient="from-violet-500 to-purple-500" />
                </div>
                <div className="rounded-xl border border-white/10 bg-[#1E293B]/50 p-4">
                  <h3 className="mb-2 text-sm font-medium text-slate-400">დღიური გაყიდვები</h3>
                  <SalesLineChart data={anData.dailySales} />
                </div>
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="rounded-xl border border-white/10 bg-[#1E293B]/50 p-4">
                    <h3 className="mb-2 text-sm font-medium text-slate-400">შეკვეთის ტიპები</h3>
                    <OrderTypePieChart data={anData.orderTypeBreakdown} />
                  </div>
                  <div className="rounded-xl border border-white/10 bg-[#1E293B]/50 p-4">
                    <h3 className="mb-2 text-sm font-medium text-slate-400">კატეგორიები</h3>
                    <CategoryBarChart data={anData.categoryBreakdown} />
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-[#1E293B]/50 p-4">
                  <h3 className="mb-2 text-sm font-medium text-slate-400">საათობრივი გაყიდვები</h3>
                  <PeakHoursChart data={anData.hourlyBreakdown} />
                </div>
              </>
            )}
          </motion.div>
        )}

        {tab === 'waiters' && (
          <motion.div key="w" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <DateRangePicker preset={waiterPreset} onPresetChange={setWaiterPreset} dateFrom={waiterDateFrom} dateTo={waiterDateTo} onDateFromChange={setWaiterDateFrom} onDateToChange={setWaiterDateTo} />
            <WaiterPerformanceTable waiters={waiterData} sortBy={waiterSortBy} onSort={setWaiterSortBy} />
            {waiterData.length > 0 && (
              <div className="rounded-xl border border-white/10 bg-[#1E293B]/50 p-4">
                <h3 className="mb-2 text-sm font-medium text-slate-400">გაყიდვები ოფიციანტების მიხედვით</h3>
                <div className="h-64">
                  <CategoryBarChart data={waiterData.map((w) => ({ categoryName: w.name, total: w.sales }))} />
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
