'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Toggle } from '@/components/ui/Toggle';
import type { CategoryRow } from './CategoryCard';

type CategoryFormProps = {
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    nameEn?: string;
    icon?: string;
    color?: string;
    sortOrder: number;
    isActive: boolean;
    isSeasonal: boolean;
    parentId?: string | null;
  }) => Promise<void>;
  edit?: CategoryRow | null;
  parentOptions?: { id: string; name: string }[];
};

const COLOR_PRESETS = [
  '#EF4444', '#F97316', '#EAB308', '#22C55E', '#14B8A6', '#3B82F6', '#8B5CF6', '#EC4899',
];

export function CategoryForm({
  open,
  onClose,
  onSave,
  edit,
  parentOptions = [],
}: CategoryFormProps) {
  const [name, setName] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [icon, setIcon] = useState('');
  const [color, setColor] = useState('');
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [isSeasonal, setIsSeasonal] = useState(false);
  const [parentId, setParentId] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (edit) {
      setName(edit.name);
      setNameEn(edit.nameEn || '');
      setIcon(edit.icon || '');
      setColor(edit.color || '');
      setSortOrder(edit.sortOrder);
      setIsActive(edit.isActive);
      setIsSeasonal(edit.isSeasonal);
      setParentId(edit.parentId || '');
    } else {
      setName('');
      setNameEn('');
      setIcon('');
      setColor('');
      setSortOrder(0);
      setIsActive(true);
      setIsSeasonal(false);
      setParentId('');
    }
  }, [edit, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        nameEn: nameEn.trim() || undefined,
        icon: icon.trim() || undefined,
        color: color.trim() || undefined,
        sortOrder,
        isActive,
        isSeasonal,
        parentId: parentId || null,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={edit ? 'კატეგორიის რედაქტირება' : 'ახალი კატეგორია'} maxWidth="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-300">სახელი (ქართ) *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder:text-slate-500 focus:border-orange-500/50 focus:outline-none"
            placeholder="მაგ: სალათები"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-300">სახელი (ინგ)</label>
          <input
            type="text"
            value={nameEn}
            onChange={(e) => setNameEn(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder:text-slate-500 focus:border-orange-500/50 focus:outline-none"
            placeholder="Salads"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">აიკონი (emoji)</label>
            <input
              type="text"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder:text-slate-500 focus:border-orange-500/50 focus:outline-none"
              placeholder="🥗"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">ფერი</label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-8 w-8 rounded-full border-2 transition ${
                    color === c ? 'border-white scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-20 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-sm text-white"
                placeholder="#hex"
              />
            </div>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-300">მშობელი კატეგორია</label>
          <select
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white focus:border-orange-500/50 focus:outline-none"
          >
            <option value="">— არა —</option>
            {parentOptions
              .filter((p) => p.id !== edit?.id)
              .map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-300">სორტირების რიგი</label>
          <input
            type="number"
            min={0}
            value={sortOrder}
            onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white focus:border-orange-500/50 focus:outline-none"
          />
        </div>
        <div className="flex gap-6">
          <Toggle checked={isActive} onCheckedChange={setIsActive} label="აქტიური" />
          <Toggle checked={isSeasonal} onCheckedChange={setIsSeasonal} label="სეზონური" />
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/10"
          >
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
