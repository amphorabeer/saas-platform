'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { CustomerStats } from './CustomerStats';
import { CustomerOrderHistory } from './CustomerOrderHistory';
import type { OrderHistoryRow } from './CustomerOrderHistory';
import { FavoriteItems } from './FavoriteItems';
import type { FavoriteItemRow } from './FavoriteItems';

type CustomerDetailData = {
  customerPhone: string;
  customerName: string | null;
  orderCount: number;
  totalSpent: number;
  avgCheck: number;
  lastOrderAt: string;
  orders: OrderHistoryRow[];
  topItems: FavoriteItemRow[];
};

type CustomerDetailProps = {
  phone: string;
  open: boolean;
  onClose: () => void;
  currency?: string;
};

export function CustomerDetail({ phone, open, onClose, currency = '₾' }: CustomerDetailProps) {
  const [data, setData] = useState<CustomerDetailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !phone) return;
    setLoading(true);
    setError('');
    fetch(`/api/customers/${encodeURIComponent(phone)}`)
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 404 ? 'მომხმარებელი ვერ მოიძებნა' : 'შეცდომა');
        return res.json();
      })
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'შეცდომა'))
      .finally(() => setLoading(false));
  }, [open, phone]);

  const orderList: OrderHistoryRow[] = data?.orders ?? [];
  const topItems: FavoriteItemRow[] = data?.topItems ?? [];
  const favoriteName = topItems[0]?.name ?? null;

  return (
    <Modal open={open} onClose={onClose} title="მომხმარებლის დეტალი" maxWidth="2xl">
      <div className="max-h-[70vh] space-y-6 overflow-y-auto">
        {loading && (
          <p className="py-8 text-center text-slate-400">იტვირთება...</p>
        )}
        {error && (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
        )}
        {data && !loading && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-slate-500">სახელი</p>
                <p className="font-medium text-white">{data.customerName || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">ტელეფონი</p>
                <p className="font-medium text-white">{data.customerPhone}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs text-slate-500">ელ-ფოსტა</p>
                <p className="font-medium text-white">—</p>
              </div>
            </div>

            <CustomerStats
              orderCount={data.orderCount}
              totalSpent={data.totalSpent}
              avgCheck={data.avgCheck}
              favoriteItem={favoriteName}
              currency={currency}
            />

            <FavoriteItems items={topItems} currency={currency} />

            <CustomerOrderHistory orders={orderList} currency={currency} />
          </>
        )}
      </div>
    </Modal>
  );
}
