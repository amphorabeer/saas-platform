'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';

const OP_TYPES = [
  { value: 'INCOMING', label: 'შემოსვლა' },
  { value: 'WRITE_OFF', label: 'ჩამოწერა' },
  { value: 'ADJUSTMENT', label: 'კორექტირება' },
] as const;

export function StockOperationModal({
  open,
  onClose,
  ingredient,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  ingredient: { id: string; name: string; unit: string; currentStock: number } | null;
  onSuccess: () => void;
}) {
  const [type, setType] = useState<(typeof OP_TYPES)[number]['value']>('INCOMING');
  const [quantity, setQuantity] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && ingredient) {
      setType('INCOMING');
      setQuantity('');
      setUnitCost('');
      setReference('');
      setNotes('');
      setError('');
    }
  }, [open, ingredient]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingredient) return;
    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0) {
      setError('რაოდენობა უნდა იყოს დადებითი');
      return;
    }
    if (type === 'WRITE_OFF' && qty > ingredient.currentStock) {
      setError('რაოდენობა აღემატება მარაგს');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/inventory/ingredients/${ingredient.id}/operations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          quantity: type === 'ADJUSTMENT' ? qty : qty,
          unitCost: unitCost ? Number(unitCost) : undefined,
          reference: reference.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'შეცდომა');
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'შეცდომა');
    } finally {
      setLoading(false);
    }
  };

  if (!ingredient) return null;

  return (
    <Modal open={open} onClose={onClose} title={`სტოკის ოპერაცია: ${ingredient.name}`} maxWidth="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-sm text-red-400">{error}</p>}
        <p className="text-sm text-slate-400">მიმდინარე მარაგი: {ingredient.currentStock} {ingredient.unit}</p>
        <div>
          <label className="mb-1 block text-sm text-slate-400">ოპერაციის ტიპი</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as (typeof OP_TYPES)[number]['value'])}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
          >
            {OP_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-400">
            რაოდენობა {type === 'ADJUSTMENT' ? '(აბსოლუტური მნიშვნელობა)' : ''}
          </label>
          <input
            type="number"
            min={0}
            step="any"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
            required
          />
        </div>
        {type === 'INCOMING' && (
          <div>
            <label className="mb-1 block text-sm text-slate-400">ერთეულის ფასი (₾)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={unitCost}
              onChange={(e) => setUnitCost(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
            />
          </div>
        )}
        <div>
          <label className="mb-1 block text-sm text-slate-400">reference (ინვოისი/მიზეზი)</label>
          <input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-400">შენიშვნა</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-white/10 px-4 py-2 text-slate-300 hover:bg-white/5">
            გაუქმება
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-orange-500 px-4 py-2 font-medium text-white hover:bg-orange-600 disabled:opacity-50"
          >
            {loading ? '...' : 'შესრულება'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
