'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Toggle } from '@/components/ui/Toggle';
import { Plus, Trash2 } from 'lucide-react';
import type { ModifierGroupRow } from './ModifierGroupAccordion';

type ModifierRow = {
  id?: string;
  name: string;
  nameEn: string;
  priceAdjustment: number;
  isDefault: boolean;
  isActive: boolean;
};

type ModifierGroupFormProps = {
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    nameEn?: string;
    isRequired: boolean;
    minSelect: number;
    maxSelect: number;
    sortOrder: number;
    modifiers: ModifierRow[];
  }) => Promise<void>;
  edit?: ModifierGroupRow | null;
};

export function ModifierGroupForm({ open, onClose, onSave, edit }: ModifierGroupFormProps) {
  const [name, setName] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [isRequired, setIsRequired] = useState(false);
  const [minSelect, setMinSelect] = useState(0);
  const [maxSelect, setMaxSelect] = useState(1);
  const [sortOrder, setSortOrder] = useState(0);
  const [modifiers, setModifiers] = useState<ModifierRow[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (edit) {
      setName(edit.name);
      setNameEn(edit.nameEn || '');
      setIsRequired(edit.isRequired);
      setMinSelect(edit.minSelect);
      setMaxSelect(edit.maxSelect);
      setSortOrder(edit.sortOrder);
      setModifiers(
        edit.modifiers.map((m) => ({
          id: m.id,
          name: m.name,
          nameEn: m.nameEn || '',
          priceAdjustment: m.priceAdjustment,
          isDefault: m.isDefault,
          isActive: m.isActive,
        }))
      );
    } else {
      setName('');
      setNameEn('');
      setIsRequired(false);
      setMinSelect(0);
      setMaxSelect(1);
      setSortOrder(0);
      setModifiers([]);
    }
  }, [edit, open]);

  const addModifier = () => {
    setModifiers((prev) => [
      ...prev,
      { name: '', nameEn: '', priceAdjustment: 0, isDefault: false, isActive: true },
    ]);
  };

  const updateModifier = (index: number, field: keyof ModifierRow, value: unknown) => {
    setModifiers((prev) => {
      const next = [...prev];
      (next[index] as Record<string, unknown>)[field] = value;
      return next;
    });
  };

  const removeModifier = (index: number) => {
    setModifiers((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        nameEn: nameEn.trim() || undefined,
        isRequired,
        minSelect,
        maxSelect,
        sortOrder,
        modifiers: modifiers.filter((m) => m.name.trim()),
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={edit ? 'მოდიფიკატორების ჯგუფის რედაქტირება' : 'ახალი ჯგუფი'}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">ჯგუფის სახელი *</label>
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
        <div className="flex gap-6">
          <Toggle checked={isRequired} onCheckedChange={setIsRequired} label="აუცილებელი" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">min არჩევა</label>
            <input
              type="number"
              min={0}
              value={minSelect}
              onChange={(e) => setMinSelect(parseInt(e.target.value, 10) || 0)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white focus:border-orange-500/50 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">max არჩევა</label>
            <input
              type="number"
              min={0}
              value={maxSelect}
              onChange={(e) => setMaxSelect(parseInt(e.target.value, 10) || 1)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white focus:border-orange-500/50 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">სორტირება</label>
            <input
              type="number"
              min={0}
              value={sortOrder}
              onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white focus:border-orange-500/50 focus:outline-none"
            />
          </div>
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium text-slate-300">მოდიფიკატორები</label>
            <button
              type="button"
              onClick={addModifier}
              className="flex items-center gap-1 rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20"
            >
              <Plus className="h-4 w-4" /> დამატება
            </button>
          </div>
          <div className="space-y-3 max-h-48 overflow-y-auto">
            {modifiers.map((m, i) => (
              <div
                key={i}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-white/5 p-3"
              >
                <input
                  type="text"
                  value={m.name}
                  onChange={(e) => updateModifier(i, 'name', e.target.value)}
                  placeholder="სახელი"
                  className="flex-1 min-w-[120px] rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500"
                />
                <input
                  type="text"
                  value={m.nameEn}
                  onChange={(e) => updateModifier(i, 'nameEn', e.target.value)}
                  placeholder="name (en)"
                  className="w-24 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500"
                />
                <input
                  type="number"
                  step="0.01"
                  value={m.priceAdjustment}
                  onChange={(e) => updateModifier(i, 'priceAdjustment', parseFloat(e.target.value) || 0)}
                  placeholder="+₾"
                  className="w-20 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                />
                <Toggle
                  checked={m.isDefault}
                  onCheckedChange={(v) => updateModifier(i, 'isDefault', v)}
                />
                <Toggle
                  checked={m.isActive}
                  onCheckedChange={(v) => updateModifier(i, 'isActive', v)}
                />
                <button
                  type="button"
                  onClick={() => removeModifier(i)}
                  className="rounded p-2 text-slate-400 hover:bg-red-500/20 hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
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
