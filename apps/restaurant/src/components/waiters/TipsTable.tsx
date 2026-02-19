'use client';

import { useState, Fragment, useCallback } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

export type TipStatRow = {
  employeeId: string;
  employeeName: string;
  ordersCount: number;
  tipsTotal: number;
  tipsAvg: number;
  tipsMax: number;
};

export type TipDetail = {
  id: string;
  orderNumber?: string;
  amount: number;
  createdAt: string;
};

export function TipsTable({
  stats,
  poolTotal,
  recentTipsByEmployee,
  onFetchRecentTips,
}: {
  stats: TipStatRow[];
  poolTotal: number;
  recentTipsByEmployee?: (employeeId: string) => TipDetail[];
  onFetchRecentTips?: (employeeId: string) => Promise<TipDetail[]>;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'total' | 'orders'>('total');
  const [loadedDetails, setLoadedDetails] = useState<Record<string, TipDetail[]>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const getDetails = useCallback(
    (employeeId: string): TipDetail[] => {
      if (recentTipsByEmployee) return recentTipsByEmployee(employeeId) ?? [];
      return loadedDetails[employeeId] ?? [];
    },
    [recentTipsByEmployee, loadedDetails]
  );

  const toggleExpand = useCallback(
    async (employeeId: string) => {
      if (expandedId === employeeId) {
        setExpandedId(null);
        return;
      }
      setExpandedId(employeeId);
      if (onFetchRecentTips && !loadedDetails[employeeId]) {
        setLoadingId(employeeId);
        try {
          const list = await onFetchRecentTips(employeeId);
          setLoadedDetails((prev) => ({ ...prev, [employeeId]: list }));
        } finally {
          setLoadingId(null);
        }
      }
    },
    [expandedId, onFetchRecentTips, loadedDetails]
  );

  const sorted = [...stats].sort((a, b) =>
    sortBy === 'total' ? b.tipsTotal - a.tipsTotal : b.ordersCount - a.ordersCount
  );

  return (
    <div className="space-y-4">
      {poolTotal > 0 && (
        <div className="rounded-xl border border-white/10 bg-amber-500/10 p-4">
          <p className="text-sm font-medium text-amber-400">Pool Tips (ჯამი): ₾{poolTotal.toFixed(2)}</p>
        </div>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setSortBy('total')}
          className={`rounded-lg px-3 py-1.5 text-sm ${sortBy === 'total' ? 'bg-orange-500/30' : 'bg-white/5'}`}
        >
          სორტი: Tips ჯამი
        </button>
        <button
          type="button"
          onClick={() => setSortBy('orders')}
          className={`rounded-lg px-3 py-1.5 text-sm ${sortBy === 'orders' ? 'bg-orange-500/30' : 'bg-white/5'}`}
        >
          სორტი: შეკვეთები
        </button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              <th className="p-3 font-medium text-slate-400"></th>
              <th className="p-3 font-medium text-slate-400">თანამშრომელი</th>
              <th className="p-3 font-medium text-slate-400">შეკვეთები</th>
              <th className="p-3 font-medium text-slate-400">Tips ჯამი</th>
              <th className="p-3 font-medium text-slate-400">საშუალო</th>
              <th className="p-3 font-medium text-slate-400">საუკეთესო</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => {
              const isExpanded = expandedId === row.employeeId;
              const details = getDetails(row.employeeId);
              const canExpand = row.ordersCount > 0;
              const isLoading = loadingId === row.employeeId;
              return (
                <Fragment key={row.employeeId}>
                  <tr
                    className="border-b border-white/5 hover:bg-white/5"
                  >
                    <td className="p-2 w-8">
                      {canExpand && (
                        <button
                          type="button"
                          onClick={() => toggleExpand(row.employeeId)}
                          disabled={isLoading}
                          className="p-1 text-slate-400 disabled:opacity-50"
                        >
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                      )}
                    </td>
                    <td className="p-3 font-medium text-white">{row.employeeName}</td>
                    <td className="p-3 text-slate-300">{row.ordersCount}</td>
                    <td className="p-3 text-emerald-400 font-medium">₾{row.tipsTotal.toFixed(2)}</td>
                    <td className="p-3 text-slate-400">₾{row.tipsAvg.toFixed(2)}</td>
                    <td className="p-3 text-slate-400">₾{row.tipsMax.toFixed(2)}</td>
                  </tr>
                  {isExpanded && (
                    <tr className="bg-white/5">
                      <td colSpan={6} className="p-3">
                        {isLoading ? (
                          <div className="pl-6 text-xs text-slate-500">იტვირთება...</div>
                        ) : details.length > 0 ? (
                          <div className="space-y-1 pl-6 text-xs text-slate-400">
                            {details.slice(0, 10).map((d) => (
                              <div key={d.id} className="flex justify-between">
                                <span>#{d.orderNumber ?? d.id} · {new Date(d.createdAt).toLocaleString('ka-GE')}</span>
                                <span className="text-emerald-400">₾{d.amount.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="pl-6 text-xs text-slate-500">tips არ არის</div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
