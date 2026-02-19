'use client';

import Link from 'next/link';
import { ArrowLeft, Grid3X3 } from 'lucide-react';
import { OrderTypeSelector } from './OrderTypeSelector';
import { usePOSStore } from '@/stores/posStore';

export function POSTopBar({
  onNewOrder,
  onTableChange,
}: {
  onNewOrder?: () => void;
  onTableChange?: () => void;
}) {
  const orderNumber = usePOSStore((s) => s.orderNumber);
  const tableLabel = usePOSStore((s) => s.tableLabel);
  const waiterName = usePOSStore((s) => s.waiterName);
  const orderType = usePOSStore((s) => s.orderType);

  return (
    <>
      <div className="flex h-14 items-center justify-between gap-4 px-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-slate-300 hover:bg-white/10 hover:text-white transition touch-manipulation"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="font-medium">დეშბორდი</span>
        </Link>

        <OrderTypeSelector />

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {onNewOrder && (
            <button
              type="button"
              onClick={onNewOrder}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/10 hover:text-white transition touch-manipulation"
            >
              ახალი შეკვეთა
            </button>
          )}
          {orderType === 'DINE_IN' && (
            <button
              type="button"
              onClick={() => onTableChange?.()}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition touch-manipulation ${
                tableLabel
                  ? 'bg-white/5 text-slate-200'
                  : 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
              }`}
            >
              <Grid3X3 className="h-4 w-4" />
              {tableLabel || 'მაგიდის არჩევა'}
            </button>
          )}
          <span className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-slate-300">
            👤 {waiterName || 'არ არის არჩეული'}
          </span>
          {orderNumber && (
            <div className="rounded-lg bg-orange-500/20 px-3 py-1.5 text-sm font-medium text-orange-300">
              #{orderNumber}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
