'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Calendar,
  ShoppingCart,
  Sparkles,
  Package,
  UserCheck,
  Download,
  Filter,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';

type Period = 'today' | 'week' | 'month' | 'year' | 'custom';

interface ReportData {
  period: string;
  staffList: { id: string; name: string }[];
  summary: {
    totalRevenue: number;
    totalDiscount: number;
    totalExpenses: number;
    netProfit: number;
    avgTicket: number;
    salesCount: number;
    appointmentsCount: number;
    newClients: number;
  };
  revenueByDay: Record<string, number>;
  revenueByPayment: Record<string, number>;
  topServices: { name: string; revenue: number; count: number }[];
  topProducts: { name: string; revenue: number; count: number }[];
  staffPerformance: { name: string; revenue: number; salesCount: number }[];
  appointmentsByStatus: Record<string, number>;
  expensesByCategory: Record<string, number>;
}

const PERIOD_LABELS: Record<Period, string> = {
  today: 'დღეს',
  week: '7 დღე',
  month: 'თვე',
  year: 'წელი',
  custom: 'თარიღით',
};

const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'ნაღდი', CARD: 'ბარათი', TRANSFER: 'გადარიცხვა',
  SPLIT: 'გაყოფილი', GIFT_CARD: 'სასაჩუქრე',
};

const PAYMENT_COLORS: Record<string, string> = {
  CASH: 'bg-green-500', CARD: 'bg-blue-500', TRANSFER: 'bg-purple-500',
  SPLIT: 'bg-amber-500', GIFT_CARD: 'bg-pink-500',
};

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: 'დაგეგმილი', CONFIRMED: 'დადასტურებული', IN_PROGRESS: 'მიმდინარე',
  COMPLETED: 'დასრულებული', CANCELLED: 'გაუქმებული', NO_SHOW: 'არ გამოცხადდა',
};

const EXPENSE_LABELS: Record<string, string> = {
  RENT: 'ქირა', UTILITIES: 'კომუნალური', SALARY: 'ხელფასი',
  SUPPLIES: 'მარაგები', EQUIPMENT: 'აღჭურვილობა', MARKETING: 'მარკეტინგი', OTHER: 'სხვა',
};

function toCSV(data: ReportData): string {
  const lines: string[] = [];
  const s = data.summary;

  lines.push('=== ჯამური მაჩვენებლები ===');
  lines.push('მაჩვენებელი,მნიშვნელობა');
  lines.push(`შემოსავალი,${s.totalRevenue}`);
  lines.push(`ხარჯები,${s.totalExpenses}`);
  lines.push(`წმინდა მოგება,${s.netProfit}`);
  lines.push(`ფასდაკლება,${s.totalDiscount}`);
  lines.push(`საშუალო ჩეკი,${s.avgTicket.toFixed(2)}`);
  lines.push(`გაყიდვების რაოდენობა,${s.salesCount}`);
  lines.push(`ჯავშნების რაოდენობა,${s.appointmentsCount}`);
  lines.push(`ახალი კლიენტები,${s.newClients}`);
  lines.push('');

  lines.push('=== შემოსავალი დღეების მიხედვით ===');
  lines.push('თარიღი,შემოსავალი');
  Object.entries(data.revenueByDay).sort(([a],[b]) => a.localeCompare(b)).forEach(([d,v]) => {
    lines.push(`${d},${v}`);
  });
  lines.push('');

  lines.push('=== გადახდის მეთოდები ===');
  lines.push('მეთოდი,თანხა');
  Object.entries(data.revenueByPayment).forEach(([m,v]) => {
    lines.push(`${PAYMENT_LABELS[m] || m},${v}`);
  });
  lines.push('');

  lines.push('=== ტოპ სერვისები ===');
  lines.push('სერვისი,შემოსავალი,რაოდენობა');
  data.topServices.forEach(s => lines.push(`${s.name},${s.revenue},${s.count}`));
  lines.push('');

  lines.push('=== ტოპ პროდუქტები ===');
  lines.push('პროდუქტი,შემოსავალი,რაოდენობა');
  data.topProducts.forEach(p => lines.push(`${p.name},${p.revenue},${p.count}`));
  lines.push('');

  lines.push('=== სპეციალისტები ===');
  lines.push('სპეციალისტი,შემოსავალი,გაყიდვები');
  data.staffPerformance.forEach(s => lines.push(`${s.name},${s.revenue},${s.salesCount}`));
  lines.push('');

  lines.push('=== ხარჯები კატეგორიით ===');
  lines.push('კატეგორია,თანხა');
  Object.entries(data.expensesByCategory).forEach(([c,v]) => {
    lines.push(`${EXPENSE_LABELS[c] || c},${v}`);
  });

  return '\uFEFF' + lines.join('\n');
}

function downloadCSV(data: ReportData, period: string) {
  const csv = toCSV(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `რეპორტი_${period}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function ReportsClient() {
  const now = new Date();
  const [period, setPeriod] = useState<Period>('month');
  const [startDate, setStartDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(now.toISOString().slice(0, 10));
  const [staffFilter, setStaffFilter] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    let url = `/api/reports?period=${period}`;
    if (period === 'custom') {
      url = `/api/reports?start=${startDate}&end=${endDate}`;
    }
    if (staffFilter) url += `&staffId=${staffFilter}`;

    fetch(url)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [period, startDate, endDate, staffFilter]);

  const revenueBars = useMemo(() => {
    if (!data) return [];
    const entries = Object.entries(data.revenueByDay).sort(([a], [b]) => a.localeCompare(b));
    const max = Math.max(...entries.map(([, v]) => v), 1);
    return entries.map(([date, value]) => ({
      date, value,
      height: (value / max) * 100,
      label: new Date(date).toLocaleDateString('ka-GE', { day: 'numeric', month: 'short' }),
    }));
  }, [data]);

  const paymentTotal = useMemo(() => {
    if (!data) return 0;
    return Object.values(data.revenueByPayment).reduce((s, v) => s + v, 0);
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary-400/30 border-t-primary-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return null;
  const s = data.summary;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 size={24} className="text-primary-400" />
            რეპორტები
          </h1>
          <p className="text-dark-400 mt-1">ბიზნესის ანალიტიკა</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'btn-secondary flex items-center gap-2',
              showFilters && 'border-primary-500/30 text-primary-400'
            )}
          >
            <Filter size={16} />
            ფილტრი
          </button>
          <button
            onClick={() => data && downloadCSV(data, period)}
            className="btn-secondary flex items-center gap-2"
          >
            <Download size={16} />
            ექსპორტი
          </button>
        </div>
      </div>

      {/* Period Tabs */}
      <div className="flex gap-2 flex-wrap">
        {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm transition-colors',
              period === p
                ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                : 'bg-dark-800 text-dark-300 border border-dark-700 hover:border-dark-600'
            )}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="card flex flex-col sm:flex-row gap-3 items-end">
          {period === 'custom' && (
            <>
              <div className="flex-1 min-w-0">
                <label className="label">საწყისი თარიღი</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="input"
                />
              </div>
              <div className="flex-1 min-w-0">
                <label className="label">საბოლოო თარიღი</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="input"
                />
              </div>
            </>
          )}
          <div className="flex-1 min-w-0">
            <label className="label">სპეციალისტი</label>
            <select
              value={staffFilter}
              onChange={(e) => setStaffFilter(e.target.value)}
              className="input"
            >
              <option value="">ყველა</option>
              {data.staffList?.map((st) => (
                <option key={st.id} value={st.id}>{st.name}</option>
              ))}
            </select>
          </div>
          {(staffFilter || period === 'custom') && (
            <button
              onClick={() => { setStaffFilter(''); setPeriod('month'); }}
              className="btn-secondary text-sm"
            >
              გასუფთავება
            </button>
          )}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center">
              <DollarSign size={16} className="text-emerald-400" />
            </div>
            <span className="text-xs text-dark-400">შემოსავალი</span>
          </div>
          <p className="text-2xl font-bold text-emerald-400">{formatCurrency(s.totalRevenue)}</p>
          <p className="text-xs text-dark-500 mt-1">{s.salesCount} გაყიდვა</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center">
              <TrendingUp size={16} className="text-blue-400" />
            </div>
            <span className="text-xs text-dark-400">წმინდა მოგება</span>
          </div>
          <p className={cn('text-2xl font-bold', s.netProfit >= 0 ? 'text-blue-400' : 'text-red-400')}>
            {formatCurrency(s.netProfit)}
          </p>
          <p className="text-xs text-dark-500 mt-1">ხარჯი: {formatCurrency(s.totalExpenses)}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-amber-500/10 rounded-lg flex items-center justify-center">
              <ShoppingCart size={16} className="text-amber-400" />
            </div>
            <span className="text-xs text-dark-400">საშუალო ჩეკი</span>
          </div>
          <p className="text-2xl font-bold text-amber-400">{formatCurrency(s.avgTicket)}</p>
          <p className="text-xs text-dark-500 mt-1">ფასდაკლება: {formatCurrency(s.totalDiscount)}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-purple-500/10 rounded-lg flex items-center justify-center">
              <UserCheck size={16} className="text-purple-400" />
            </div>
            <span className="text-xs text-dark-400">ახალი კლიენტები</span>
          </div>
          <p className="text-2xl font-bold text-purple-400">{s.newClients}</p>
          <p className="text-xs text-dark-500 mt-1">{s.appointmentsCount} ჯავშანი</p>
        </div>
      </div>

      {/* Revenue Chart + Payment Methods */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 card">
          <h3 className="font-semibold text-white mb-4">შემოსავალი დღეების მიხედვით</h3>
          {revenueBars.length === 0 ? (
            <div className="text-center py-8 text-dark-500 text-sm">მონაცემები არ არის</div>
          ) : (
            <div className="flex items-end gap-1 h-48">
              {revenueBars.map((bar) => (
                <div key={bar.date} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                  <span className="text-[9px] text-dark-400">{formatCurrency(bar.value)}</span>
                  <div
                    className="w-full bg-primary-500/30 rounded-t hover:bg-primary-500/50 transition-colors min-h-[2px]"
                    style={{ height: `${bar.height}%` }}
                    title={`${bar.label}: ${formatCurrency(bar.value)}`}
                  />
                  <span className="text-[9px] text-dark-500 truncate w-full text-center">{bar.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="card">
          <h3 className="font-semibold text-white mb-4">გადახდის მეთოდები</h3>
          {paymentTotal === 0 ? (
            <div className="text-center py-8 text-dark-500 text-sm">მონაცემები არ არის</div>
          ) : (
            <div className="space-y-3">
              {Object.entries(data.revenueByPayment).sort(([,a],[,b]) => b - a).map(([method, amount]) => {
                const pct = (amount / paymentTotal) * 100;
                return (
                  <div key={method}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-dark-300">{PAYMENT_LABELS[method] || method}</span>
                      <span className="text-dark-200 font-medium">{formatCurrency(amount)}</span>
                    </div>
                    <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                      <div className={cn('h-full rounded-full', PAYMENT_COLORS[method] || 'bg-dark-500')} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[10px] text-dark-500">{pct.toFixed(0)}%</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Top Services + Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Sparkles size={16} className="text-primary-400" />
            ტოპ სერვისები
          </h3>
          {data.topServices.length === 0 ? (
            <div className="text-center py-6 text-dark-500 text-sm">მონაცემები არ არის</div>
          ) : (
            <div className="space-y-2">
              {data.topServices.map((svc, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-dark-500 w-5 text-right">{i + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{svc.name}</p>
                    <p className="text-xs text-dark-400">{svc.count} გაყიდვა</p>
                  </div>
                  <span className="text-sm font-medium text-emerald-400">{formatCurrency(svc.revenue)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="card">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Package size={16} className="text-emerald-400" />
            ტოპ პროდუქტები
          </h3>
          {data.topProducts.length === 0 ? (
            <div className="text-center py-6 text-dark-500 text-sm">მონაცემები არ არის</div>
          ) : (
            <div className="space-y-2">
              {data.topProducts.map((prod, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-dark-500 w-5 text-right">{i + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{prod.name}</p>
                    <p className="text-xs text-dark-400">{prod.count} ცალი</p>
                  </div>
                  <span className="text-sm font-medium text-emerald-400">{formatCurrency(prod.revenue)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Staff + Appointments + Expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Users size={16} className="text-blue-400" />
            სპეციალისტების შემოსავალი
          </h3>
          {data.staffPerformance.length === 0 ? (
            <div className="text-center py-6 text-dark-500 text-sm">მონაცემები არ არის</div>
          ) : (
            <div className="space-y-2">
              {data.staffPerformance.map((st, i) => {
                const maxRev = data.staffPerformance[0]?.revenue || 1;
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-dark-200">{st.name}</span>
                      <span className="text-emerald-400 font-medium">{formatCurrency(st.revenue)}</span>
                    </div>
                    <div className="h-1.5 bg-dark-700 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(st.revenue / maxRev) * 100}%` }} />
                    </div>
                    <span className="text-[10px] text-dark-500">{st.salesCount} გაყიდვა</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="card">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Calendar size={16} className="text-amber-400" />
            ჯავშნები სტატუსით
          </h3>
          {Object.keys(data.appointmentsByStatus).length === 0 ? (
            <div className="text-center py-6 text-dark-500 text-sm">მონაცემები არ არის</div>
          ) : (
            <div className="space-y-2">
              {Object.entries(data.appointmentsByStatus).sort(([,a],[,b]) => b - a).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <span className="text-sm text-dark-300">{STATUS_LABELS[status] || status}</span>
                  <span className="text-sm font-medium text-white">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="card">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingDown size={16} className="text-red-400" />
            ხარჯები კატეგორიით
          </h3>
          {Object.keys(data.expensesByCategory).length === 0 ? (
            <div className="text-center py-6 text-dark-500 text-sm">მონაცემები არ არის</div>
          ) : (
            <div className="space-y-2">
              {Object.entries(data.expensesByCategory).sort(([,a],[,b]) => b - a).map(([cat, amount]) => (
                <div key={cat} className="flex items-center justify-between">
                  <span className="text-sm text-dark-300">{EXPENSE_LABELS[cat] || cat}</span>
                  <span className="text-sm font-medium text-red-400">{formatCurrency(amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
