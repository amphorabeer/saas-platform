'use client';

import { useState } from 'react';

const BLOCK_STYLE: Record<string, string> = {
  PENDING: 'bg-amber-500/30 border-amber-500/50',
  CONFIRMED: 'bg-blue-500/30 border-blue-500/50',
  SEATED: 'bg-emerald-500/30 border-emerald-500/50',
  COMPLETED: 'bg-slate-500/30 border-slate-500/50',
  CANCELLED: 'bg-red-500/20 border-red-500/40 line-through',
  NO_SHOW: 'bg-red-500/20 border-red-500/40 border-dashed',
};

export type ReservationBlockData = {
  id: string;
  guestName: string;
  guestPhone: string | null;
  guestCount: number;
  notes: string | null;
  status: string;
  duration: number;
};

export function ReservationBlock({
  reservation,
  onClick,
}: {
  reservation: ReservationBlockData;
  onClick: () => void;
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const style = BLOCK_STYLE[reservation.status] || 'bg-slate-500/20';

  return (
    <div
      className={`relative cursor-pointer rounded border px-2 py-1 text-xs font-medium text-white ${style}`}
      onClick={onClick}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span className="truncate block">{reservation.guestName}</span>
      <span className="text-white/80">{reservation.guestCount} სტ.</span>
      {showTooltip && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[180px] rounded-lg border border-white/10 bg-[#1E293B] p-2 shadow-xl">
          <p className="font-medium">{reservation.guestName}</p>
          {reservation.guestPhone && <p className="text-slate-400 text-xs">{reservation.guestPhone}</p>}
          <p className="text-slate-400 text-xs">{reservation.guestCount} სტუმარი</p>
          {reservation.notes && <p className="text-slate-500 text-xs mt-1">{reservation.notes}</p>}
        </div>
      )}
    </div>
  );
}
