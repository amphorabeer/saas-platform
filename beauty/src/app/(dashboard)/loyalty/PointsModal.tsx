'use client';

import { useState } from 'react';
import { X, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Client {
  id: string;
  name: string;
  loyaltyPoints: number;
  loyaltyTier: string;
}

export function PointsModal({
  client,
  onClose,
  onSave,
}: {
  client: Client;
  onClose: () => void;
  onSave: (clientId: string, points: number, type: string, description: string) => void;
}) {
  const [type, setType] = useState<'EARN' | 'REDEEM' | 'BONUS'>('BONUS');
  const [points, setPoints] = useState(0);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (points <= 0) { alert('შეიყვანეთ ქულები'); return; }
    if (type === 'REDEEM' && points > client.loyaltyPoints) {
      alert(`კლიენტს აქვს მხოლოდ ${client.loyaltyPoints} ქულა`);
      return;
    }
    setSaving(true);
    await onSave(client.id, points, type, description || `მანუალური ${type === 'REDEEM' ? 'გამოყენება' : 'დამატება'}`);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-dark-800 border border-dark-700 rounded-2xl w-full max-w-sm mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Star size={20} className="text-amber-400" />
            ქულების მართვა
          </h2>
          <button onClick={onClose} className="p-1.5 text-dark-400 hover:text-white rounded-lg hover:bg-dark-700">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div className="text-center">
            <p className="text-sm text-dark-400">{client.name}</p>
            <p className="text-2xl font-bold text-amber-400">{client.loyaltyPoints} ქულა</p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {([
              { id: 'BONUS', label: 'ბონუსი', color: 'amber' },
              { id: 'EARN', label: 'დამატება', color: 'emerald' },
              { id: 'REDEEM', label: 'გამოყენება', color: 'red' },
            ] as const).map((t) => (
              <button
                key={t.id}
                onClick={() => setType(t.id)}
                className={cn(
                  'px-3 py-2 rounded-lg text-sm transition-colors',
                  type === t.id
                    ? `bg-${t.color}-500/20 text-${t.color}-400 border border-${t.color}-500/30`
                    : 'bg-dark-700 text-dark-300 border border-dark-600'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div>
            <label className="label">ქულები *</label>
            <input
              type="number"
              value={points || ''}
              onChange={(e) => setPoints(Number(e.target.value))}
              min={1}
              max={type === 'REDEEM' ? client.loyaltyPoints : 99999}
              className="input"
              placeholder="0"
            />
          </div>

          <div>
            <label className="label">აღწერა</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input"
              placeholder="მაგ: დაბადების დღის ბონუსი"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-dark-700 flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">გაუქმება</button>
          <button onClick={handleSubmit} disabled={saving} className="btn-primary flex-1">
            {saving ? 'ინახება...' : type === 'REDEEM' ? 'ჩამოჭრა' : 'დამატება'}
          </button>
        </div>
      </div>
    </div>
  );
}
