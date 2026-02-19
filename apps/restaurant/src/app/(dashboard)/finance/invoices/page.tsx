'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Plus, FileText } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'შავი',
  SENT: 'გაგზავნილი',
  PAID: 'გადახდილი',
  PARTIAL: 'ნაწილობრივი',
  OVERDUE: 'ვადაგადაცილებული',
  CANCELLED: 'გაუქმებული',
};
const STATUS_CLASS: Record<string, string> = {
  DRAFT: 'bg-slate-500/30 text-slate-300',
  SENT: 'bg-blue-500/30 text-blue-300',
  PAID: 'bg-emerald-500/30 text-emerald-300',
  PARTIAL: 'bg-amber-500/30 text-amber-300',
  OVERDUE: 'bg-red-500/30 text-red-300',
  CANCELLED: 'bg-slate-500/30 text-slate-400',
};

type InvoiceRow = {
  id: string;
  invoiceNumber: string;
  customerName: string;
  issueDate: string;
  dueDate?: string;
  totalAmount: number;
  paidAmount: number;
  status: string;
};

export default function InvoicesPage() {
  const [items, setItems] = useState<InvoiceRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    params.set('limit', '50');
    const res = await fetch(`/api/finance/invoices?${params}`, { credentials: 'include' });
    if (!res.ok) {
      setLoading(false);
      return;
    }
    const data = await res.json();
    setItems(data.items || []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const totalSum = items.reduce((s, i) => s + i.totalAmount, 0);
  const paidSum = items.reduce((s, i) => s + i.paidAmount, 0);
  const remainingSum = totalSum - paidSum;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-white">ინვოისები</h1>
        <Link
          href="/finance/invoices/new"
          className="flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
        >
          <Plus className="h-4 w-4" />
          ახალი ინვოისი
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-[#1E293B]/50 p-4">
        <div>
          <label className="block text-xs text-slate-400">სტატუსი</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
          >
            <option value="">ყველა</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-400">დან</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400">მდე</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
          />
        </div>
      </div>

      {!loading && items.length > 0 && (
        <div className="flex flex-wrap gap-6 rounded-xl border border-white/10 bg-[#1E293B]/50 p-4 text-sm">
          <span className="text-slate-400">სულ ინვოისების ჯამი: <span className="font-semibold text-white">₾{totalSum.toFixed(2)}</span></span>
          <span className="text-slate-400">გადახდილი: <span className="font-semibold text-emerald-400">₾{paidSum.toFixed(2)}</span></span>
          <span className="text-slate-400">დარჩენილი: <span className={`font-semibold ${remainingSum > 0 ? 'text-amber-400' : 'text-slate-400'}`}>₾{remainingSum.toFixed(2)}</span></span>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-white/10 bg-[#1E293B]/50">
        {loading ? (
          <div className="p-8 text-center text-slate-400">იტვირთება...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-slate-500">ინვოისები არ მოიძებნა</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 text-left text-sm text-slate-400">
                  <th className="p-3">#</th>
                  <th className="p-3">თარიღი</th>
                  <th className="p-3">ვადა</th>
                  <th className="p-3">მომხმარებელი</th>
                  <th className="p-3 text-right">ჯამი</th>
                  <th className="p-3 text-right">გადახდილი</th>
                  <th className="p-3">სტატუსი</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id} className="border-b border-white/5 text-sm text-white hover:bg-white/5">
                    <td className="p-3 font-medium">{row.invoiceNumber}</td>
                    <td className="p-3">{row.issueDate}</td>
                    <td className={`p-3 ${row.status === 'OVERDUE' ? 'text-red-400 font-medium' : ''}`}>{row.dueDate ?? '—'}</td>
                    <td className="p-3">{row.customerName}</td>
                    <td className="p-3 text-right">₾{row.totalAmount.toFixed(2)}</td>
                    <td className="p-3 text-right">₾{row.paidAmount.toFixed(2)}</td>
                    <td className="p-3">
                      <span className={`rounded-lg px-2 py-0.5 text-xs ${STATUS_CLASS[row.status] ?? 'bg-slate-500/30'}`}>
                        {STATUS_LABEL[row.status] ?? row.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <Link
                        href={`/finance/invoices/${row.id}`}
                        className="rounded-lg px-2 py-1 text-orange-400 hover:bg-orange-500/20"
                      >
                        ნახვა
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
