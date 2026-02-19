'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';

type WaiterOption = { id: string; name: string; role: string };

type SessionStartFormProps = {
  open: boolean;
  onClose: () => void;
  tableId: string;
  tableNumber: string;
  onSuccess: () => void;
};

export function SessionStartForm({
  open,
  onClose,
  tableId,
  tableNumber,
  onSuccess,
}: SessionStartFormProps) {
  const [guestCount, setGuestCount] = useState(0);
  const [waiterId, setWaiterId] = useState('');
  const [waiters, setWaiters] = useState<WaiterOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetch('/api/tables/waiters', { credentials: 'include' })
        .then((r) => r.ok ? r.json() : [])
        .then(setWaiters)
        .catch(() => setWaiters([]));
      setGuestCount(0);
      setWaiterId(waiters[0]?.id || '');
    }
  }, [open]);

  useEffect(() => {
    if (open && waiters.length && !waiterId) setWaiterId(waiters[0].id);
  }, [open, waiters, waiterId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/tables/sessions', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId,
          guestCount: Math.max(0, guestCount),
          waiterId: waiterId || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'სესიის დაწყება ვერ მოხერხდა');
      }
      onSuccess();
      onClose();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'შეცდომა');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={`სესიის დაწყება — ${tableNumber}`} maxWidth="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-300">სტუმრების რაოდენობა</label>
          <input
            type="number"
            min={0}
            value={guestCount}
            onChange={(e) => setGuestCount(parseInt(e.target.value, 10) || 0)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white focus:border-orange-500/50 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-300">ოფიციანტი</label>
          <select
            value={waiterId}
            onChange={(e) => setWaiterId(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white focus:border-orange-500/50 focus:outline-none"
          >
            <option value="">— არა —</option>
            {waiters.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/10">
            გაუქმება
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {loading ? '...' : 'სესიის დაწყება'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
