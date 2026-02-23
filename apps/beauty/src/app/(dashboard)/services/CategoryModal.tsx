'use client';

import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';

interface CategoryModalProps {
  category: any | null;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}

const COLORS = [
  '#ec4899', '#8b5cf6', '#3b82f6', '#06b6d4', '#10b981',
  '#f59e0b', '#ef4444', '#f97316', '#6366f1', '#14b8a6',
];

const ICONS = ['✂️', '💅', '💆', '💄', '🧴', '💇', '🪮', '🧖', '✨', '🌸'];

export function CategoryModal({ category, onClose, onSave }: CategoryModalProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: category?.name || '',
    icon: category?.icon || ICONS[0],
    color: category?.color || COLORS[0],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    setLoading(true);
    try {
      await onSave({
        name: form.name.trim(),
        icon: form.icon,
        color: form.color,
      });
      onClose();
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-dark-800 border border-dark-700 rounded-xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700">
          <h2 className="text-lg font-semibold text-white">
            {category ? 'კატეგორიის რედაქტირება' : 'ახალი კატეგორია'}
          </h2>
          <button onClick={onClose} className="text-dark-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">სახელი *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input"
              placeholder="მაგ. თმის მოვლა"
              required
            />
          </div>

          <div>
            <label className="label">აიკონი</label>
            <div className="flex gap-2 flex-wrap">
              {ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setForm({ ...form, icon })}
                  className={`w-10 h-10 rounded-lg text-lg flex items-center justify-center transition-all ${
                    form.icon === icon
                      ? 'bg-primary-500/20 border-2 border-primary-500'
                      : 'bg-dark-700 border-2 border-transparent hover:border-dark-500'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">ფერი</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setForm({ ...form, color })}
                  className={`w-8 h-8 rounded-full transition-all ${
                    form.color === color
                      ? 'ring-2 ring-offset-2 ring-offset-dark-800 ring-white scale-110'
                      : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </form>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-dark-700">
          <button type="button" onClick={onClose} className="btn-secondary">
            გაუქმება
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !form.name.trim()}
            className="btn-primary flex items-center gap-2"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {category ? 'შენახვა' : 'დამატება'}
          </button>
        </div>
      </div>
    </div>
  );
}
