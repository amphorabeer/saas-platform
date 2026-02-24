'use client';

import { useState } from 'react';
import { X, DollarSign } from 'lucide-react';

interface Expense {
  id: string;
  category: string;
  amount: number;
  date: string;
  description: string | null;
}

const EXPENSE_CATEGORIES = [
  { id: 'RENT', label: 'ქირა' },
  { id: 'UTILITIES', label: 'კომუნალური' },
  { id: 'SALARY', label: 'ხელფასი' },
  { id: 'SUPPLIES', label: 'მარაგები' },
  { id: 'EQUIPMENT', label: 'აღჭურვილობა' },
  { id: 'MARKETING', label: 'მარკეტინგი' },
  { id: 'OTHER', label: 'სხვა' },
];

export function ExpenseModal({
  expense,
  onClose,
  onSave,
}: {
  expense: Expense | null;
  onClose: () => void;
  onSave: (data: any) => void;
}) {
  const [form, setForm] = useState({
    category: expense?.category || 'OTHER',
    amount: expense?.amount || 0,
    date: expense?.date ? expense.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
    description: expense?.description || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.category) {
      alert('აირჩიეთ კატეგორია');
      return;
    }
    if (!form.amount || form.amount <= 0) {
      alert('შეიყვანეთ თანხა');
      return;
    }

    setSaving(true);
    await onSave({
      category: form.category,
      amount: Number(form.amount),
      date: form.date,
      description: form.description || null,
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-dark-800 border border-dark-700 rounded-2xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <DollarSign size={20} className="text-red-400" />
            {expense ? 'ხარჯის რედაქტირება' : 'ახალი ხარჯი'}
          </h2>
          <button onClick={onClose} className="p-1.5 text-dark-400 hover:text-white rounded-lg hover:bg-dark-700">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <div className="px-6 py-4 space-y-4">
          {/* Category */}
          <div>
            <label className="label">კატეგორია *</label>
            <div className="grid grid-cols-2 gap-2">
              {EXPENSE_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setForm({ ...form, category: cat.id })}
                  className={`px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                    form.category === cat.id
                      ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                      : 'bg-dark-700 text-dark-300 border border-dark-600 hover:border-dark-500'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Amount + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">თანხა (₾) *</label>
              <input
                type="number"
                value={form.amount || ''}
                onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
                min={0}
                step={0.01}
                placeholder="0.00"
                className="input"
              />
            </div>
            <div>
              <label className="label">თარიღი</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="input"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="label">აღწერა</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="მაგ: თებერვლის ელექტროენერგია"
              className="input"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-dark-700 flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">
            გაუქმება
          </button>
          <button onClick={handleSubmit} disabled={saving} className="btn-primary flex-1">
            {saving ? 'ინახება...' : expense ? 'შენახვა' : 'დამატება'}
          </button>
        </div>
      </div>
    </div>
  );
}
