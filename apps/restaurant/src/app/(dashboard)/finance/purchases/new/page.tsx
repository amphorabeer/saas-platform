'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';

type ItemRow = { description: string; ingredientId: string; quantity: string; unit: string; unitPrice: string };
type Supplier = { id: string; name: string; taxId: string | null };
type Ingredient = { id: string; name: string; unit: string | null };

const labelClass = 'block text-sm font-medium text-slate-400 mb-1';
const inputClass = 'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-orange-500/50 focus:outline-none';
const UNIT_OPTIONS = ['kg', 'l', 'ც', 'ფაკეტი', 'კგ', 'ლ'];

export default function NewPurchasePage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [supplierNameManual, setSupplierNameManual] = useState('');
  const [supplierTaxId, setSupplierTaxId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<ItemRow[]>([
    { description: '', ingredientId: '', quantity: '1', unit: 'kg', unitPrice: '' },
  ]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/suppliers', { credentials: 'include' }).then((r) => (r.ok ? r.json() : [])),
      fetch('/api/inventory/ingredients', { credentials: 'include' }).then((r) => (r.ok ? r.json() : [])),
    ]).then(([sup, ing]) => {
      setSuppliers(sup);
      setIngredients(ing);
    });
  }, []);

  const addRow = () => {
    setItems((prev) => [...prev, { description: '', ingredientId: '', quantity: '1', unit: 'kg', unitPrice: '' }]);
  };

  const updateRow = (index: number, field: keyof ItemRow, value: string) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      if (field === 'ingredientId' && value) {
        const ing = ingredients.find((i) => i.id === value);
        if (ing) next[index].description = ing.name;
        if (ing?.unit) next[index].unit = ing.unit;
      }
      return next;
    });
  };

  const removeRow = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const resolvedSupplierName = supplierId === '__manual__' ? supplierNameManual.trim() : suppliers.find((s) => s.id === supplierId)?.name ?? '';

  const validItems = useMemo(
    () =>
      items
        .map((i) => ({
          description: i.description.trim(),
          ingredientId: i.ingredientId || undefined,
          quantity: parseFloat(i.quantity) || 0,
          unit: i.unit || undefined,
          unitPrice: parseFloat(i.unitPrice) || 0,
        }))
        .filter((i) => i.description && i.quantity > 0),
    [items]
  );

  const subtotal = useMemo(() => validItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0), [validItems]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvedSupplierName) {
      toast.error('მომწოდებელი სავალდებულოა');
      return;
    }
    if (validItems.length === 0) {
      toast.error('დაამატეთ მინიმუმ ერთი პოზიცია');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/finance/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          invoiceNumber: invoiceNumber.trim() || undefined,
          supplierId: supplierId && supplierId !== '__manual__' ? supplierId : undefined,
          supplierName: resolvedSupplierName,
          supplierTaxId: supplierTaxId.trim() || undefined,
          issueDate: issueDate || undefined,
          dueDate: dueDate || undefined,
          notes: notes.trim() || undefined,
          items: validItems,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'შეცდომა');
      }
      const data = await res.json();
      toast.success('შესყიდვა დაემატა');
      router.push(`/finance/purchases/${data.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'შეცდომა');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">ახალი შესყიდვა</h1>
        <Link href="/finance/purchases" className="text-slate-400 hover:text-white">← შესყიდვები</Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 rounded-2xl border border-white/10 bg-[#1E293B]/50 p-6">
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">მომწოდებელი</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelClass}>მომწოდებელი</label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className={inputClass}
              >
                <option value="">აირჩიეთ ან ჩაწერეთ ქვემოთ</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
                <option value="__manual__">სხვა (ჩაწერა)</option>
              </select>
            </div>
            {supplierId === '__manual__' && (
              <div className="sm:col-span-2">
                <label className={labelClass}>მომწოდებლის დასახელება</label>
                <input
                  type="text"
                  value={supplierNameManual}
                  onChange={(e) => setSupplierNameManual(e.target.value)}
                  className={inputClass}
                  placeholder="შპს მომწოდებელი"
                />
              </div>
            )}
            <div>
              <label className={labelClass}>საიდენტიფიკაციო კოდი</label>
              <input
                type="text"
                value={supplierTaxId}
                onChange={(e) => setSupplierTaxId(e.target.value)}
                className={inputClass}
                placeholder="123456789"
              />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-white mb-4">ინვოისის მონაცემები</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className={labelClass}>ინვოისის ნომერი</label>
              <input type="text" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} className={inputClass} placeholder="PUR-001" />
            </div>
            <div>
              <label className={labelClass}>თარიღი</label>
              <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>ვადა</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputClass} />
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
            <button type="button" onClick={addRow} className="text-sm text-orange-400 hover:underline">+ რიგის დამატება</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-slate-400">
                  <th className="p-2">აღწერა / ინგრედიენტი</th>
                  <th className="p-2 w-20">რაოდენობა</th>
                  <th className="p-2 w-20">ერთეული</th>
                  <th className="p-2 w-28">ფასი</th>
                  <th className="p-2 w-28 text-right">ჯამი</th>
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
                        <select
                          value={row.ingredientId}
                          onChange={(e) => updateRow(i, 'ingredientId', e.target.value)}
                          className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-white text-sm"
                        >
                          <option value="">— ხელით —</option>
                          {ingredients.map((ing) => (
                            <option key={ing.id} value={ing.id}>{ing.name}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={row.description}
                          onChange={(e) => updateRow(i, 'description', e.target.value)}
                          className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-white text-sm"
                          placeholder="აღწერა"
                        />
                      </td>
                      <td className="p-2">
                        <input type="number" step="0.01" min="0" value={row.quantity} onChange={(e) => updateRow(i, 'quantity', e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-white" />
                      </td>
                      <td className="p-2">
                        <select value={row.unit} onChange={(e) => updateRow(i, 'unit', e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-white text-sm">
                          {UNIT_OPTIONS.map((u) => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
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
          <div className="flex justify-between text-lg font-semibold text-white pt-2 border-t border-white/10"><span>სულ ჯამი</span><span>{subtotal.toFixed(2)} ₾</span></div>
        </div>

        <div className="flex gap-2 pt-4">
          <Link href="/finance/purchases" className="flex-1 rounded-xl border border-white/20 py-2.5 text-center text-slate-300">გაუქმება</Link>
          <button type="submit" disabled={loading} className="flex-1 rounded-xl bg-orange-500 py-2.5 font-semibold text-white hover:bg-orange-600 disabled:opacity-50">{loading ? 'იქმნება...' : 'შექმნა'}</button>
        </div>
      </form>
    </div>
  );
}
