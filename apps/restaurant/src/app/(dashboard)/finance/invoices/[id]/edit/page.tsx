'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { MenuItemPicker } from '@/components/finance/MenuItemPicker';

type ItemRow = { description: string; quantity: string; unitPrice: string };

const labelClass = 'block text-sm font-medium text-slate-400 mb-1';
const inputClass = 'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-orange-500/50 focus:outline-none disabled:opacity-50';

export default function EditInvoicePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [customerName, setCustomerName] = useState('');
  const [customerTaxId, setCustomerTaxId] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [taxRate, setTaxRate] = useState('18');
  const [discountAmount, setDiscountAmount] = useState('0');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<ItemRow[]>([{ description: '', quantity: '1', unitPrice: '' }]);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [menuPickerOpen, setMenuPickerOpen] = useState(false);
  const [notEditable, setNotEditable] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/finance/invoices/${id}`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((inv) => {
        if (!inv) {
          setFetchLoading(false);
          return;
        }
        if (inv.status !== 'DRAFT') {
          setNotEditable(true);
          setFetchLoading(false);
          return;
        }
        setCustomerName(inv.customerName ?? '');
        setCustomerTaxId(inv.customerTaxId ?? '');
        setCustomerAddress(inv.customerAddress ?? '');
        setCustomerPhone(inv.customerPhone ?? '');
        setCustomerEmail(inv.customerEmail ?? '');
        setIssueDate(inv.issueDate ?? '');
        setDueDate(inv.dueDate ?? '');
        setTaxRate(String(inv.taxRate ?? 18));
        setDiscountAmount(String(inv.discountAmount ?? 0));
        setNotes(inv.notes ?? '');
        setItems(
          inv.items?.length > 0
            ? inv.items.map((i: { description: string; quantity: number; unitPrice: number }) => ({
                description: i.description,
                quantity: String(i.quantity),
                unitPrice: String(i.unitPrice),
              }))
            : [{ description: '', quantity: '1', unitPrice: '' }]
        );
      })
      .finally(() => setFetchLoading(false));
  }, [id]);

  const addRow = () => {
    setItems((prev) => [...prev, { description: '', quantity: '1', unitPrice: '' }]);
  };

  const updateRow = (index: number, field: keyof ItemRow, value: string) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const removeRow = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const addItemsFromMenu = (picks: { description: string; quantity: number; unitPrice: number }[]) => {
    const newRows: ItemRow[] = picks.map((p) => ({
      description: p.description,
      quantity: String(p.quantity),
      unitPrice: String(p.unitPrice),
    }));
    setItems((prev) => [...prev, ...newRows]);
  };

  const validItems = useMemo(
    () =>
      items
        .map((i) => ({
          description: i.description.trim(),
          quantity: parseFloat(i.quantity) || 0,
          unitPrice: parseFloat(i.unitPrice) || 0,
        }))
        .filter((i) => i.description && i.quantity > 0),
    [items]
  );

  const subtotal = useMemo(
    () => validItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0),
    [validItems]
  );
  const discount = parseFloat(discountAmount) || 0;
  const taxRateVal = parseFloat(taxRate) || 0;
  const taxAmount = (subtotal - discount) * (taxRateVal / 100);
  const totalAmount = Math.max(0, subtotal - discount + taxAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      toast.error('კომპანიის დასახელება სავალდებულოა');
      return;
    }
    if (!customerTaxId.trim()) {
      toast.error('საიდენტიფიკაციო კოდი სავალდებულოა');
      return;
    }
    if (validItems.length === 0) {
      toast.error('დაამატეთ მინიმუმ ერთი პოზიცია');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/finance/invoices/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          customerName: customerName.trim(),
          customerTaxId: customerTaxId.trim(),
          customerAddress: customerAddress.trim() || undefined,
          customerPhone: customerPhone.trim() || undefined,
          customerEmail: customerEmail.trim() || undefined,
          issueDate: issueDate || undefined,
          dueDate: dueDate || undefined,
          taxRate: taxRateVal,
          discountAmount: discount,
          notes: notes.trim() || undefined,
          items: validItems,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'შეცდომა');
      }
      toast.success('ინვოისი განახლდა');
      router.push(`/finance/invoices/${id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'შეცდომა');
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <div className="p-6">
        <p className="text-slate-400">იტვირთება...</p>
      </div>
    );
  }

  if (notEditable) {
    return (
      <div className="p-6 space-y-4">
        <p className="text-slate-400">მხოლოდ შავი (DRAFT) ინვოისის რედაქტირება შესაძლებელია.</p>
        <Link href={`/finance/invoices/${id}`} className="text-orange-400 hover:underline">
          ← ინვოისის ნახვა
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">ინვოისის რედაქტირება</h1>
        <Link href={`/finance/invoices/${id}`} className="text-slate-400 hover:text-white">← ინვოისი</Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 rounded-2xl border border-white/10 bg-[#1E293B]/50 p-6">
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">მიმღები კომპანია</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelClass}>კომპანიის დასახელება *</label>
              <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className={inputClass} required />
            </div>
            <div>
              <label className={labelClass}>საიდენტიფიკაციო კოდი *</label>
              <input type="text" value={customerTaxId} onChange={(e) => setCustomerTaxId(e.target.value)} className={inputClass} required />
            </div>
            <div>
              <label className={labelClass}>მისამართი</label>
              <input type="text" value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>ტელეფონი</label>
              <input type="text" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>ელ-ფოსტა</label>
              <input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} className={inputClass} />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-white mb-4">ინვოისის პარამეტრები</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className={labelClass}>ინვოისის თარიღი</label>
              <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>ვადა</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>დღგ %</label>
              <input type="number" step="0.01" min="0" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>ფასდაკლება (₾)</label>
              <input type="number" step="0.01" min="0" value={discountAmount} onChange={(e) => setDiscountAmount(e.target.value)} className={inputClass} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>შენიშვნა</label>
              <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} />
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-white">პოზიციები</h3>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setMenuPickerOpen(true)} className="text-sm text-orange-400 hover:underline">
                მენიუდან დამატება
              </button>
              <span className="text-slate-500">|</span>
              <button type="button" onClick={addRow} className="text-sm text-orange-400 hover:underline">+ რიგის დამატება</button>
            </div>
          </div>
          <MenuItemPicker open={menuPickerOpen} onClose={() => setMenuPickerOpen(false)} onAdd={addItemsFromMenu} />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-slate-400">
                  <th className="p-2">სერვისის დასახელება *</th>
                  <th className="p-2 w-24">რაოდენობა</th>
                  <th className="p-2 w-32">ერთეულის ფასი</th>
                  <th className="p-2 w-32 text-right">ჯამი</th>
                  <th className="w-12 p-2" />
                </tr>
              </thead>
              <tbody>
                {items.map((row, i) => {
                  const qty = parseFloat(row.quantity) || 0;
                  const up = parseFloat(row.unitPrice) || 0;
                  const lineTotal = qty * up;
                  return (
                    <tr key={i} className="border-b border-white/5">
                      <td className="p-2">
                        <input type="text" value={row.description} onChange={(e) => updateRow(i, 'description', e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-white" />
                      </td>
                      <td className="p-2">
                        <input type="number" step="0.01" min="0" value={row.quantity} onChange={(e) => updateRow(i, 'quantity', e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-white" />
                      </td>
                      <td className="p-2">
                        <input type="number" step="0.01" min="0" value={row.unitPrice} onChange={(e) => updateRow(i, 'unitPrice', e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-white" />
                      </td>
                      <td className="p-2 text-right text-white">{lineTotal.toFixed(2)} ₾</td>
                      <td className="p-2">
                        <button type="button" onClick={() => removeRow(i)} className="rounded p-1.5 text-slate-400 hover:bg-red-500/20 hover:text-red-400">წაშლა</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2 max-w-sm ml-auto">
          <div className="flex justify-between text-slate-400"><span>Subtotal</span><span className="text-white">{subtotal.toFixed(2)} ₾</span></div>
          {discount > 0 && <div className="flex justify-between text-slate-400"><span>ფასდაკლება</span><span className="text-white">-{discount.toFixed(2)} ₾</span></div>}
          <div className="flex justify-between text-slate-400"><span>დღგ ({taxRateVal}%)</span><span className="text-white">{taxAmount.toFixed(2)} ₾</span></div>
          <div className="flex justify-between text-lg font-semibold text-white pt-2 border-t border-white/10"><span>სულ ჯამი</span><span>{totalAmount.toFixed(2)} ₾</span></div>
        </div>

        <div className="flex gap-2 pt-4">
          <Link href={`/finance/invoices/${id}`} className="flex-1 rounded-xl border border-white/20 py-2.5 text-center text-slate-300">გაუქმება</Link>
          <button type="submit" disabled={loading} className="flex-1 rounded-xl bg-orange-500 py-2.5 font-semibold text-white hover:bg-orange-600 disabled:opacity-50">
            {loading ? 'შენახვა...' : 'შენახვა'}
          </button>
        </div>
      </form>
    </div>
  );
}
