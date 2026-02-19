'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download } from 'lucide-react';
import { SalesFilters } from '@/components/sales/SalesFilters';
import { SalesTable, type SalesOrderRow } from '@/components/sales/SalesTable';
import { DailySummary } from '@/components/sales/DailySummary';
import type { DateRangePreset } from '@/components/reports/DateRangePicker';

function getDateRange(preset: DateRangePreset): { dateFrom: string; dateTo: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let start: Date;
  let end: Date;
  if (preset === 'today') {
    start = today;
    end = new Date(today);
  } else if (preset === 'yesterday') {
    start = new Date(today);
    start.setDate(start.getDate() - 1);
    end = new Date(start);
  } else if (preset === 'week') {
    const day = today.getDay();
    start = new Date(today);
    start.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
    end = new Date(now);
  } else if (preset === 'month') {
    start = new Date(today.getFullYear(), today.getMonth(), 1);
    end = new Date(now);
  } else {
    return { dateFrom: '', dateTo: '' };
  }
  return {
    dateFrom: start.toISOString().slice(0, 10),
    dateTo: end.toISOString().slice(0, 10),
  };
}

export default function SalesPage() {
  const [tab, setTab] = useState<'history' | 'daily'>('history');
  const [datePreset, setDatePreset] = useState<DateRangePreset>('today');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [status, setStatus] = useState('');
  const [orderType, setOrderType] = useState('');
  const [waiterId, setWaiterId] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [page, setPage] = useState(1);
  const [orders, setOrders] = useState<SalesOrderRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [waiters, setWaiters] = useState<Array<{ id: string; name: string }>>([]);

  const [dailyDate, setDailyDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dailyData, setDailyData] = useState<{
    totalSales: number;
    orderCount: number;
    avgCheck: number;
    guestCount: number;
    tipsTotal: number;
    discountsTotal: number;
    paymentBreakdown: Record<string, { amount: number; count: number }>;
    typeBreakdown: Record<string, { amount: number; count: number }>;
    topItems: Array<{ name: string; quantity: number; revenue: number }>;
  } | null>(null);

  useEffect(() => {
    const { dateFrom: from, dateTo: to } = getDateRange(datePreset);
    setDateFrom(from);
    setDateTo(to);
  }, [datePreset]);

  const fetchOrders = useCallback(async () => {
    const params = new URLSearchParams();
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    if (status) params.set('status', status);
    if (orderType) params.set('orderType', orderType);
    if (waiterId) params.set('waiterId', waiterId);
    if (search) params.set('search', search);
    params.set('page', String(page));
    params.set('limit', '20');
    params.set('sort', sortBy);
    params.set('order', sortBy === 'totalAmount' ? 'desc' : 'desc');
    const res = await fetch(`/api/sales?${params}`);
    if (!res.ok) return;
    const data = await res.json();
    setOrders(data.items);
    setTotal(data.total);
    setTotalPages(data.totalPages ?? 1);
  }, [dateFrom, dateTo, status, orderType, waiterId, search, page, sortBy]);

  const fetchWaiters = useCallback(async () => {
    const res = await fetch('/api/waiters');
    if (!res.ok) return;
    const data = await res.json();
    setWaiters(data.map((e: { id: string; firstName: string; lastName: string }) => ({ id: e.id, name: `${e.firstName} ${e.lastName}`.trim() })));
  }, []);

  const fetchDaily = useCallback(async () => {
    const res = await fetch(`/api/sales/daily?date=${dailyDate}`);
    if (!res.ok) return;
    const data = await res.json();
    setDailyData(data);
  }, [dailyDate]);

  useEffect(() => {
    if (tab === 'history') fetchOrders();
  }, [tab, fetchOrders]);

  useEffect(() => {
    fetchWaiters();
  }, [fetchWaiters]);

  useEffect(() => {
    if (tab === 'daily') fetchDaily();
  }, [tab, fetchDaily]);

  const handleExport = () => {
    const params = new URLSearchParams();
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    if (status) params.set('status', status);
    window.open(`/api/sales/export?${params}`, '_blank');
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <h1 className="text-2xl font-bold text-white">გაყიდვები</h1>

      <div className="flex gap-2 border-b border-white/10">
        <button
          type="button"
          onClick={() => setTab('history')}
          className={`border-b-2 px-4 py-2 text-sm font-medium ${tab === 'history' ? 'border-orange-500 text-orange-400' : 'border-transparent text-slate-400 hover:text-white'}`}
        >
          გაყიდვების ისტორია
        </button>
        <button
          type="button"
          onClick={() => setTab('daily')}
          className={`border-b-2 px-4 py-2 text-sm font-medium ${tab === 'daily' ? 'border-orange-500 text-orange-400' : 'border-transparent text-slate-400 hover:text-white'}`}
        >
          დღის ჯამი
        </button>
      </div>

      <AnimatePresence mode="wait">
        {tab === 'history' && (
          <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <SalesFilters
              datePreset={datePreset}
              onDatePresetChange={setDatePreset}
              dateFrom={dateFrom}
              dateTo={dateTo}
              onDateFromChange={setDateFrom}
              onDateToChange={setDateTo}
              status={status}
              onStatusChange={setStatus}
              orderType={orderType}
              onOrderTypeChange={setOrderType}
              waiterId={waiterId}
              onWaiterIdChange={setWaiterId}
              waiters={waiters}
              search={search}
              onSearchChange={setSearch}
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleExport}
                className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 hover:bg-white/10"
              >
                <Download className="h-4 w-4" /> CSV
              </button>
            </div>
            <SalesTable
              orders={orders}
              onSort={setSortBy}
              sortBy={sortBy}
              page={page}
              totalPages={totalPages}
              total={total}
              onPageChange={setPage}
            />
          </motion.div>
        )}

        {tab === 'daily' && (
          <motion.div key="daily" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-400">თარიღი:</span>
              <input
                type="date"
                value={dailyDate}
                onChange={(e) => setDailyDate(e.target.value)}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
              />
            </div>
            {dailyData && (
              <DailySummary
                date={dailyDate}
                totalSales={dailyData.totalSales}
                orderCount={dailyData.orderCount}
                avgCheck={dailyData.avgCheck}
                guestCount={dailyData.guestCount}
                tipsTotal={dailyData.tipsTotal}
                discountsTotal={dailyData.discountsTotal}
                paymentBreakdown={dailyData.paymentBreakdown}
                typeBreakdown={dailyData.typeBreakdown}
                topItems={dailyData.topItems}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
