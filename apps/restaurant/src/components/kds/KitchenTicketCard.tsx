'use client';

import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { KDSTimer } from './KDSTimer';

export type TicketItem = {
  menuItemName?: string;
  quantity?: number;
  modifiers?: { name?: string; price?: number }[] | string;
  specialInstructions?: string | null;
};

export type KitchenTicketData = {
  id: string;
  orderId: string;
  orderNumber: string;
  station: string;
  status: string;
  items: TicketItem[];
  tableNumber: string | null;
  waiterName: string | null;
  priority: number;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
};

const STATION_LABELS: Record<string, string> = {
  HOT: 'HOT🔥',
  COLD: 'COLD❄️',
  BAR: 'BAR🍸',
  PIZZA: 'PIZZA🍕',
  GRILL: 'GRILL🥩',
  PASTRY: 'PASTRY🧁',
};

export const KitchenTicketCard = forwardRef<HTMLDivElement, {
  ticket: KitchenTicketData;
  onStatusChange: (id: string, newStatus: string) => void;
  soundOn?: boolean;
}>(function KitchenTicketCard(
  { ticket, onStatusChange, soundOn = true },
  ref
) {
  const items = Array.isArray(ticket.items) ? ticket.items : [];
  const tableLabel = ticket.tableNumber || 'Take Away';

  const handleAction = () => {
    if (ticket.status === 'NEW') onStatusChange(ticket.id, 'PREPARING');
    else if (ticket.status === 'PREPARING') onStatusChange(ticket.id, 'READY');
    else if (ticket.status === 'READY') onStatusChange(ticket.id, 'SERVED');
  };

  const handleRecall = () => {
    if (ticket.status === 'READY') onStatusChange(ticket.id, 'PREPARING');
  };

  const actionLabel =
    ticket.status === 'NEW'
      ? 'დაწყება'
      : ticket.status === 'PREPARING'
        ? 'მზადაა'
        : ticket.status === 'READY'
          ? 'გაცემულია'
          : null;

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="rounded-xl border border-white/10 bg-[#1E293B]/80 p-4 shadow-lg backdrop-blur-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-white/10 pb-2">
        <div>
          <p className="font-semibold text-white">
            #{ticket.orderNumber} — {tableLabel}
          </p>
          {ticket.waiterName && (
            <p className="text-xs text-slate-400">ოფიციანტი: {ticket.waiterName}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {ticket.status === 'READY' && (
            <button
              type="button"
              onClick={handleRecall}
              className="rounded bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-400 hover:bg-amber-500/30 transition"
            >
              Recall
            </button>
          )}
          <span className="rounded bg-white/10 px-2 py-0.5 text-xs font-medium text-slate-300">
            {STATION_LABELS[ticket.station] ?? ticket.station}
          </span>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <KDSTimer
          createdAt={ticket.createdAt}
          startedAt={ticket.startedAt}
          status={ticket.status}
          soundOn={soundOn}
        />
      </div>

      <ul className="mt-3 space-y-1">
        {items.map((item, i) => {
          const name = (item as TicketItem).menuItemName ?? 'Item';
          const qty = (item as TicketItem).quantity ?? 1;
          const mods = (item as TicketItem).modifiers;
          const modStr = Array.isArray(mods)
            ? mods.map((m) => (typeof m === 'object' && m && 'name' in m ? m.name : String(m))).join(', ')
            : typeof mods === 'string'
              ? mods
              : '';
          const special = (item as TicketItem).specialInstructions;
          return (
            <li key={i} className="text-sm">
              <span className="text-white">
                {qty}× {name}
              </span>
              {modStr && <p className="text-xs text-slate-500">{modStr}</p>}
              {special && <p className="text-xs italic text-orange-400">{special}</p>}
            </li>
          );
        })}
      </ul>

      {actionLabel && (
        <button
          type="button"
          onClick={handleAction}
          className="mt-4 w-full min-h-[48px] rounded-xl bg-orange-500/90 py-3 font-semibold text-white hover:bg-orange-500 transition touch-manipulation"
        >
          {actionLabel}
        </button>
      )}
    </motion.div>
  );
});
