'use client';

import { useState, Fragment } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { OrderDetailExpand } from './OrderDetailExpand';

const ORDER_TYPE_LABEL: Record<string, string> = {
  DINE_IN: 'Dine In',
  TAKEAWAY: 'Take Away',
  DELIVERY: 'Delivery',
};
const STATUS_STYLE: Record<string, string> = {
  PAID: 'bg-emerald-500/20 text-emerald-400',
  CANCELLED: 'bg-red-500/20 text-red-400',
  DRAFT: 'bg-slate-500/20 text-slate-400',
  CONFIRMED: 'bg-blue-500/20 text-blue-400',
  SERVED: 'bg-amber-500/20 text-amber-400',
};

export type SalesOrderRow = {
  id: string;
  orderNumber: string;
  createdAt: string;
  orderType: string;
  status: string;
  table: { number: string; zoneName?: string } | null;
  waiter: { name: string } | null;
  itemsCount: number;
  subtotal: number;
  discountAmount: number;
  tipAmount: number;
  totalAmount: number;
  paymentMethod: string | null;
  items: Array<{
    id: string;
    menuItemName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    modifiers?: unknown;
  }>;
};

export function SalesTable({
  orders,
  onSort,
  sortBy,
  page,
  totalPages,
  total,
  onPageChange,
}: {
  orders: SalesOrderRow[];
  onSort: (key: string) => void;
  sortBy: string;
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (p: number) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#1E293B]/50">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              <th className="w-8 p-3"></th>
              <th className="p-3 font-medium text-slate-400">#</th>
              <th
                className="cursor-pointer p-3 font-medium text-slate-400 hover:text-white"
                onClick={() => onSort('date')}
              >
                თარიღი/დრო {sortBy === 'date' && '▾'}
              </th>
              <th className="p-3 font-medium text-slate-400">ტიპი</th>
              <th className="p-3 font-medium text-slate-400">მაგიდა</th>
              <th className="p-3 font-medium text-slate-400">ოფიციანტი</th>
              <th className="p-3 font-medium text-slate-400">პოზ.</th>
              <th className="p-3 font-medium text-slate-400">subtotal</th>
              <th className="p-3 font-medium text-slate-400">ფასდაკლ.</th>
              <th className="p-3 font-medium text-slate-400">tip</th>
              <th
                className="cursor-pointer p-3 font-medium text-slate-400 hover:text-white"
                onClick={() => onSort('totalAmount')}
              >
                ჯამი {sortBy === 'totalAmount' && '▾'}
              </th>
              <th className="p-3 font-medium text-slate-400">გადახდა</th>
              <th className="p-3 font-medium text-slate-400">სტატუსი</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => {
              const isExpanded = expandedId === o.id;
              return (
                <Fragment key={o.id}>
                  <tr
                    key={o.id}
                    className="cursor-pointer border-b border-white/5 hover:bg-white/5"
                    onClick={() => setExpandedId(isExpanded ? null : o.id)}
                  >
                    <td className="p-2">
                      <span className="text-slate-400">
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-white">{o.orderNumber}</td>
                    <td className="p-3 text-slate-300">
                      {new Date(o.createdAt).toLocaleString('ka-GE')}
                    </td>
                    <td className="p-3">
                      <span className="rounded px-2 py-0.5 text-xs bg-white/10 text-slate-300">
                        {ORDER_TYPE_LABEL[o.orderType] ?? o.orderType}
                      </span>
                    </td>
                    <td className="p-3 text-slate-400">{o.table ? `T${o.table.number}` : '—'}</td>
                    <td className="p-3 text-slate-400">{o.waiter?.name ?? '—'}</td>
                    <td className="p-3 text-slate-300">{o.itemsCount}</td>
                    <td className="p-3 text-slate-300">₾{o.subtotal.toFixed(2)}</td>
                    <td className="p-3 text-slate-400">₾{o.discountAmount.toFixed(2)}</td>
                    <td className="p-3 text-slate-400">₾{o.tipAmount.toFixed(2)}</td>
                    <td className="p-3 font-medium text-emerald-400">₾{o.totalAmount.toFixed(2)}</td>
                    <td className="p-3 text-slate-500 text-xs">{o.paymentMethod ?? '—'}</td>
                    <td className="p-3">
                      <span className={`rounded px-2 py-0.5 text-xs ${STATUS_STYLE[o.status] ?? 'bg-slate-500/20'}`}>
                        {o.status}
                      </span>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="border-b border-white/5">
                      <td colSpan={13} className="p-0">
                        <OrderDetailExpand items={o.items} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-sm text-slate-400">
        <span>სულ: {total} შეკვეთა</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="rounded-lg border border-white/10 px-3 py-1 disabled:opacity-50 hover:bg-white/5"
          >
            წინა
          </button>
          <span className="px-2 py-1">{page} / {totalPages || 1}</span>
          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="rounded-lg border border-white/10 px-3 py-1 disabled:opacity-50 hover:bg-white/5"
          >
            შემდეგი
          </button>
        </div>
      </div>
    </div>
  );
}
