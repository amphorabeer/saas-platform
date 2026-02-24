'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  DollarSign,
  Plus,
  TrendingUp,
  TrendingDown,
  Wallet,
  Edit2,
  Trash2,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Calendar,
  Download,
  User,
  Users,
  CreditCard,
  Banknote,
  Smartphone,
  ArrowRightLeft,
  Receipt,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { ExpenseModal } from './ExpenseModal';

interface SaleItem {
  name: string;
  type: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface SaleRecord {
  id: string;
  total: number;
  subtotal: number;
  discount: number;
  paymentMethod: string;
  receiptNumber: string | null;
  createdAt: string;
  staffName: string | null;
  clientName: string | null;
  items: SaleItem[];
}

interface Expense {
  id: string;
  category: string;
  amount: number;
  date: string;
  description: string | null;
}

interface Summary {
  totalRevenue: number;
  totalExpenses: number;
  totalCommissions: number;
  netProfit: number;
  salesCount: number;
  revenueByMethod: Record<string, number>;
  expensesByCategory: Record<string, number>;
}

interface StaffCommission {
  id: string;
  name: string;
  commissionType: string;
  commissionRate: number;
  revenue: number;
  salesCount: number;
  commission: number;
}

interface FinanceData {
  expenses: Expense[];
  sales: SaleRecord[];
  staffCommissions: StaffCommission[];
  summary: Summary;
}

const EXPENSE_LABELS: Record<string, string> = {
  RENT: 'ქირა', UTILITIES: 'კომუნალური', SALARY: 'ხელფასი',
  SUPPLIES: 'მარაგები', EQUIPMENT: 'აღჭურვილობა', MARKETING: 'მარკეტინგი', OTHER: 'სხვა',
};
const EXPENSE_COLORS: Record<string, string> = {
  RENT: 'bg-red-500/10 text-red-400', UTILITIES: 'bg-amber-500/10 text-amber-400',
  SALARY: 'bg-blue-500/10 text-blue-400', SUPPLIES: 'bg-purple-500/10 text-purple-400',
  EQUIPMENT: 'bg-cyan-500/10 text-cyan-400', MARKETING: 'bg-pink-500/10 text-pink-400',
  OTHER: 'bg-dark-600 text-dark-300',
};
const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'ნაღდი', CARD: 'ბარათი', TRANSFER: 'გადარიცხვა', SPLIT: 'გაყოფილი',
};
const PAYMENT_ICONS: Record<string, any> = {
  CASH: Banknote, CARD: CreditCard, TRANSFER: Smartphone, SPLIT: ArrowRightLeft,
};
const MONTHS_KA = [
  'იანვარი','თებერვალი','მარტი','აპრილი','მაისი','ივნისი',
  'ივლისი','აგვისტო','სექტემბერი','ოქტომბერი','ნოემბერი','დეკემბერი',
];
const ALL_CATEGORIES = ['RENT','UTILITIES','SALARY','SUPPLIES','EQUIPMENT','MARKETING','OTHER'];

type Tab = 'overview' | 'income' | 'expenses' | 'commissions';

function downloadCSV(data: FinanceData, monthLabel: string) {
  const lines: string[] = [];
  const s = data.summary;

  lines.push(`=== ფინანსური რეპორტი — ${monthLabel} ===`);
  lines.push('');
  lines.push('მაჩვენებელი,თანხა');
  lines.push(`შემოსავალი,${s.totalRevenue}`);
  lines.push(`ხარჯები,${s.totalExpenses}`);
  lines.push(`წმინდა მოგება,${s.netProfit}`);
  lines.push('');

  lines.push('=== შემოსავლების დეტალები ===');
  lines.push('თარიღი,ქვითარი,სპეციალისტი,კლიენტი,გადახდა,თანხა,აითემები');
  data.sales.forEach((sale) => {
    const date = new Date(sale.createdAt).toLocaleString('ka-GE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    const items = sale.items.map(i => `${i.name}×${i.quantity}`).join('; ');
    lines.push(`${date},${sale.receiptNumber || ''},${sale.staffName || ''},${sale.clientName || ''},${PAYMENT_LABELS[sale.paymentMethod] || sale.paymentMethod},${sale.total},${items}`);
  });
  lines.push('');

  lines.push('=== ხარჯების დეტალები ===');
  lines.push('თარიღი,კატეგორია,აღწერა,თანხა');
  data.expenses.forEach((e) => {
    const date = new Date(e.date).toLocaleDateString('ka-GE');
    lines.push(`${date},${EXPENSE_LABELS[e.category] || e.category},${(e.description || '').replace(/,/g, ';')},${e.amount}`);
  });

  const csv = '\uFEFF' + lines.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ფინანსები_${monthLabel}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function FinanceClient() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('overview');
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [expandedSale, setExpandedSale] = useState<string | null>(null);

  const monthStr = `${year}-${String(month).padStart(2, '0')}`;
  const monthLabel = `${MONTHS_KA[month - 1]} ${year}`;

  const fetchData = () => {
    setLoading(true);
    fetch(`/api/finance?month=${monthStr}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [monthStr]);

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(year - 1); } else setMonth(month - 1); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(year + 1); } else setMonth(month + 1); };

  const filteredExpenses = useMemo(() => {
    if (!data) return [];
    if (!categoryFilter) return data.expenses;
    return data.expenses.filter((e) => e.category === categoryFilter);
  }, [data, categoryFilter]);

  const handleSave = async (expenseData: any) => {
    try {
      const url = editingExpense ? `/api/finance/${editingExpense.id}` : '/api/finance';
      const method = editingExpense ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(expenseData) });
      if (!res.ok) { const error = await res.json(); throw new Error(error.message || 'შეცდომა'); }
      setShowModal(false); setEditingExpense(null); fetchData();
    } catch (err: any) { alert(err.message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('ნამდვილად გსურთ ხარჯის წაშლა?')) return;
    try {
      const res = await fetch(`/api/finance/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('წაშლა ვერ მოხერხდა');
      fetchData();
    } catch (err: any) { alert(err.message); }
    setActiveMenu(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary-400/30 border-t-primary-400 rounded-full animate-spin" />
      </div>
    );
  }

  const s = data?.summary;
  const sales = data?.sales || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <DollarSign size={24} className="text-primary-400" />
            ფინანსები
          </h1>
          <p className="text-dark-400 mt-1">შემოსავლები და ხარჯები</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => data && downloadCSV(data, monthLabel)} className="btn-secondary flex items-center gap-2">
            <Download size={16} /> ექსპორტი
          </button>
          <button onClick={() => { setEditingExpense(null); setShowModal(true); }} className="btn-primary flex items-center gap-2">
            <Plus size={18} /> ხარჯი
          </button>
        </div>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-center gap-4">
        <button onClick={prevMonth} className="p-2 text-dark-400 hover:text-white rounded-lg hover:bg-dark-700"><ChevronLeft size={20} /></button>
        <div className="flex items-center gap-2 text-white font-medium">
          <Calendar size={16} className="text-primary-400" /> {monthLabel}
        </div>
        <button onClick={nextMonth} className="p-2 text-dark-400 hover:text-white rounded-lg hover:bg-dark-700"><ChevronRight size={20} /></button>
      </div>

      {/* Summary Cards */}
      {s && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <button onClick={() => setTab('income')} className={cn('card p-5 text-left transition-all', tab === 'income' && 'ring-1 ring-emerald-500/50')}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                <TrendingUp size={20} className="text-emerald-400" />
              </div>
              <span className="text-sm text-dark-400">შემოსავალი</span>
            </div>
            <p className="text-2xl font-bold text-emerald-400">{formatCurrency(s.totalRevenue)}</p>
            <p className="text-xs text-dark-500 mt-1">{s.salesCount} გაყიდვა — დააჭირე დეტალებისთვის</p>
          </button>

          <button onClick={() => setTab('expenses')} className={cn('card p-5 text-left transition-all', tab === 'expenses' && 'ring-1 ring-red-500/50')}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center">
                <TrendingDown size={20} className="text-red-400" />
              </div>
              <span className="text-sm text-dark-400">ხარჯები</span>
            </div>
            <p className="text-2xl font-bold text-red-400">{formatCurrency(s.totalExpenses)}</p>
            <p className="text-xs text-dark-500 mt-1">{data?.expenses.length || 0} ჩანაწერი — დააჭირე დეტალებისთვის</p>
          </button>

          <button onClick={() => setTab('commissions')} className={cn('card p-5 text-left transition-all', tab === 'commissions' && 'ring-1 ring-orange-500/50')}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center">
                <Users size={20} className="text-orange-400" />
              </div>
              <span className="text-sm text-dark-400">საკომისიო</span>
            </div>
            <p className="text-2xl font-bold text-orange-400">{formatCurrency(s.totalCommissions)}</p>
            <p className="text-xs text-dark-500 mt-1">{data?.staffCommissions?.length || 0} სპეციალისტი</p>
          </button>

          <button onClick={() => setTab('overview')} className={cn('card p-5 text-left transition-all', tab === 'overview' && 'ring-1 ring-blue-500/50')}>
            <div className="flex items-center gap-2 mb-2">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', s.netProfit >= 0 ? 'bg-blue-500/10' : 'bg-red-500/10')}>
                <Wallet size={20} className={s.netProfit >= 0 ? 'text-blue-400' : 'text-red-400'} />
              </div>
              <span className="text-sm text-dark-400">წმინდა მოგება</span>
            </div>
            <p className={cn('text-2xl font-bold', s.netProfit >= 0 ? 'text-blue-400' : 'text-red-400')}>
              {formatCurrency(s.netProfit)}
            </p>
            {s.totalRevenue > 0 && <p className="text-xs text-dark-500 mt-1">მარჟა: {((s.netProfit / s.totalRevenue) * 100).toFixed(1)}%</p>}
            {s.totalCommissions > 0 && <p className="text-[10px] text-dark-600">კომისიის შემდეგ</p>}
          </button>
        </div>
      )}

      {/* Overview Tab - breakdown */}
      {tab === 'overview' && s && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="card">
            <h3 className="font-semibold text-white mb-3">შემოსავალი მეთოდით</h3>
            {Object.keys(s.revenueByMethod).length === 0 ? (
              <p className="text-dark-500 text-sm">მონაცემები არ არის</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(s.revenueByMethod).sort(([,a],[,b]) => b - a).map(([m, v]) => (
                  <div key={m} className="flex justify-between items-center">
                    <span className="text-sm text-dark-300">{PAYMENT_LABELS[m] || m}</span>
                    <span className="text-sm font-medium text-emerald-400">{formatCurrency(v)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="card">
            <h3 className="font-semibold text-white mb-3">ხარჯები კატეგორიით</h3>
            {Object.keys(s.expensesByCategory).length === 0 ? (
              <p className="text-dark-500 text-sm">მონაცემები არ არის</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(s.expensesByCategory).sort(([,a],[,b]) => b - a).map(([c, v]) => (
                  <div key={c} className="flex justify-between items-center">
                    <span className={cn('badge text-xs', EXPENSE_COLORS[c] || EXPENSE_COLORS.OTHER)}>{EXPENSE_LABELS[c] || c}</span>
                    <span className="text-sm font-medium text-red-400">{formatCurrency(v)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Income Tab - Sales Details */}
      {tab === 'income' && (
        <div className="card">
          <h3 className="font-semibold text-white mb-4">შემოსავლის დეტალები — {MONTHS_KA[month - 1]}</h3>
          {sales.length === 0 ? (
            <div className="text-center py-8 text-dark-500 text-sm">გაყიდვები არ არის</div>
          ) : (
            <div className="space-y-2">
              {sales.map((sale) => {
                const PayIcon = PAYMENT_ICONS[sale.paymentMethod] || Receipt;
                const isExpanded = expandedSale === sale.id;
                return (
                  <div key={sale.id} className="bg-dark-800/50 rounded-lg hover:bg-dark-800 transition-colors">
                    <button
                      onClick={() => setExpandedSale(isExpanded ? null : sale.id)}
                      className="w-full flex items-center gap-3 p-3 text-left"
                    >
                      <div className="w-9 h-9 bg-dark-700 rounded-lg flex items-center justify-center shrink-0">
                        <PayIcon size={16} className="text-dark-300" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-emerald-400">{formatCurrency(sale.total)}</span>
                          <span className="text-[10px] bg-dark-600 text-dark-300 px-1.5 py-0.5 rounded">
                            {PAYMENT_LABELS[sale.paymentMethod] || sale.paymentMethod}
                          </span>
                          {sale.receiptNumber && (
                            <span className="text-[10px] text-dark-500">#{sale.receiptNumber}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-dark-400 mt-0.5">
                          <span>
                            {new Date(sale.createdAt).toLocaleString('ka-GE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {sale.staffName && (
                            <span className="flex items-center gap-1"><Users size={10} />{sale.staffName}</span>
                          )}
                          {sale.clientName && (
                            <span className="flex items-center gap-1"><User size={10} />{sale.clientName}</span>
                          )}
                        </div>
                      </div>
                      {isExpanded ? <ChevronUp size={16} className="text-dark-400 shrink-0" /> : <ChevronDown size={16} className="text-dark-400 shrink-0" />}
                    </button>

                    {isExpanded && (
                      <div className="px-3 pb-3 pt-1 border-t border-dark-700 mx-3 space-y-1.5">
                        {sale.items.map((item, i) => (
                          <div key={i} className="flex items-center justify-between text-sm">
                            <span className="text-dark-300 flex items-center gap-2">
                              {item.name}
                              <span className={cn('text-[9px] px-1 py-0.5 rounded',
                                item.type === 'SERVICE' ? 'bg-primary-500/20 text-primary-400' : 'bg-emerald-500/20 text-emerald-400'
                              )}>
                                {item.type === 'SERVICE' ? 'სერვ.' : 'პროდ.'}
                              </span>
                              <span className="text-dark-500">× {item.quantity}</span>
                            </span>
                            <span className="text-dark-200">{formatCurrency(item.total)}</span>
                          </div>
                        ))}
                        {sale.discount > 0 && (
                          <div className="flex justify-between text-sm text-amber-400">
                            <span>ფასდაკლება</span>
                            <span>-{formatCurrency(sale.discount)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm font-medium pt-1 border-t border-dark-700/50">
                          <span className="text-white">სულ</span>
                          <span className="text-emerald-400">{formatCurrency(sale.total)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Commissions Tab */}
      {tab === 'commissions' && (
        <div className="card">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Users size={16} className="text-orange-400" />
            სპეციალისტების საკომისიო — {MONTHS_KA[month - 1]}
          </h3>
          {(!data?.staffCommissions || data.staffCommissions.length === 0) ? (
            <div className="text-center py-8 text-dark-500 text-sm">მონაცემები არ არის</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-dark-700">
                      <th className="text-left px-3 py-2 text-xs font-medium text-dark-400">სპეციალისტი</th>
                      <th className="text-right px-3 py-2 text-xs font-medium text-dark-400">შემოსავალი</th>
                      <th className="text-center px-3 py-2 text-xs font-medium text-dark-400">გაყიდვები</th>
                      <th className="text-center px-3 py-2 text-xs font-medium text-dark-400">განაკვეთი</th>
                      <th className="text-right px-3 py-2 text-xs font-medium text-dark-400">საკომისიო</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-700/50">
                    {data.staffCommissions.map((sc) => (
                      <tr key={sc.id} className="hover:bg-dark-800/50">
                        <td className="px-3 py-3 text-sm text-white font-medium">{sc.name}</td>
                        <td className="px-3 py-3 text-sm text-emerald-400 text-right">{formatCurrency(sc.revenue)}</td>
                        <td className="px-3 py-3 text-sm text-dark-300 text-center">{sc.salesCount}</td>
                        <td className="px-3 py-3 text-center">
                          {sc.commissionType === 'NONE' ? (
                            <span className="text-xs text-dark-500">—</span>
                          ) : (
                            <span className="text-xs text-dark-300">
                              {sc.commissionType === 'PERCENTAGE' ? `${sc.commissionRate}%` : `${sc.commissionRate} ₾/გაყ.`}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-sm text-orange-400 font-medium text-right">
                          {sc.commission > 0 ? formatCurrency(sc.commission) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-dark-600">
                      <td colSpan={4} className="px-3 py-3 text-sm font-medium text-white">სულ საკომისიო</td>
                      <td className="px-3 py-3 text-sm font-bold text-orange-400 text-right">
                        {formatCurrency(data.staffCommissions.reduce((s, sc) => s + sc.commission, 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <p className="text-[10px] text-dark-600 mt-3">
                * საკომისიოს განაკვეთი იცვლება სპეციალისტების გვერდზე
              </p>
            </>
          )}
        </div>
      )}

      {/* Expenses Tab */}
      {tab === 'expenses' && (
        <div className="card">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h3 className="font-semibold text-white">ხარჯები — {MONTHS_KA[month - 1]}</h3>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setCategoryFilter('')}
                className={cn('px-2.5 py-1 rounded text-xs transition-colors', !categoryFilter ? 'bg-primary-500/20 text-primary-400' : 'bg-dark-700 text-dark-400 hover:text-white')}>
                ყველა
              </button>
              {ALL_CATEGORIES.map((cat) => (
                <button key={cat} onClick={() => setCategoryFilter(categoryFilter === cat ? '' : cat)}
                  className={cn('px-2.5 py-1 rounded text-xs transition-colors', categoryFilter === cat ? 'bg-primary-500/20 text-primary-400' : 'bg-dark-700 text-dark-400 hover:text-white')}>
                  {EXPENSE_LABELS[cat]}
                </button>
              ))}
            </div>
          </div>

          {filteredExpenses.length === 0 ? (
            <div className="text-center py-8 text-dark-500 text-sm">
              {categoryFilter ? 'ამ კატეგორიაში ხარჯი არ არის' : 'ხარჯები არ არის ჩაწერილი'}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredExpenses.map((exp) => (
                <div key={exp.id} className="flex items-center gap-3 p-3 bg-dark-800/50 rounded-lg hover:bg-dark-800 transition-colors">
                  <div className={cn('badge text-xs', EXPENSE_COLORS[exp.category] || EXPENSE_COLORS.OTHER)}>
                    {EXPENSE_LABELS[exp.category] || exp.category}
                  </div>
                  <div className="flex-1 min-w-0">
                    {exp.description && <p className="text-sm text-dark-200 truncate">{exp.description}</p>}
                    <p className="text-xs text-dark-500">
                      {new Date(exp.date).toLocaleDateString('ka-GE', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-red-400">{formatCurrency(exp.amount)}</span>
                  <div className="relative">
                    <button onClick={() => setActiveMenu(activeMenu === exp.id ? null : exp.id)}
                      className="p-1.5 text-dark-400 hover:text-white rounded-lg hover:bg-dark-700">
                      <MoreVertical size={14} />
                    </button>
                    {activeMenu === exp.id && (
                      <div className="absolute right-0 top-8 w-36 bg-dark-700 border border-dark-600 rounded-lg shadow-xl z-10 py-1">
                        <button onClick={() => { setEditingExpense(exp); setShowModal(true); setActiveMenu(null); }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-dark-200 hover:bg-dark-600">
                          <Edit2 size={14} /> რედაქტირება
                        </button>
                        <button onClick={() => handleDelete(exp.id)}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-dark-600">
                          <Trash2 size={14} /> წაშლა
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showModal && (
        <ExpenseModal
          expense={editingExpense}
          onClose={() => { setShowModal(false); setEditingExpense(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
