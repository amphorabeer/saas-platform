'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Toggle } from '@/components/ui/Toggle';

const UNITS = ['კგ', 'გ', 'ლ', 'მლ', 'ცალი', 'შეკვრა', 'ბოთლი'];

export type IngredientFormData = {
  name: string;
  nameEn: string;
  unit: string;
  currentStock: number;
  minimumStock: number;
  costPerUnit: number | null;
  supplierId: string | null;
  expiryDate: string | null;
  isActive: boolean;
};

const emptyForm: IngredientFormData = {
  name: '',
  nameEn: '',
  unit: 'ცალი',
  currentStock: 0,
  minimumStock: 0,
  costPerUnit: null,
  supplierId: null,
  expiryDate: null,
  isActive: true,
};

export function IngredientForm({
  open,
  onClose,
  initial,
  onSave,
  supplierOptions,
}: {
  open: boolean;
  onClose: () => void;
  initial?: Partial<IngredientFormData> & { id?: string };
  onSave: (data: IngredientFormData) => Promise<void>;
  supplierOptions: string[];
}) {
  const [form, setForm] = useState<IngredientFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setForm({
        name: initial?.name ?? '',
        nameEn: initial?.nameEn ?? '',
        unit: initial?.unit ?? 'ცალი',
        currentStock: initial?.currentStock ?? 0,
        minimumStock: initial?.minimumStock ?? 0,
        costPerUnit: initial?.costPerUnit ?? null,
        supplierId: initial?.supplierId ?? null,
        expiryDate: initial?.expiryDate ?? null,
        isActive: initial?.isActive ?? true,
      });
      setError('');
    }
  }, [open, initial]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) {
      setError('სახელი აუცილებელია');
      return;
    }
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'შეცდომა');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={initial?.id ? 'რედაქტირება' : 'ახალი ინგრედიენტი'} maxWidth="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div>
          <label className="mb-1 block text-sm text-slate-400">სახელი *</label>
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-400">სახელი (EN)</label>
          <input
            value={form.nameEn}
            onChange={(e) => setForm((f) => ({ ...f, nameEn: e.target.value }))}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-400">ერთეული</label>
          <div className="flex flex-wrap gap-2">
            {UNITS.map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setForm((f) => ({ ...f, unit: u }))}
                className={`rounded-lg px-3 py-1.5 text-sm ${
                  form.unit === u ? 'bg-orange-500/30 text-orange-300' : 'bg-white/5 text-slate-400 hover:bg-white/10'
                }`}
            >
              {u}
              </button>
            ))}
            <input
              type="text"
              value={!UNITS.includes(form.unit) ? form.unit : ''}
              onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value || 'ცალი' }))}
              placeholder="სხვა"
              className="w-24 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm text-slate-400">მიმდინარე მარაგი</label>
            <input
              type="number"
              min={0}
              step="any"
              value={form.currentStock}
              onChange={(e) => setForm((f) => ({ ...f, currentStock: Number(e.target.value) || 0 }))}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-400">მინიმალური მარაგი</label>
            <input
              type="number"
              min={0}
              step="any"
              value={form.minimumStock}
              onChange={(e) => setForm((f) => ({ ...f, minimumStock: Number(e.target.value) || 0 }))}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-400">ღირებულება/ერთეული (₾)</label>
          <input
            type="number"
            min={0}
            step="0.01"
            value={form.costPerUnit ?? ''}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                costPerUnit: e.target.value === '' ? null : Number(e.target.value),
              }))
            }
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-400">მომწოდებელი</label>
          <input
            type="text"
            list="supplier-list"
            value={form.supplierId ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, supplierId: e.target.value.trim() || null }))}
            placeholder="აირჩიე ან შეიყვანე"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-slate-500"
          />
          <datalist id="supplier-list">
            {supplierOptions.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-400">ვადა</label>
          <input
            type="date"
            value={form.expiryDate ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, expiryDate: e.target.value || null }))}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
          />
        </div>
        <div className="flex items-center gap-2">
          <Toggle
            checked={form.isActive}
            onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
            label="აქტიური"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-white/10 px-4 py-2 text-slate-300 hover:bg-white/5">
            გაუქმება
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-orange-500 px-4 py-2 font-medium text-white hover:bg-orange-600 disabled:opacity-50"
          >
            {saving ? 'შენახვა...' : 'შენახვა'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
