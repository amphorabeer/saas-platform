'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { KitchenTicketCard, type KitchenTicketData } from './KitchenTicketCard';

const COLUMN_STYLES: Record<string, { bg: string; header: string; title: string }> = {
  NEW: {
    bg: 'bg-red-500/10',
    header: 'border-red-500/50 bg-red-500/20',
    title: 'text-red-400',
  },
  PREPARING: {
    bg: 'bg-amber-500/10',
    header: 'border-amber-500/50 bg-amber-500/20',
    title: 'text-amber-400',
  },
  READY: {
    bg: 'bg-emerald-500/10',
    header: 'border-emerald-500/50 bg-emerald-500/20',
    title: 'text-emerald-400',
  },
};

const COLUMN_LABELS: Record<string, string> = {
  NEW: 'ახალი',
  PREPARING: 'მომზადება',
  READY: 'მზადაა',
};

export function KDSColumn({
  status,
  tickets,
  onStatusChange,
  soundOn,
}: {
  status: 'NEW' | 'PREPARING' | 'READY';
  tickets: KitchenTicketData[];
  onStatusChange: (id: string, newStatus: string) => void;
  soundOn?: boolean;
}) {
  const style = COLUMN_STYLES[status] ?? COLUMN_STYLES.NEW;
  const label = COLUMN_LABELS[status] ?? status;

  return (
    <div className={`flex flex-col rounded-xl border border-white/10 ${style.bg} min-h-[400px]`}>
      <div className={`shrink-0 rounded-t-xl border-b px-4 py-3 ${style.header}`}>
        <h3 className={`font-bold ${style.title}`}>
          {label} ({tickets.length})
        </h3>
      </div>
      <div className="flex-1 overflow-auto p-3 space-y-3">
        <AnimatePresence mode="popLayout">
          {tickets.map((t) => (
            <KitchenTicketCard
              key={t.id}
              ticket={t}
              onStatusChange={onStatusChange}
              soundOn={soundOn}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
