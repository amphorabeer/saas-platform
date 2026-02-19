'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';

type InvoiceDetail = {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerTaxId: string | null;
  customerAddress: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  issueDate: string;
  dueDate: string | null;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  status: string;
  notes: string | null;
  items: Array<{ description: string; quantity: number; unitPrice: number; totalPrice: number }>;
  payments: Array<{ amount: number; paymentMethod: string; paidAt: string; notes?: string | null }>;
};

type SettingsOrg = {
  company: string | null;
  taxId: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  bankName: string | null;
  bankAccount: string | null;
  bankSWIFT: string | null;
  directorName: string | null;
};

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

const labelClass = 'block text-sm font-medium text-slate-400';
const valueClass = 'text-white';

export default function InvoiceDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<InvoiceDetail | null>(null);
  const [settings, setSettings] = useState<{ organization?: SettingsOrg } | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentModal, setPaymentModal] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('card');
  const [payNotes, setPayNotes] = useState('');

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetch(`/api/finance/invoices/${id}`, { credentials: 'include' }).then((r) => (r.ok ? r.json() : null)),
      fetch('/api/settings/restaurant', { credentials: 'include' }).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([inv, rest]) => {
        setData(inv);
        setSettings(rest ?? null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const refresh = () => {
    fetch(`/api/finance/invoices/${id}`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then(setData);
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) {
      toast.error('შეიყვანეთ თანხა');
      return;
    }
    const res = await fetch(`/api/finance/invoices/${id}/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ amount, paymentMethod: payMethod, notes: payNotes || undefined }),
    });
    if (!res.ok) {
      const err = await res.json();
      toast.error(err.error || 'შეცდომა');
      return;
    }
    toast.success('გადახდა დარეგისტრირდა');
    setPaymentModal(false);
    setPayAmount('');
    setPayNotes('');
    refresh();
  };

  const setStatus = async (status: 'SENT' | 'CANCELLED') => {
    const res = await fetch(`/api/finance/invoices/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const err = await res.json();
      toast.error(err.error || 'შეცდომა');
      return;
    }
    toast.success(status === 'SENT' ? 'ინვოისი გაგზავნილია' : 'ინვოისი გაუქმებულია');
    refresh();
  };

  if (loading || !data) {
    return (
      <div className="p-6">
        {loading ? <p className="text-slate-400">იტვირთება...</p> : <p className="text-slate-500">არ მოიძებნა</p>}
      </div>
    );
  }

  const org = settings?.organization;
  const remaining = data.totalAmount - data.paidAmount;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/finance/invoices" className="text-slate-400 hover:text-white">← ინვოისები</Link>
          <h1 className="text-xl font-semibold text-white">{data.invoiceNumber}</h1>
          <span className={`rounded-lg px-2 py-0.5 text-sm ${STATUS_CLASS[data.status] ?? 'bg-slate-500/30'}`}>
            {STATUS_LABEL[data.status] ?? data.status}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {data.status === 'DRAFT' && (
            <>
              <Link
                href={`/finance/invoices/${id}/edit`}
                className="rounded-xl border border-white/20 px-4 py-2 text-sm text-white hover:bg-white/10"
              >
                რედაქტირება
              </Link>
              <button type="button" onClick={() => setStatus('SENT')} className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600">
                გაგზავნა
              </button>
            </>
          )}
          {(data.status === 'SENT' || data.status === 'PARTIAL' || data.status === 'OVERDUE') && (
            <button type="button" onClick={() => setPaymentModal(true)} className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600">
              გადახდის რეგისტრაცია
            </button>
          )}
          {data.status !== 'PAID' && data.status !== 'CANCELLED' && (
            <button type="button" onClick={() => setStatus('CANCELLED')} className="rounded-xl border border-red-500/50 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10">
              გაუქმება
            </button>
          )}
          <Link
            href={`/finance/invoices/${id}/print`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-white/20 px-4 py-2 text-sm text-white hover:bg-white/10"
          >
            PDF / ბეჭდვა
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* მარცხენა: გამყიდველი (ჩემი კომპანია) */}
        <div className="rounded-xl border border-white/10 bg-[#1E293B]/50 p-6">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">გამყიდველი</h3>
          <div className="space-y-2 text-sm">
            {org?.company && <p className={valueClass}>{org.company}</p>}
            {org?.taxId && <p className="text-slate-400">საიდენტ. კოდი: {org.taxId}</p>}
            {org?.address && <p className="text-slate-400">{org.address}</p>}
            {org?.phone && <p className="text-slate-400">ტელ: {org.phone}</p>}
            {org?.email && <p className="text-slate-400">{org.email}</p>}
          </div>
          <div className="mt-4 pt-4 border-t border-white/10 space-y-1 text-sm">
            {org?.bankName && <p className={valueClass}>ბანკი: {org.bankName}</p>}
            {org?.bankAccount && <p className="text-slate-400">IBAN: {org.bankAccount}</p>}
            {org?.bankSWIFT && <p className="text-slate-400">SWIFT: {org.bankSWIFT}</p>}
            {org?.directorName && <p className="text-slate-400">ხელმძღვანელი: {org.directorName}</p>}
          </div>
        </div>

        {/* მარჯვენა: მყიდველი */}
        <div className="rounded-xl border border-white/10 bg-[#1E293B]/50 p-6">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">მყიდველი</h3>
          <div className="space-y-2 text-sm">
            <p className={valueClass}>{data.customerName}</p>
            {data.customerTaxId && <p className="text-slate-400">საიდენტ. კოდი: {data.customerTaxId}</p>}
            {data.customerAddress && <p className="text-slate-400">{data.customerAddress}</p>}
            {data.customerPhone && <p className="text-slate-400">ტელ: {data.customerPhone}</p>}
            {data.customerEmail && <p className="text-slate-400">{data.customerEmail}</p>}
          </div>
          <div className="mt-4 pt-4 border-t border-white/10 text-sm text-slate-400">
            <p>ინვოისის თარიღი: {data.issueDate}</p>
            {data.dueDate && <p>ვადა: {data.dueDate}</p>}
          </div>
        </div>
      </div>

      {/* პოზიციების ცხრილი */}
      <div className="rounded-xl border border-white/10 bg-[#1E293B]/50 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10 text-left text-sm text-slate-400">
              <th className="p-3 w-10">#</th>
              <th className="p-3">სერვისი</th>
              <th className="p-3 w-24 text-right">რაოდენობა</th>
              <th className="p-3 w-28 text-right">ფასი</th>
              <th className="p-3 w-28 text-right">ჯამი</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((i, idx) => (
              <tr key={idx} className="border-b border-white/5 text-sm text-white">
                <td className="p-3">{idx + 1}</td>
                <td className="p-3">{i.description}</td>
                <td className="p-3 text-right">{i.quantity}</td>
                <td className="p-3 text-right">₾{i.unitPrice.toFixed(2)}</td>
                <td className="p-3 text-right">₾{i.totalPrice.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ჯამები */}
      <div className="flex flex-wrap gap-6">
        <div className="rounded-xl border border-white/10 bg-[#1E293B]/50 p-6 min-w-[280px] space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Subtotal</span>
            <span className="text-white">₾{data.subtotal.toFixed(2)}</span>
          </div>
          {data.discountAmount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">ფასდაკლება</span>
              <span className="text-white">-₾{data.discountAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">დღგ ({data.taxRate}%)</span>
            <span className="text-white">₾{data.taxAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-base font-semibold text-white pt-2 border-t border-white/10">
            <span>სულ ჯამი</span>
            <span>₾{data.totalAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm text-emerald-400">
            <span>გადახდილი</span>
            <span>₾{data.paidAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm pt-1">
            <span className="text-slate-400">დარჩენილი</span>
            <span className={remaining > 0 ? 'text-red-400 font-medium' : 'text-white'}>₾{remaining.toFixed(2)}</span>
          </div>
        </div>
        {data.notes && (
          <div className="rounded-xl border border-white/10 bg-[#1E293B]/50 p-4">
            <p className={labelClass}>შენიშვნა</p>
            <p className="text-white text-sm">{data.notes}</p>
          </div>
        )}
      </div>

      {data.payments.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-[#1E293B]/50 p-4">
          <h2 className="text-sm font-medium text-slate-400 mb-2">გადახდები</h2>
          <ul className="space-y-1 text-sm text-white">
            {data.payments.map((p, i) => (
              <li key={i}>₾{p.amount.toFixed(2)} — {p.paymentMethod} — {p.paidAt.slice(0, 10)}{p.notes ? ` — ${p.notes}` : ''}</li>
            ))}
          </ul>
        </div>
      )}

      {paymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-xl border border-white/10 bg-[#1E293B] p-6">
            <h3 className="text-lg font-medium text-white mb-4">გადახდის რეგისტრაცია</h3>
            <form onSubmit={handlePayment} className="space-y-3">
              <div>
                <label className="block text-sm text-slate-400 mb-1">თანხა</label>
                <input
                  type="number"
                  step="0.01"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">მეთოდი</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
                >
                  <option value="card">ბარათი</option>
                  <option value="cash">ნაღდი</option>
                  <option value="transfer">გადარიცხვა</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">შენიშვნა</label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setPaymentModal(false)} className="flex-1 rounded-xl border border-white/20 py-2 text-slate-300">გაუქმება</button>
                <button type="submit" className="flex-1 rounded-xl bg-orange-500 py-2 font-medium text-white">დადასტურება</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
