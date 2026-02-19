'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Toggle } from '@/components/ui/Toggle';
import { Plus, Trash2 } from 'lucide-react';
import type { ComboSetRow } from './ComboSetCard';

type ComboItemEntry = {
  menuItemId: string;
  menuItemName?: string;
  quantity: number;
};

type ComboSetFormProps = {
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    nameEn?: string;
    description?: string;
    price: number;
    isActive: boolean;
    validFrom?: string | null;
    validTo?: string | null;
    items: ComboItemEntry[];
  }) => Promise<void>;
  edit?: ComboSetRow | null;
  menuItems: { id: string; name: string; nameEn: string | null }[];
};

export function ComboSetForm({
  open,
  onClose,
  onSave,
  edit,
  menuItems,
}: ComboSetFormProps) {
  const [name, setName] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [validFrom, setValidFrom] = useState('');
  const [validTo, setValidTo] = useState('');
  const [items, setItems] = useState<ComboItemEntry[]>([]);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (edit) {
      setName(edit.name);
      setNameEn(edit.nameEn || '');
      setDescription(edit.description || '');
      setPrice(String(edit.price));
      setIsActive(edit.isActive);
      setValidFrom(edit.validFrom ? edit.validFrom.slice(0, 10) : '');
      setValidTo(edit.validTo ? edit.validTo.slice(0, 10) : '');
      setItems(
        (edit.items || []).map((i) => ({
          menuItemId: i.menuItemId,
          menuItemName: i.menuItem?.name,
          quantity: i.quantity,
        }))
      );
    } else {
      setName('');
      setNameEn('');
      setDescription('');
      setPrice('');
      setIsActive(true);
      setValidFrom('');
      setValidTo('');
      setItems([]);
    }
  }, [edit, open]);

  const addItem = (menuItemId: string, qty = 1) => {
    const menuItem = menuItems.find((m) => m.id === menuItemId);
    setItems((prev) => {
      const existing = prev.find((i) => i.menuItemId === menuItemId);
      if (existing) {
        return prev.map((i) =>
          i.menuItemId === menuItemId ? { ...i, quantity: i.quantity + qty } : i
        );
      }
      return [...prev, { menuItemId, menuItemName: menuItem?.name, quantity: qty }];
    });
  };

  const updateItemQty = (menuItemId: string, quantity: number) => {
    setItems((prev) =>
      prev.map((i) => (i.menuItemId === menuItemId ? { ...i, quantity } : i))
    );
  };

  const removeItem = (menuItemId: string) => {
    setItems((prev) => prev.filter((i) => i.menuItemId !== menuItemId));
  };

  const filteredMenuItems = menuItems.filter(
    (m) =>
      !search ||
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      (m.nameEn && m.nameEn.toLowerCase().includes(search.toLowerCase()))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const priceNum = parseFloat(price);
    if (Number.isNaN(priceNum)) return;
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        nameEn: nameEn.trim() || undefined,
        description: description.trim() || undefined,
        price: priceNum,
        isActive,
        validFrom: validFrom || null,
        validTo: validTo || null,
        items: items.map((i) => ({ menuItemId: i.menuItemId, quantity: i.quantity })),
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={edit ? 'კომბოს რედაქტირება' : 'ახალი კომბო სეტი'} maxWidth="2xl">
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">სახელი *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white focus:border-orange-500/50 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">სახელი (ინგ)</label>
            <input
              type="text"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white focus:border-orange-500/50 focus:outline-none"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-300">აღწერა</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white focus:border-orange-500/50 focus:outline-none resize-none"
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">ფასი (₾) *</label>
            <input
              type="number"
              step="0.01"
              min={0}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white focus:border-orange-500/50 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">მოქმედებს დან</label>
            <input
              type="date"
              value={validFrom}
              onChange={(e) => setValidFrom(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white focus:border-orange-500/50 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">მოქმედებს მდე</label>
            <input
              type="date"
              value={validTo}
              onChange={(e) => setValidTo(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white focus:border-orange-500/50 focus:outline-none"
            />
          </div>
          <div className="flex items-end">
            <Toggle checked={isActive} onCheckedChange={setIsActive} label="აქტიური" />
          </div>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-300">კერძები კომბოში</label>
          <div className="mb-2 flex gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ძიება კერძის მიხედვით..."
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-slate-500 focus:border-orange-500/50 focus:outline-none"
            />
          </div>
          <div className="flex gap-4">
            <div className="flex-1 max-h-40 overflow-y-auto rounded-xl border border-white/10 bg-white/5 p-2">
              {filteredMenuItems.slice(0, 50).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => addItem(m.id)}
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm text-white hover:bg-white/10"
                >
                  {m.name} {m.nameEn && `(${m.nameEn})`}
                </button>
              ))}
              {filteredMenuItems.length === 0 && (
                <p className="px-3 py-2 text-sm text-slate-500">კერძები ვერ მოიძებნა</p>
              )}
            </div>
            <div className="flex-1 space-y-2">
              {items.map((i) => {
                const mi = menuItems.find((m) => m.id === i.menuItemId);
                return (
                  <div
                    key={i.menuItemId}
                    className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2"
                  >
                    <span className="text-sm text-white truncate flex-1">
                      {mi?.name ?? i.menuItemName ?? i.menuItemId}
                    </span>
                    <input
                      type="number"
                      min={1}
                      value={i.quantity}
                      onChange={(e) =>
                        updateItemQty(i.menuItemId, parseInt(e.target.value, 10) || 1)
                      }
                      className="w-14 rounded border border-white/10 bg-white/5 px-2 py-1 text-center text-sm text-white"
                    />
                    <button
                      type="button"
                      onClick={() => removeItem(i.menuItemId)}
                      className="rounded p-1 text-slate-400 hover:bg-red-500/20 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
              {items.length === 0 && (
                <p className="text-sm text-slate-500 py-2">დაამატეთ კერძები მარცხენა სიიდან</p>
              )}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/10">
            გაუქმება
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'შენახვა...' : 'შენახვა'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
