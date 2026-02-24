'use client';

import { useState } from 'react';
import {
  ArrowLeft,
  History,
  Receipt,
  Banknote,
  CreditCard,
  Smartphone,
  ArrowRightLeft,
  Gift,
  User,
  Clock,
  ChevronDown,
  ChevronUp,
  Search,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';

interface SaleRecord {
  id: string;
  total: number;
  subtotal: number;
  discount: number;
  paymentMethod: string;
  paymentStatus: string;
  receiptNumber: string | null;
  createdAt: string;
  clientName: string | null;
  staffName: string | null;
  items: { name: string; quantity: number; unitPrice: number; total: number }[];
}

const paymentIcons: Record<string, any> = {
  CASH: Banknote,
  CARD: CreditCard,
  TRANSFER: Smartphone,
  SPLIT: ArrowRightLeft,
  GIFT_CARD: Gift,
};

const paymentLabels: Record<string, string> = {
  CASH: 'ნაღდი',
  CARD: 'ბარათი',
  TRANSFER: 'გადარიცხვა',
  SPLIT: 'გაყოფილი',
  GIFT_CARD: 'სასაჩუქრე',
};

const statusColors: Record<string, string> = {
  COMPLETED: 'bg-emerald-500/10 text-emerald-400',
  PENDING: 'bg-amber-500/10 text-amber-400',
  REFUNDED: 'bg-red-500/10 text-red-400',
  PARTIAL: 'bg-blue-500/10 text-blue-400',
};

const statusLabels: Record<string, string> = {
  COMPLETED: 'დასრულებული',
  PENDING: 'მომლოდინე',
  REFUNDED: 'დაბრუნებული',
  PARTIAL: 'ნაწილობრივი',
};

export function SalesHistory({
  sales,
  onBack,
}: {
  sales: SaleRecord[];
  onBack: () => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const filtered = sales.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.receiptNumber?.toLowerCase().includes(q) ||
      s.clientName?.toLowerCase().includes(q) ||
      s.staffName?.toLowerCase().includes(q) ||
      s.items.some((i) => i.name.toLowerCase().includes(q))
    );
  });

  const todayTotal = sales
    .filter((s) => {
      const d = new Date(s.createdAt);
      const today = new Date();
      return (
        d.getDate() === today.getDate() &&
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear() &&
        s.paymentStatus === 'COMPLETED'
      );
    })
    .reduce((sum, s) => sum + s.total, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 text-dark-400 hover:text-white rounded-lg hover:bg-dark-700"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <History size={24} className="text-primary-400" />
              გაყიდვების ისტორია
            </h1>
            <p className="text-dark-400 mt-1">
              სულ {sales.length} გაყიდვა
            </p>
          </div>
        </div>
        <div className="card px-4 py-2">
          <p className="text-xs text-dark-400">დღეს</p>
          <p className="text-lg font-bold text-emerald-400">{formatCurrency(todayTotal)}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ძებნა ქვითრით, კლიენტით..."
          className="input pl-10"
        />
      </div>

      {/* Sales List */}
      {filtered.length === 0 ? (
        <div className="card text-center py-12">
          <Receipt size={48} className="mx-auto mb-4 text-dark-500 opacity-30" />
          <p className="text-dark-400">გაყიდვები ვერ მოიძებნა</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((sale) => {
            const PayIcon = paymentIcons[sale.paymentMethod] || Receipt;
            const isExpanded = expandedId === sale.id;

            return (
              <div key={sale.id} className="card-hover">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : sale.id)}
                  className="w-full flex items-center gap-4 text-left"
                >
                  <div className="w-10 h-10 bg-dark-700 rounded-lg flex items-center justify-center shrink-0">
                    <PayIcon size={18} className="text-dark-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">
                        {formatCurrency(sale.total)}
                      </span>
                      <span
                        className={cn(
                          'badge text-[10px]',
                          statusColors[sale.paymentStatus] || 'bg-dark-600 text-dark-300'
                        )}
                      >
                        {statusLabels[sale.paymentStatus] || sale.paymentStatus}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-dark-400 mt-0.5">
                      <span className="flex items-center gap-1">
                        <Clock size={10} />
                        {new Date(sale.createdAt).toLocaleString('ka-GE', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {sale.clientName && (
                        <span className="flex items-center gap-1">
                          <User size={10} />
                          {sale.clientName}
                        </span>
                      )}
                      <span>{paymentLabels[sale.paymentMethod] || sale.paymentMethod}</span>
                      {sale.receiptNumber && (
                        <span className="text-dark-500">#{sale.receiptNumber}</span>
                      )}
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp size={16} className="text-dark-400 shrink-0" />
                  ) : (
                    <ChevronDown size={16} className="text-dark-400 shrink-0" />
                  )}
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-dark-700 space-y-2">
                    {sale.items.map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-dark-300">
                          {item.name} × {item.quantity}
                        </span>
                        <span className="text-dark-200">{formatCurrency(item.total)}</span>
                      </div>
                    ))}
                    {sale.discount > 0 && (
                      <div className="flex items-center justify-between text-sm text-amber-400">
                        <span>ფასდაკლება</span>
                        <span>-{formatCurrency(sale.discount)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm font-medium pt-1 border-t border-dark-700">
                      <span className="text-white">სულ</span>
                      <span className="text-emerald-400">{formatCurrency(sale.total)}</span>
                    </div>
                    {sale.staffName && (
                      <p className="text-xs text-dark-400">სპეციალისტი: {sale.staffName}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
