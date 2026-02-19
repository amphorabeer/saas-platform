'use client';

import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';

export type CustomerRow = {
  customerPhone: string;
  customerName: string | null;
  orderCount: number;
  totalSpent: number;
  avgCheck: number;
  lastOrderAt: string;
  dineInCount: number;
  takeawayCount: number;
  deliveryCount: number;
};

type CustomerTableProps = {
  rows: CustomerRow[];
  sortBy: string;
  onSort: (key: string) => void;
  onRowClick: (phone: string) => void;
  currency?: string;
};

const ORDER_TYPE_LABEL: Record<string, string> = {
  DINE_IN: 'Dine In',
  TAKEAWAY: 'Take Away',
  DELIVERY: 'Delivery',
};

export function CustomerTable({
  rows,
  sortBy,
  onSort,
  onRowClick,
  currency = '₾',
}: CustomerTableProps) {
  const SortIcon = ({ column }: { column: string }) =>
    sortBy === column ? (
      <ChevronDown className="inline h-4 w-4" />
    ) : (
      <ChevronUp className="inline h-4 w-4 opacity-0 group-hover:opacity-50" />
    );

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-[#1E293B]/50">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              <th className="p-3 font-medium text-slate-400">სახელი</th>
              <th className="p-3 font-medium text-slate-400">ტელეფონი</th>
              <th
                className="group cursor-pointer p-3 font-medium text-slate-400 hover:text-white"
                onClick={() => onSort('orderCount')}
              >
                შეკვეთები <SortIcon column="orderCount" />
              </th>
              <th
                className="group cursor-pointer p-3 font-medium text-slate-400 hover:text-white"
                onClick={() => onSort('totalSpent')}
              >
                ჯამი <SortIcon column="totalSpent" />
              </th>
              <th className="p-3 font-medium text-slate-400">საშ. ჩეკი</th>
              <th
                className="group cursor-pointer p-3 font-medium text-slate-400 hover:text-white"
                onClick={() => onSort('lastOrder')}
              >
                ბოლო შეკვეთა <SortIcon column="lastOrder" />
              </th>
              <th className="p-3 font-medium text-slate-400">ტიპი</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <motion.tr
                key={row.customerPhone}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="cursor-pointer border-b border-white/5 transition hover:bg-orange-500/10"
                onClick={() => onRowClick(row.customerPhone)}
              >
                <td className="p-3 font-medium text-white">
                  {row.customerName || '—'}
                </td>
                <td className="p-3 font-mono text-slate-300">{row.customerPhone}</td>
                <td className="p-3 text-slate-300">{row.orderCount}</td>
                <td className="p-3 font-medium text-white">
                  {row.totalSpent.toFixed(2)}
                  {currency}
                </td>
                <td className="p-3 text-slate-400">
                  {row.avgCheck.toFixed(2)}
                  {currency}
                </td>
                <td className="p-3 text-slate-400">
                  {row.lastOrderAt
                    ? new Date(row.lastOrderAt).toLocaleDateString('ka-GE', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })
                    : '—'}
                </td>
                <td className="p-3 text-slate-400">
                  <span className="flex flex-wrap gap-1">
                    {row.dineInCount > 0 && (
                      <span className="rounded bg-slate-500/20 px-1.5 py-0.5 text-xs">
                        {ORDER_TYPE_LABEL.DINE_IN} {row.dineInCount}
                      </span>
                    )}
                    {row.takeawayCount > 0 && (
                      <span className="rounded bg-slate-500/20 px-1.5 py-0.5 text-xs">
                        {ORDER_TYPE_LABEL.TAKEAWAY} {row.takeawayCount}
                      </span>
                    )}
                    {row.deliveryCount > 0 && (
                      <span className="rounded bg-slate-500/20 px-1.5 py-0.5 text-xs">
                        {ORDER_TYPE_LABEL.DELIVERY} {row.deliveryCount}
                      </span>
                    )}
                  </span>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && (
        <div className="py-12 text-center text-slate-400">
          მომხმარებლები ვერ მოიძებნა
        </div>
      )}
    </div>
  );
}
