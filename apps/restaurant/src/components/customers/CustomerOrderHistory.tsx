'use client';

import { motion } from 'framer-motion';

const ORDER_TYPE_LABEL: Record<string, string> = {
  DINE_IN: 'Dine In',
  TAKEAWAY: 'Take Away',
  DELIVERY: 'Delivery',
};
const STATUS_LABEL: Record<string, string> = {
  PAID: 'გადახდილი',
  DRAFT: 'ჩანახატი',
  CANCELLED: 'გაუქმებული',
  CONFIRMED: 'დადასტურებული',
  SERVED: 'მიწოდებული',
};

export type OrderHistoryRow = {
  id: string;
  orderNumber: string;
  orderType: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  itemCount: number;
  itemsSummary: string;
};

type CustomerOrderHistoryProps = {
  orders: OrderHistoryRow[];
  currency?: string;
};

export function CustomerOrderHistory({ orders, currency = '₾' }: CustomerOrderHistoryProps) {
  if (orders.length === 0) {
    return (
      <p className="rounded-xl border border-white/10 bg-white/5 p-4 text-center text-sm text-slate-400">
        შეკვეთების ისტორია ცარიელია
      </p>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="overflow-hidden rounded-xl border border-white/10 bg-[#1E293B]/40"
    >
      <div className="border-b border-white/10 bg-white/5 px-4 py-3">
        <h4 className="text-sm font-semibold text-white">შეკვეთების ისტორია</h4>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-slate-400">
              <th className="p-3 font-medium">თარიღი</th>
              <th className="p-3 font-medium">#</th>
              <th className="p-3 font-medium">ტიპი</th>
              <th className="p-3 font-medium">პოზიციები</th>
              <th className="p-3 font-medium">ჯამი</th>
              <th className="p-3 font-medium">სტატუსი</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-white/5 hover:bg-white/5">
                <td className="p-3 text-white">
                  {new Date(o.createdAt).toLocaleDateString('ka-GE', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </td>
                <td className="p-3 font-mono text-slate-300">{o.orderNumber}</td>
                <td className="p-3 text-slate-300">
                  {ORDER_TYPE_LABEL[o.orderType] ?? o.orderType}
                </td>
                <td className="max-w-[180px] truncate p-3 text-slate-400" title={o.itemsSummary}>
                  {o.itemsSummary || '—'}
                </td>
                <td className="p-3 font-medium text-white">
                  {o.totalAmount.toFixed(2)}
                  {currency}
                </td>
                <td className="p-3 text-slate-400">{STATUS_LABEL[o.status] ?? o.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
