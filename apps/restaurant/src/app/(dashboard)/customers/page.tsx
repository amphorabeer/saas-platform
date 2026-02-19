'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { CustomerTable } from '@/components/customers/CustomerTable';
import type { CustomerRow } from '@/components/customers/CustomerTable';
import { CustomerDetail } from '@/components/customers/CustomerDetail';

type SortKey = 'orderCount' | 'totalSpent' | 'lastOrder';
type OrderTypeFilter = '' | 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';

export default function CustomersPage() {
  const [data, setData] = useState<CustomerRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [orderType, setOrderType] = useState<OrderTypeFilter>('');
  const [sort, setSort] = useState<SortKey>('orderCount');
  const [detailPhone, setDetailPhone] = useState<string | null>(null);

  const limit = 20;

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      params.set('sort', sort);
      if (searchDebounced) params.set('search', searchDebounced);
      if (orderType) params.set('orderType', orderType);
      const res = await fetch(`/api/customers?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setData(json.data);
      setTotal(json.total);
      setTotalPages(json.totalPages ?? Math.ceil(json.total / limit));
    } catch {
      setData([]);
      setTotal(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [page, limit, sort, searchDebounced, orderType]);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  useEffect(() => {
    setPage(1);
  }, [searchDebounced, orderType, sort]);

  const handleSort = (key: string) => {
    if (key === 'orderCount' || key === 'totalSpent' || key === 'lastOrder') {
      setSort(key);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-white">მომხმარებლები</h1>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center gap-4"
      >
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="სახელი ან ტელეფონი..."
            className="w-full rounded-xl border border-white/10 bg-[#1E293B]/60 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-orange-500/50 focus:outline-none focus:ring-1 focus:ring-orange-500/30"
          />
        </div>
        <select
          value={orderType}
          onChange={(e) => setOrderType(e.target.value as OrderTypeFilter)}
          className="rounded-xl border border-white/10 bg-[#1E293B]/60 px-4 py-2.5 text-sm text-white focus:border-orange-500/50 focus:outline-none"
        >
          <option value="">ყველა ტიპი</option>
          <option value="DINE_IN">Dine In</option>
          <option value="TAKEAWAY">Take Away</option>
          <option value="DELIVERY">Delivery</option>
        </select>
      </motion.div>

      <div className="rounded-xl border border-white/10 bg-[#1E293B]/40 p-4">
        {loading ? (
          <p className="py-8 text-center text-slate-400">იტვირთება...</p>
        ) : (
          <>
            <CustomerTable
              rows={data}
              sortBy={sort}
              onSort={handleSort}
              onRowClick={setDetailPhone}
              currency="₾"
            />
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-400 transition hover:bg-white/10 disabled:opacity-50"
                >
                  წინა
                </button>
                <span className="text-sm text-slate-400">
                  {page} / {totalPages} (სულ {total})
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-400 transition hover:bg-white/10 disabled:opacity-50"
                >
                  შემდეგი
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <CustomerDetail
        phone={detailPhone ?? ''}
        open={!!detailPhone}
        onClose={() => setDetailPhone(null)}
        currency="₾"
      />
    </div>
  );
}
