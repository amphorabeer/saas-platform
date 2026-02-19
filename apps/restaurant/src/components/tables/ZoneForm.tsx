'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Toggle } from '@/components/ui/Toggle';

const COLOR_PRESETS = [
  '#EF4444', '#F97316', '#EAB308', '#22C55E', '#14B8A6',
  '#3B82F6', '#8B5CF6', '#EC4899', '#64748B', '#0EA5E9',
];

export type ZoneRow = {
  id: string;
  name: string;
  color: string | null;
  sortOrder: number;
  isActive: boolean;
  _count?: { tables: number };
};

type ZoneFormProps = {
  open: boolean;
  onClose: () => void;
  onSave: (data: { name: string; color?: string; sortOrder: number; isActive: boolean }) => Promise<void>;
  edit?: ZoneRow | null;
};

export function ZoneForm({ open, onClose, onSave, edit }: ZoneFormProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('');
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (edit) {
      setName(edit.name);
      setColor(edit.color || '');
      setSortOrder(edit.sortOrder);
      setIsActive(edit.isActive);
    } else {
      setName('');
      setColor('');
      setSortOrder(0);
      setIsActive(true);
    }
  }, [edit, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        color: color.trim() || undefined,
        sortOrder,
        isActive,
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
      title={edit ? 'ზონის რედაქტირება' : 'ახალი ზონა'}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
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
          <label className="mb-2 block text-sm font-medium text-slate-300">ფერი</label>
          <div className="flex flex-wrap gap-2">
            {COLOR_PRESETS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`h-8 w-8 rounded-full border-2 transition ${color === c ? 'border-white scale-110' : 'border-transparent'}`}
                style={{ backgroundColor: c }}
              />
            ))}
            <input
              type="text"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-24 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-sm text-white"
              placeholder="#hex"
            />
          </div>
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
        <Toggle checked={isActive} onCheckedChange={setIsActive} label="აქტიური" />
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
