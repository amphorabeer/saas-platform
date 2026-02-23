'use client';

import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';

interface ClientModalProps {
  client: any | null;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}

export function ClientModal({ client, onClose, onSave }: ClientModalProps) {
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'info' | 'notes'>('info');
  const [form, setForm] = useState({
    name: client?.name || '',
    phone: client?.phone || '',
    email: client?.email || '',
    birthDate: client?.birthDate?.split('T')[0] || '',
    gender: client?.gender || '',
    notes: client?.notes || '',
    allergies: client?.allergies || '',
    hairType: client?.hairType || '',
    colorFormula: client?.colorFormula || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setLoading(true);
    try {
      await onSave({
        name: form.name.trim(),
        phone: form.phone || null,
        email: form.email || null,
        birthDate: form.birthDate || null,
        gender: form.gender || null,
        notes: form.notes || null,
        allergies: form.allergies || null,
        hairType: form.hairType || null,
        colorFormula: form.colorFormula || null,
      });
      onClose();
    } catch { /* handled */ } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-dark-800 border border-dark-700 rounded-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700">
          <h2 className="text-lg font-semibold text-white">
            {client ? 'კლიენტის რედაქტირება' : 'ახალი კლიენტი'}
          </h2>
          <button onClick={onClose} className="text-dark-400 hover:text-white"><X size={20} /></button>
        </div>

        <div className="flex border-b border-dark-700 px-6">
          {[
            { id: 'info' as const, label: 'ინფორმაცია' },
            { id: 'notes' as const, label: 'შენიშვნები / ფორმულა' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id ? 'border-primary-500 text-primary-400' : 'border-transparent text-dark-400 hover:text-dark-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          {tab === 'info' && (
            <div className="space-y-4">
              <div>
                <label className="label">სახელი გვარი *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">ტელეფონი</label>
                  <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input" placeholder="+995..." />
                </div>
                <div>
                  <label className="label">ელფოსტა</label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">დაბადების თარიღი</label>
                  <input type="date" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} className="input" />
                </div>
                <div>
                  <label className="label">სქესი</label>
                  <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className="select">
                    <option value="">— არჩევა —</option>
                    <option value="FEMALE">ქალი</option>
                    <option value="MALE">კაცი</option>
                    <option value="OTHER">სხვა</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {tab === 'notes' && (
            <div className="space-y-4">
              <div>
                <label className="label">ალერგიები / უკუჩვენებები</label>
                <textarea value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} className="input min-h-[60px] resize-none" placeholder="მაგ. ამიაკზე ალერგია..." />
              </div>
              <div>
                <label className="label">თმის ტიპი</label>
                <input type="text" value={form.hairType} onChange={(e) => setForm({ ...form, hairType: e.target.value })} className="input" placeholder="მაგ. წვრილი, ხშირი, ხვეული..." />
              </div>
              <div>
                <label className="label">საღებავის ფორმულა</label>
                <textarea value={form.colorFormula} onChange={(e) => setForm({ ...form, colorFormula: e.target.value })} className="input min-h-[80px] resize-none" placeholder="მაგ. Wella Koleston 7/1 + 6% ოქსიდი..." />
              </div>
              <div>
                <label className="label">დამატებითი შენიშვნები</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input min-h-[80px] resize-none" placeholder="მაგ. ურჩევნია მოკლე შეჭრა, ყოველთვის ჩაი სვამს..." />
              </div>
            </div>
          )}
        </form>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-dark-700">
          <button type="button" onClick={onClose} className="btn-secondary">გაუქმება</button>
          <button onClick={handleSubmit} disabled={loading || !form.name.trim()} className="btn-primary flex items-center gap-2">
            {loading && <Loader2 size={16} className="animate-spin" />}
            {client ? 'შენახვა' : 'დამატება'}
          </button>
        </div>
      </div>
    </div>
  );
}
