'use client';

import { ReservationStatusBadge } from './ReservationStatusBadge';
import { ReservationStatusActions, type ReservationRow } from './ReservationStatusActions';

const ROW_STYLE: Record<string, string> = {
  PENDING: 'bg-amber-500/5',
  CONFIRMED: 'bg-blue-500/5',
  SEATED: 'bg-emerald-500/5',
  COMPLETED: 'bg-slate-500/5',
  CANCELLED: 'bg-red-500/5',
  NO_SHOW: 'bg-red-500/5',
};

export type ReservationListItem = ReservationRow & {
  time: string;
  guestName: string;
  guestPhone: string | null;
  guestCount: number;
  duration: number;
  notes: string | null;
  smsSent?: boolean;
  table?: { number: string; zoneName?: string } | null;
};

export function ReservationListView({
  reservations,
  onConfirm,
  onSeat,
  onComplete,
  onCancel,
  onNoShow,
  onEdit,
  onDelete,
  loadingId,
}: {
  reservations: ReservationListItem[];
  onConfirm: (id: string) => void;
  onSeat: (id: string) => void;
  onComplete: (id: string) => void;
  onCancel: (id: string) => void;
  onNoShow: (id: string) => void;
  onEdit: (r: ReservationListItem) => void;
  onDelete: (r: ReservationListItem) => void;
  loadingId: string | null;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#1E293B]/50">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-white/10 bg-white/5">
            <th className="p-3 font-medium text-slate-400">დრო</th>
            <th className="p-3 font-medium text-slate-400">სტუმარი</th>
            <th className="p-3 font-medium text-slate-400">რაოდ.</th>
            <th className="p-3 font-medium text-slate-400">მაგიდა</th>
            <th className="p-3 font-medium text-slate-400">ხანგრძლივობა</th>
            <th className="p-3 font-medium text-slate-400">სტატუსი</th>
            <th className="p-3 font-medium text-slate-400">შენიშვნა</th>
            <th className="p-3 font-medium text-slate-400 w-48">მოქმედებები</th>
          </tr>
        </thead>
        <tbody>
          {reservations.map((r) => (
            <tr
              key={r.id}
              className={`border-b border-white/5 hover:bg-white/5 ${ROW_STYLE[r.status] ?? ''}`}
            >
              <td className="p-3 font-medium text-white">{r.time}</td>
              <td className="p-3">
                <span className="text-white">{r.guestName}</span>
                {r.guestPhone && <span className="ml-1 text-slate-500 text-xs">{r.guestPhone}</span>}
              </td>
              <td className="p-3 text-slate-300">{r.guestCount}</td>
              <td className="p-3 text-slate-400">{r.table ? `T${r.table.number}` : '—'}</td>
              <td className="p-3 text-slate-400">{r.duration} წთ</td>
              <td className="p-3">
                <span className="flex items-center gap-2">
                  <ReservationStatusBadge status={r.status} />
                  {r.smsSent && (
                    <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-xs text-emerald-400">
                      SMS ✓
                    </span>
                  )}
                </span>
              </td>
              <td className="p-3 text-slate-500 truncate max-w-[120px]">{r.notes ?? '—'}</td>
              <td className="p-3">
                <ReservationStatusActions
                  reservation={r}
                  onConfirm={() => onConfirm(r.id)}
                  onSeat={() => onSeat(r.id)}
                  onComplete={() => onComplete(r.id)}
                  onCancel={() => onCancel(r.id)}
                  onNoShow={() => onNoShow(r.id)}
                  onEdit={() => onEdit(r)}
                  onDelete={() => onDelete(r)}
                  loading={loadingId === r.id}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
