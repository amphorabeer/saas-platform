'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import type { WaiterOption } from './WaiterSelectScreen';

export function PinInputScreen({
  waiter,
  onSuccess,
  onBack,
}: {
  waiter: WaiterOption;
  onSuccess: (employeeId: string, firstName: string, lastName: string) => void;
  onBack: () => void;
}) {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  const name = `${waiter.firstName} ${waiter.lastName}`.trim() || waiter.id;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = pin.replace(/\D/g, '').trim();
    if (!trimmed) {
      toast.error('შეიყვანეთ PIN');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/pos/verify-pin', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'არასწორი PIN');
        return;
      }
      if (data.employeeId === waiter.id) {
        onSuccess(data.employeeId, data.firstName ?? waiter.firstName, data.lastName ?? waiter.lastName);
      } else {
        toast.error('PIN სხვა ოფიციანტისთვისაა');
      }
    } catch {
      toast.error('შეცდომა');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <button
        type="button"
        onClick={onBack}
        className="self-start rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-white/10 hover:text-white"
      >
        ← უკან
      </button>
      <h2 className="text-center text-lg font-semibold text-white">PIN — {name}</h2>
      <form onSubmit={handleSubmit} className="mx-auto flex w-full max-w-xs flex-col gap-4">
        <input
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          placeholder="PIN"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center text-xl font-mono text-white placeholder:text-slate-500 focus:border-orange-500/50 focus:outline-none"
          autoFocus
        />
        <button
          type="submit"
          disabled={loading || pin.length < 4}
          className="rounded-xl bg-orange-500 py-3 font-medium text-white hover:bg-orange-600 disabled:opacity-50"
        >
          {loading ? 'შემოწმება...' : 'შესვლა'}
        </button>
      </form>
    </div>
  );
}
