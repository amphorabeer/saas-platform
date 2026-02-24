'use client';

import { useState } from 'react';
import { X, CreditCard } from 'lucide-react';

interface Client {
  id: string;
  name: string;
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 12; i++) {
    if (i > 0 && i % 4 === 0) code += '-';
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function GiftCardModal({
  clients,
  onClose,
  onSave,
}: {
  clients: Client[];
  onClose: () => void;
  onSave: (data: any) => void;
}) {
  const [form, setForm] = useState({
    code: generateCode(),
    balance: 0,
    clientId: '',
    expiresAt: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.balance || form.balance <= 0) { alert('შეიყვანეთ თანხა'); return; }
    setSaving(true);
    await onSave({
      code: form.code,
      balance: Number(form.balance),
      clientId: form.clientId || null,
      expiresAt: form.expiresAt || null,
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-dark-800 border border-dark-700 rounded-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <CreditCard size={20} className="text-primary-400" />
            ახალი სასაჩუქრე ბარათი
          </h2>
          <button onClick={onClose} className="p-1.5 text-dark-400 hover:text-white rounded-lg hover:bg-dark-700">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="label">კოდი</label>
            <div className="flex gap-2">
              <input type="text" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })}
                className="input flex-1 font-mono" />
              <button onClick={() => setForm({ ...form, code: generateCode() })}
                className="btn-secondary text-xs">ახალი</button>
            </div>
          </div>

          <div>
            <label className="label">თანხა (₾) *</label>
            <input type="number" value={form.balance || ''} onChange={(e) => setForm({ ...form, balance: Number(e.target.value) })}
              min={1} placeholder="50" className="input" />
          </div>

          <div>
            <label className="label">კლიენტი (არასავალდ.)</label>
            <select value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} className="input">
              <option value="">--- არ მიება ---</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">ვადა (არასავალდ.)</label>
            <input type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} className="input" />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-dark-700 flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">გაუქმება</button>
          <button onClick={handleSubmit} disabled={saving} className="btn-primary flex-1">
            {saving ? 'ინახება...' : 'შექმნა'}
          </button>
        </div>
      </div>
    </div>
  );
}
