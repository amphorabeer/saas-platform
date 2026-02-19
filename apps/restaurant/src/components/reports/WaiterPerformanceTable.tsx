'use client';

export type WaiterRow = {
  employeeId: string;
  name: string;
  orders: number;
  sales: number;
  avgCheck: number;
  tips: number;
  avgPrepTimeMinutes: number | null;
};

export function WaiterPerformanceTable({
  waiters,
  sortBy,
  onSort,
}: {
  waiters: WaiterRow[];
  sortBy: string;
  onSort: (key: string) => void;
}) {
  const sorted = [...waiters].sort((a, b) => {
    if (sortBy === 'orders') return b.orders - a.orders;
    if (sortBy === 'sales') return b.sales - a.sales;
    if (sortBy === 'tips') return b.tips - a.tips;
    return 0;
  });

  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-white/10 bg-white/5">
            <th className="p-3 font-medium text-slate-400">ოფიციანტი</th>
            <th className="cursor-pointer p-3 font-medium text-slate-400 hover:text-white" onClick={() => onSort('orders')}>შეკვეთები</th>
            <th className="cursor-pointer p-3 font-medium text-slate-400 hover:text-white" onClick={() => onSort('sales')}>გაყიდვები (₾)</th>
            <th className="p-3 font-medium text-slate-400">საშუალო ჩეკი</th>
            <th className="cursor-pointer p-3 font-medium text-slate-400 hover:text-white" onClick={() => onSort('tips')}>Tips (₾)</th>
            <th className="p-3 font-medium text-slate-400">საშ. მომზადების დრო</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((w) => (
            <tr key={w.employeeId} className="border-b border-white/5 hover:bg-white/5">
              <td className="p-3 font-medium text-white">{w.name}</td>
              <td className="p-3 text-slate-300">{w.orders}</td>
              <td className="p-3 text-emerald-400">₾{w.sales.toFixed(2)}</td>
              <td className="p-3 text-slate-400">₾{w.avgCheck.toFixed(2)}</td>
              <td className="p-3 text-amber-400">₾{w.tips.toFixed(2)}</td>
              <td className="p-3 text-slate-400">{w.avgPrepTimeMinutes != null ? `${w.avgPrepTimeMinutes} წთ` : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
