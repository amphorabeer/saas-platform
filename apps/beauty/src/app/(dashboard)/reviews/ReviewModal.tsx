'use client';

import { useState } from 'react';
import { X, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ReviewModal({
  staff,
  onClose,
  onSave,
}: {
  staff: { id: string; name: string }[];
  onClose: () => void;
  onSave: (data: any) => void;
}) {
  const [form, setForm] = useState({
    clientName: '',
    staffId: '',
    rating: 0,
    comment: '',
    isPublic: true,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.clientName.trim()) { alert('შეიყვანეთ კლიენტის სახელი'); return; }
    if (form.rating === 0) { alert('აირჩიეთ შეფასება'); return; }
    setSaving(true);
    await onSave({
      clientName: form.clientName,
      staffId: form.staffId || null,
      rating: form.rating,
      comment: form.comment || null,
      isPublic: form.isPublic,
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-dark-800 border border-dark-700 rounded-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Star size={20} className="text-amber-400" />
            ახალი შეფასება
          </h2>
          <button onClick={onClose} className="p-1.5 text-dark-400 hover:text-white rounded-lg hover:bg-dark-700">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="label">კლიენტის სახელი *</label>
            <input type="text" value={form.clientName}
              onChange={(e) => setForm({ ...form, clientName: e.target.value })}
              placeholder="მაგ: ნინო კვარაცხელია" className="input" />
          </div>

          <div>
            <label className="label">სპეციალისტი</label>
            <select value={form.staffId} onChange={(e) => setForm({ ...form, staffId: e.target.value })} className="input">
              <option value="">--- არჩევა ---</option>
              {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div>
            <label className="label">შეფასება *</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((r) => (
                <button key={r} onClick={() => setForm({ ...form, rating: r })}
                  className="p-1 transition-transform hover:scale-110">
                  <Star size={28} className={cn(
                    r <= form.rating ? 'text-amber-400 fill-amber-400' : 'text-dark-600'
                  )} />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">კომენტარი</label>
            <textarea value={form.comment}
              onChange={(e) => setForm({ ...form, comment: e.target.value })}
              rows={3} placeholder="კლიენტის კომენტარი..." className="input resize-none" />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isPublic}
              onChange={(e) => setForm({ ...form, isPublic: e.target.checked })}
              className="w-4 h-4 rounded border-dark-600 bg-dark-700 text-primary-500 focus:ring-primary-500" />
            <span className="text-sm text-dark-300">საჯარო შეფასება</span>
          </label>
        </div>

        <div className="px-6 py-4 border-t border-dark-700 flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">გაუქმება</button>
          <button onClick={handleSubmit} disabled={saving} className="btn-primary flex-1">
            {saving ? 'ინახება...' : 'შენახვა'}
          </button>
        </div>
      </div>
    </div>
  );
}
