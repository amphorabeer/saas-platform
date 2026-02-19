'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export type WaiterOption = {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  pin: string | null;
};

export function WaiterSelectScreen({
  onSelect,
}: {
  onSelect: (waiter: WaiterOption) => void;
}) {
  const [waiters, setWaiters] = useState<WaiterOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/waiters?isActive=true', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setWaiters(
            data.map((e: { id: string; firstName: string; lastName: string; role: string; pin?: string | null }) => ({
              id: e.id,
              firstName: e.firstName,
              lastName: e.lastName,
              role: e.role,
              pin: e.pin ?? null,
            }))
          );
        } else setWaiters([]);
      })
      .catch(() => setWaiters([]))
      .finally(() => setLoading(false));
  }, []);

  const name = (w: WaiterOption) => `${w.firstName} ${w.lastName}`.trim() || w.id;
  const hasPin = (w: WaiterOption) => w.pin != null && w.pin !== '';

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-slate-400">იტვირთება...</p>
      </div>
    );
  }

  if (waiters.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-slate-400">ოფიციანტი არ მოიძებნა</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4">
      <h2 className="text-center text-lg font-semibold text-white">აირჩიეთ ოფიციანტი</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {waiters.map((w, i) => (
          <motion.button
            key={w.id}
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            onClick={() => onSelect(w)}
            className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-[#1E293B]/60 p-6 text-center backdrop-blur-sm hover:border-orange-500/30 hover:bg-[#1E293B]/80 transition touch-manipulation"
          >
            <span className="text-xl font-semibold text-white">{name(w)}</span>
            <span className="mt-1 text-xs text-slate-400">{w.role}</span>
            {hasPin(w) && (
              <span className="mt-2 inline-flex rounded bg-white/10 px-2 py-0.5 text-xs text-slate-500">
                PIN
              </span>
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
