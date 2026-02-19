'use client';

import { useState, useEffect, useMemo } from 'react';
import { X, Search } from 'lucide-react';

export type MenuItemPick = { description: string; quantity: number; unitPrice: number };

type MenuCategory = {
  id: string;
  name: string;
  nameEn?: string | null;
  items: Array<{
    id: string;
    name: string;
    nameEn?: string | null;
    price: number;
  }>;
};

type MenuItemPickerProps = {
  open: boolean;
  onClose: () => void;
  onAdd: (items: MenuItemPick[]) => void;
};

type SelectedRow = { id: string; name: string; quantity: number; unitPrice: number };

export function MenuItemPicker({ open, onClose, onAdd }: MenuItemPickerProps) {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Map<string, SelectedRow>>(new Map());

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setSelected(new Map());
    setSearch('');
    fetch('/api/pos/menu', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: MenuCategory[]) => {
        setCategories(data);
        setActiveCategoryId(data.length > 0 ? data[0].id : null);
      })
      .finally(() => setLoading(false));
  }, [open]);

  const flatItems = useMemo(() => {
    const list: Array<{ id: string; name: string; price: number; categoryId: string }> = [];
    categories.forEach((cat) => {
      cat.items.forEach((item) => {
        list.push({
          id: item.id,
          name: item.name || item.nameEn || '',
          price: item.price,
          categoryId: cat.id,
        });
      });
    });
    return list;
  }, [categories]);

  const filteredItems = useMemo(() => {
    if (!search.trim()) return flatItems;
    const q = search.trim().toLowerCase();
    return flatItems.filter((i) => i.name.toLowerCase().includes(q));
  }, [flatItems, search]);

  const categoryFiltered = useMemo(() => {
    if (!activeCategoryId) return filteredItems;
    return filteredItems.filter((i) => i.categoryId === activeCategoryId);
  }, [filteredItems, activeCategoryId]);

  const toggleItem = (item: { id: string; name: string; price: number }, qty: number, price: number) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (qty <= 0) {
        next.delete(item.id);
        return next;
      }
      next.set(item.id, { id: item.id, name: item.name, quantity: qty, unitPrice: price });
      return next;
    });
  };

  const updateSelected = (id: string, field: 'quantity' | 'unitPrice', value: number) => {
    setSelected((prev) => {
      const row = prev.get(id);
      if (!row) return prev;
      const next = new Map(prev);
      next.set(id, { ...row, [field]: value });
      return next;
    });
  };

  const handleAdd = () => {
    const items: MenuItemPick[] = Array.from(selected.values())
      .filter((r) => r.quantity > 0)
      .map((r) => ({ description: r.name, quantity: r.quantity, unitPrice: r.unitPrice }));
    if (items.length === 0) return;
    onAdd(items);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl border border-white/10 bg-[#1E293B] shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="text-lg font-semibold text-white">მენიუდან დამატება</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 border-b border-white/10 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ძებნა..."
              className="w-full rounded-lg border border-white/10 bg-white/5 pl-9 pr-3 py-2 text-sm text-white placeholder:text-slate-500"
            />
          </div>
          {categories.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategoryId(cat.id)}
                  className={`rounded-lg px-3 py-1.5 text-sm ${
                    activeCategoryId === cat.id
                      ? 'bg-orange-500 text-white'
                      : 'bg-white/10 text-slate-300 hover:bg-white/15'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <p className="text-slate-400 text-center py-8">იტვირთება...</p>
          ) : categoryFiltered.length === 0 ? (
            <p className="text-slate-500 text-center py-8">პოზიციები არ მოიძებნა</p>
          ) : (
            <ul className="space-y-2">
              {categoryFiltered.map((item) => {
                const row = selected.get(item.id);
                const qty = row?.quantity ?? 0;
                const price = row?.unitPrice ?? item.price;
                const isChecked = qty > 0;
                return (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-center gap-3 rounded-lg border border-white/10 bg-[#0F172A]/50 p-3"
                  >
                    <label className="flex items-center gap-2 cursor-pointer min-w-[140px] flex-1">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            toggleItem(item, 1, item.price);
                          } else {
                            toggleItem(item, 0, item.price);
                          }
                        }}
                        className="rounded border-white/20 bg-white/5 text-orange-500 focus:ring-orange-500"
                      />
                      <span className="text-white font-medium">{item.name}</span>
                      <span className="text-slate-400 text-sm">₾{item.price.toFixed(2)}</span>
                    </label>
                    {isChecked && (
                      <>
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400 text-sm">რაოდ.</span>
                          <input
                            type="number"
                            min={1}
                            value={qty}
                            onChange={(e) => {
                              const v = Math.max(0, parseInt(e.target.value, 10) || 0);
                              toggleItem(item, v, price);
                            }}
                            className="w-16 rounded border border-white/10 bg-white/5 px-2 py-1 text-sm text-white"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400 text-sm">ფასი</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={price}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value) || 0;
                              updateSelected(item.id, 'unitPrice', v);
                            }}
                            className="w-20 rounded border border-white/10 bg-white/5 px-2 py-1 text-sm text-white"
                          />
                        </div>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/20 px-4 py-2 text-sm text-slate-300 hover:bg-white/10"
          >
            გაუქმება
          </button>
          <button
            type="button"
            onClick={handleAdd}
            disabled={selected.size === 0 || Array.from(selected.values()).every((r) => r.quantity <= 0)}
            className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            დამატება ({Array.from(selected.values()).filter((r) => r.quantity > 0).length})
          </button>
        </div>
      </div>
    </div>
  );
}
