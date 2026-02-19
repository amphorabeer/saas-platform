'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Plus, Pencil, Trash2, Settings, ExternalLink } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { toast } from 'sonner';

type ExpenseCategory = { id: string; name: string; icon: string | null; color: string | null; isDefault: boolean };
type ExpenseItem = {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string | null;
  categoryColor: string | null;
  description: string;
  amount: number;
  date: string;
  paymentMethod: string | null;
  notes: string | null;
  createdAt: string;
};
type PurchaseItem = {
  id: string;
  invoiceNumber: string;
  supplierName: string;
  issueDate: string;
  totalAmount: number;
  paidAmount: number;
  status: string;
};

type UnifiedRow = {
  id: string;
  _type: 'expense' | 'purchase';
  date: string;
  typeLabel: string;
  categoryOrSupplier: string;
  description: string;
  amount: number;
  paymentMethod?: string | null;
};

type IngredientOption = { id: string; name: string; unit: string | null; currentStock: number };

const UNIT_OPTIONS = ['kg', 'l', 'ც', 'ფაკეტი', 'კგ', 'ლ'];

export default function ExpensesPage() {
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [typeFilter, setTypeFilter] = useState<'all' | 'expense' | 'purchase'>('all');
  const [categoryId, setCategoryId] = useState('');
  const [unified, setUnified] = useState<UnifiedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [ingredients, setIngredients] = useState<IngredientOption[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'expense' | 'purchase'>('expense');
  const [categoriesModalOpen, setCategoriesModalOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);

  const [expenseForm, setExpenseForm] = useState({
    categoryId: '',
    description: '',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    paymentMethod: '',
    notes: '',
  });

  type PurchaseItemRow = { ingredientId: string; description: string; quantity: string; unit: string; unitPrice: string };
  const [purchaseForm, setPurchaseForm] = useState({
    supplierName: '',
    issueDate: new Date().toISOString().slice(0, 10),
    notes: '',
    items: [{ ingredientId: '', description: '', quantity: '1', unit: 'kg', unitPrice: '' }] as PurchaseItemRow[],
  });

  const fetchCategories = useCallback(async () => {
    const res = await fetch('/api/finance/expenses/categories', { credentials: 'include' });
    if (!res.ok) return;
    const data = await res.json();
    setCategories(data);
  }, []);

  const fetchIngredients = useCallback(async () => {
    const res = await fetch('/api/ingredients', { credentials: 'include' });
    if (!res.ok) return;
    const data = await res.json();
    setIngredients(data);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const expParams = new URLSearchParams();
    expParams.set('dateFrom', dateFrom);
    expParams.set('dateTo', dateTo);
    expParams.set('limit', '100');
    if (categoryId) expParams.set('categoryId', categoryId);

    const purParams = new URLSearchParams();
    purParams.set('dateFrom', dateFrom);
    purParams.set('dateTo', dateTo);
    purParams.set('limit', '100');

    const [expRes, purRes] = await Promise.all([
      fetch(`/api/finance/expenses?${expParams}`, { credentials: 'include' }),
      fetch(`/api/finance/purchases?${purParams}`, { credentials: 'include' }),
    ]);

    const expData = expRes.ok ? await expRes.json() : { items: [] };
    const purData = purRes.ok ? await purRes.json() : { items: [] };

    const expenseItems = (expData.items || []).map((e: ExpenseItem) => ({
      id: e.id,
      _type: 'expense' as const,
      date: e.date,
      typeLabel: 'ხარჯი',
      categoryOrSupplier: e.categoryName,
      description: e.description,
      amount: e.amount,
      paymentMethod: e.paymentMethod,
    }));

    const purchaseItems = (purData.items || []).map((p: PurchaseItem) => ({
      id: p.id,
      _type: 'purchase' as const,
      date: p.issueDate,
      typeLabel: 'შესყიდვა',
      categoryOrSupplier: p.supplierName,
      description: `${p.supplierName} · ${p.invoiceNumber}`,
      amount: p.totalAmount,
    }));

    const merged = [...expenseItems, ...purchaseItems].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    setUnified(merged);
    setLoading(false);
  }, [dateFrom, dateTo, categoryId]);

  useEffect(() => {
    fetchCategories();
    fetchIngredients();
  }, [fetchCategories, fetchIngredients]);
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = typeFilter === 'all' ? unified : unified.filter((r) => r._type === typeFilter);
  const totalAll = filtered.reduce((s, r) => s + r.amount, 0);
  const totalExpenses = filtered.filter((r) => r._type === 'expense').reduce((s, r) => s + r.amount, 0);
  const totalPurchases = filtered.filter((r) => r._type === 'purchase').reduce((s, r) => s + r.amount, 0);

  const openCreate = () => {
    setEditingExpenseId(null);
    setModalMode('expense');
    setExpenseForm({
      categoryId: categories[0]?.id ?? '',
      description: '',
      amount: '',
      date: new Date().toISOString().slice(0, 10),
      paymentMethod: '',
      notes: '',
    });
    setPurchaseForm({
      supplierName: '',
      issueDate: new Date().toISOString().slice(0, 10),
      notes: '',
      items: [{ ingredientId: '', description: '', quantity: '1', unit: 'kg', unitPrice: '' }],
    });
    setModalOpen(true);
  };

  const openEditExpense = (row: UnifiedRow) => {
    if (row._type !== 'expense') return;
    setEditingExpenseId(row.id);
    setModalMode('expense');
    setModalOpen(true);
    fetch(`/api/finance/expenses/${row.id}`, { credentials: 'include' })
      .then((r) => r.ok ? r.json() : null)
      .then((e: ExpenseItem | null) => {
        if (e) {
          setExpenseForm({
            categoryId: e.categoryId,
            description: e.description,
            amount: String(e.amount),
            date: e.date,
            paymentMethod: e.paymentMethod ?? '',
            notes: e.notes ?? '',
          });
        }
      });
  };

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.categoryId || !expenseForm.description.trim() || !expenseForm.amount) {
      toast.error('შეავსეთ კატეგორია, აღწერა და თანხა');
      return;
    }
    const payload = {
      categoryId: expenseForm.categoryId,
      description: expenseForm.description.trim(),
      amount: parseFloat(expenseForm.amount) || 0,
      date: expenseForm.date,
      paymentMethod: expenseForm.paymentMethod || undefined,
      notes: expenseForm.notes || undefined,
    };
    if (editingExpenseId) {
      const res = await fetch(`/api/finance/expenses/${editingExpenseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || 'შეცდომა');
        return;
      }
      toast.success('ხარჯი განახლდა');
    } else {
      const res = await fetch('/api/finance/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || 'შეცდომა');
        return;
      }
      toast.success('ხარჯი დაემატა');
    }
    setModalOpen(false);
    fetchData();
  };

  const handlePurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseForm.supplierName.trim()) {
      toast.error('მომწოდებლის სახელი სავალდებულოა');
      return;
    }
    const validItems = purchaseForm.items
      .map((i) => ({
        ingredientId: i.ingredientId || undefined,
        description: i.description.trim() || 'Item',
        quantity: parseFloat(i.quantity) || 0,
        unit: i.unit || undefined,
        unitPrice: parseFloat(i.unitPrice) || 0,
      }))
      .filter((i) => i.description && i.quantity > 0);
    if (validItems.length === 0) {
      toast.error('დაამატეთ მინიმუმ ერთი პოზიცია');
      return;
    }
    const res = await fetch('/api/finance/purchases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        supplierName: purchaseForm.supplierName.trim(),
        issueDate: purchaseForm.issueDate || undefined,
        notes: purchaseForm.notes.trim() || undefined,
        items: validItems,
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      toast.error(err.error || 'შეცდომა');
      return;
    }
    toast.success('შესყიდვა დაემატა');
    setModalOpen(false);
    fetchData();
  };

  const handleDelete = async (row: UnifiedRow) => {
    const msg = row._type === 'expense' ? 'წავშალოთ ხარჯი?' : 'წავშალოთ შესყიდვა? (სტოკი შემცირდება)';
    if (!confirm(msg)) return;
    const url = row._type === 'expense' ? `/api/finance/expenses/${row.id}` : `/api/finance/purchases/${row.id}`;
    const res = await fetch(url, { method: 'DELETE', credentials: 'include' });
    if (!res.ok) {
      toast.error('ვერ წაიშალა');
      return;
    }
    toast.success('წაიშალა');
    fetchData();
  };

  const addPurchaseRow = () => {
    setPurchaseForm((f) => ({
      ...f,
      items: [...f.items, { ingredientId: '', description: '', quantity: '1', unit: 'kg', unitPrice: '' }],
    }));
  };

  const updatePurchaseRow = (index: number, field: keyof PurchaseItemRow, value: string) => {
    setPurchaseForm((f) => {
      const next = [...f.items];
      next[index] = { ...next[index], [field]: value };
      if (field === 'ingredientId' && value) {
        const ing = ingredients.find((i) => i.id === value);
        if (ing) {
          next[index].description = ing.name;
          if (ing.unit) next[index].unit = ing.unit;
        }
      }
      return { ...f, items: next };
    });
  };

  const removePurchaseRow = (index: number) => {
    if (purchaseForm.items.length <= 1) return;
    setPurchaseForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== index) }));
  };

  const purchaseSubtotal = purchaseForm.items.reduce((s, i) => {
    const q = parseFloat(i.quantity) || 0;
    const u = parseFloat(i.unitPrice) || 0;
    return s + q * u;
  }, 0);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-white">ხარჯები და შესყიდვები</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCategoriesModalOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 hover:bg-white/10"
          >
            <Settings className="h-4 w-4" />
            კატეგორიები
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
          >
            <Plus className="h-4 w-4" />
            ახალი
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-[#1E293B]/50 p-4">
          <p className="text-sm text-slate-400">სულ ხარჯები</p>
          <p className="text-2xl font-bold text-white">₾{totalAll.toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#1E293B]/50 p-4">
          <p className="text-sm text-slate-400">ჩვეულებრივი ხარჯები</p>
          <p className="text-2xl font-bold text-slate-200">₾{totalExpenses.toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#1E293B]/50 p-4">
          <p className="text-sm text-slate-400">შესყიდვები</p>
          <p className="text-2xl font-bold text-emerald-400">₾{totalPurchases.toFixed(2)}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-[#1E293B]/50 p-4">
        <div>
          <label className="block text-xs text-slate-400">დან</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white" />
        </div>
        <div>
          <label className="block text-xs text-slate-400">მდე</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white" />
        </div>
        <div>
          <label className="block text-xs text-slate-400">ტიპი</label>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white">
            <option value="all">ყველა</option>
            <option value="expense">ხარჯი</option>
            <option value="purchase">შესყიდვა</option>
          </select>
        </div>
        {typeFilter !== 'purchase' && (
          <div>
            <label className="block text-xs text-slate-400">კატეგორია</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white">
              <option value="">ყველა</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-white/10 bg-[#1E293B]/50">
        {loading ? (
          <div className="p-8 text-center text-slate-400">იტვირთება...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-500">ჩანაწერები არ მოიძებნა</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 text-left text-sm text-slate-400">
                  <th className="p-3">თარიღი</th>
                  <th className="p-3 w-24">ტიპი</th>
                  <th className="p-3">კატეგორია / მომწოდებელი</th>
                  <th className="p-3">აღწერა</th>
                  <th className="p-3 text-right">თანხა</th>
                  <th className="w-28 p-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={`${row._type}-${row.id}`} className="border-b border-white/5 text-sm text-white hover:bg-white/5">
                    <td className="p-3">{row.date}</td>
                    <td className="p-3">
                      <span className={`rounded-lg px-2 py-0.5 text-xs ${row._type === 'expense' ? 'bg-slate-500/30 text-slate-300' : 'bg-emerald-500/30 text-emerald-300'}`}>
                        {row.typeLabel}
                      </span>
                    </td>
                    <td className="p-3">{row.categoryOrSupplier}</td>
                    <td className="p-3">{row.description}</td>
                    <td className="p-3 text-right font-medium">₾{row.amount.toFixed(2)}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        {row._type === 'purchase' && (
                          <Link href={`/finance/purchases/${row.id}`} className="rounded p-1.5 text-slate-400 hover:bg-white/10 hover:text-white" aria-label="ნახვა">
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        )}
                        {row._type === 'expense' && (
                          <button type="button" onClick={() => openEditExpense(row)} className="rounded p-1.5 text-slate-400 hover:bg-white/10 hover:text-white" aria-label="რედაქტირება">
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                        <button type="button" onClick={() => handleDelete(row)} className="rounded p-1.5 text-slate-400 hover:bg-red-500/20 hover:text-red-400" aria-label="წაშლა">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingExpenseId ? 'ხარჯის რედაქტირება' : 'ახალი ჩანაწერი'} maxWidth="md">
        <div className="space-y-4">
          {!editingExpenseId && (
            <div className="flex gap-2 rounded-lg bg-white/5 p-1">
              <button
                type="button"
                onClick={() => setModalMode('expense')}
                className={`flex-1 rounded-md py-2 text-sm font-medium ${modalMode === 'expense' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                ჩვეულებრივი ხარჯი
              </button>
              <button
                type="button"
                onClick={() => setModalMode('purchase')}
                className={`flex-1 rounded-md py-2 text-sm font-medium ${modalMode === 'purchase' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                შესყიდვა (ინგრედიენტი)
              </button>
            </div>
          )}

          {modalMode === 'expense' && (
            <form onSubmit={handleExpenseSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">კატეგორია</label>
                <select value={expenseForm.categoryId} onChange={(e) => setExpenseForm((f) => ({ ...f, categoryId: e.target.value }))} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white" required>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">აღწერა</label>
                <input type="text" value={expenseForm.description} onChange={(e) => setExpenseForm((f) => ({ ...f, description: e.target.value }))} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white" placeholder="მაგ. ქირა" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">თანხა (₾)</label>
                  <input type="number" step="0.01" value={expenseForm.amount} onChange={(e) => setExpenseForm((f) => ({ ...f, amount: e.target.value }))} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white" required />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">თარიღი</label>
                  <input type="date" value={expenseForm.date} onChange={(e) => setExpenseForm((f) => ({ ...f, date: e.target.value }))} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">გადახდის მეთოდი</label>
                <input type="text" value={expenseForm.paymentMethod} onChange={(e) => setExpenseForm((f) => ({ ...f, paymentMethod: e.target.value }))} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white" placeholder="ნაღდი, ბარათი..." />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">შენიშვნა</label>
                <textarea value={expenseForm.notes} onChange={(e) => setExpenseForm((f) => ({ ...f, notes: e.target.value }))} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white" rows={2} />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 rounded-xl border border-white/20 py-2.5 text-slate-300">გაუქმება</button>
                <button type="submit" className="flex-1 rounded-xl bg-orange-500 py-2.5 font-semibold text-white hover:bg-orange-600">{editingExpenseId ? 'შენახვა' : 'დამატება'}</button>
              </div>
            </form>
          )}

          {modalMode === 'purchase' && (
            <form onSubmit={handlePurchaseSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">მომწოდებელი</label>
                <input type="text" value={purchaseForm.supplierName} onChange={(e) => setPurchaseForm((f) => ({ ...f, supplierName: e.target.value }))} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white" placeholder="მომწოდებლის სახელი" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">თარიღი</label>
                  <input type="date" value={purchaseForm.issueDate} onChange={(e) => setPurchaseForm((f) => ({ ...f, issueDate: e.target.value }))} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">შენიშვნა</label>
                  <input type="text" value={purchaseForm.notes} onChange={(e) => setPurchaseForm((f) => ({ ...f, notes: e.target.value }))} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white" />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm text-slate-400">ინგრედიენტების სია</label>
                  <button type="button" onClick={addPurchaseRow} className="text-sm text-orange-400 hover:underline">+ რიგის დამატება</button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {purchaseForm.items.map((item, i) => (
                    <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-white/5 p-2">
                      <select value={item.ingredientId} onChange={(e) => updatePurchaseRow(i, 'ingredientId', e.target.value)} className="flex-1 min-w-[120px] rounded border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white">
                        <option value="">— ხელით —</option>
                        {ingredients.map((ing) => (
                          <option key={ing.id} value={ing.id}>{ing.name} (სტოკი: {ing.currentStock})</option>
                        ))}
                      </select>
                      <input type="text" value={item.description} onChange={(e) => updatePurchaseRow(i, 'description', e.target.value)} placeholder="აღწერა" className="flex-1 min-w-[80px] rounded border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white" />
                      <input type="number" step="0.01" min="0" value={item.quantity} onChange={(e) => updatePurchaseRow(i, 'quantity', e.target.value)} className="w-16 rounded border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white" placeholder="რაოდ." />
                      <select value={item.unit} onChange={(e) => updatePurchaseRow(i, 'unit', e.target.value)} className="w-16 rounded border border-white/10 bg-white/5 px-1 py-1.5 text-sm text-white">
                        {UNIT_OPTIONS.map((u) => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                      <input type="number" step="0.01" min="0" value={item.unitPrice} onChange={(e) => updatePurchaseRow(i, 'unitPrice', e.target.value)} className="w-20 rounded border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white" placeholder="ფასი" />
                      <span className="w-14 text-right text-sm text-slate-300">₾{((parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0)).toFixed(2)}</span>
                      <button type="button" onClick={() => removePurchaseRow(i)} className="rounded p-1 text-slate-400 hover:bg-red-500/20 hover:text-red-400">წაშლა</button>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-slate-400 mt-2">ჯამი: <span className="font-semibold text-white">₾{purchaseSubtotal.toFixed(2)}</span></p>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 rounded-xl border border-white/20 py-2.5 text-slate-300">გაუქმება</button>
                <button type="submit" className="flex-1 rounded-xl bg-orange-500 py-2.5 font-semibold text-white hover:bg-orange-600">დამატება</button>
              </div>
            </form>
          )}
        </div>
      </Modal>

      <Modal open={categoriesModalOpen} onClose={() => setCategoriesModalOpen(false)} title="ხარჯების კატეგორიები" maxWidth="md">
        <div className="space-y-2">
          {categories.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3">
              <span className="text-sm font-medium text-white" style={{ color: c.color || undefined }}>{c.name}</span>
              {c.isDefault && <span className="text-xs text-slate-500">ნაგულისხმები</span>}
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
