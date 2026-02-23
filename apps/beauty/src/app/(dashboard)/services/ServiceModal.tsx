'use client';

import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';

interface ServiceModalProps {
  service: any | null;
  categories: { id: string; name: string }[];
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}

export function ServiceModal({ service, categories, onClose, onSave }: ServiceModalProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: service?.name || '',
    description: service?.description || '',
    duration: service?.duration?.toString() || '60',
    price: service?.price?.toString() || '',
    categoryId: service?.categoryId || '',
    isActive: service?.isActive ?? true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.price) return;

    setLoading(true);
    try {
      await onSave({
        name: form.name.trim(),
        description: form.description || null,
        duration: parseInt(form.duration) || 60,
        price: parseFloat(form.price) || 0,
        categoryId: form.categoryId || null,
        isActive: form.isActive,
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
      <div className="relative bg-dark-800 border border-dark-700 rounded-xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700">
          <h2 className="text-lg font-semibold text-white">
            {service ? 'სერვისის რედაქტირება' : 'ახალი სერვისი'}
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
              placeholder="მაგ. თმის შეჭრა"
              required
            />
          </div>

          <div>
            <label className="label">კატეგორია</label>
            <select
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              className="select"
            >
              <option value="">— კატეგორიის გარეშე —</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">ხანგრძლივობა (წუთი) *</label>
              <input
                type="number"
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: e.target.value })}
                className="input"
                min="5"
                step="5"
                required
              />
            </div>
            <div>
              <label className="label">ფასი (₾) *</label>
              <input
                type="number"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="input"
                min="0"
                step="0.01"
                required
              />
            </div>
          </div>

          <div>
            <label className="label">აღწერა</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="input min-h-[80px] resize-none"
              placeholder="სერვისის მოკლე აღწერა..."
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="w-4 h-4 rounded border-dark-600 bg-dark-700 text-primary-500"
            />
            <label htmlFor="isActive" className="text-sm text-dark-300">
              აქტიური სერვისი
            </label>
          </div>
        </form>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-dark-700">
          <button type="button" onClick={onClose} className="btn-secondary">
            გაუქმება
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !form.name.trim() || !form.price}
            className="btn-primary flex items-center gap-2"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {service ? 'შენახვა' : 'დამატება'}
          </button>
        </div>
      </div>
    </div>
  );
}
