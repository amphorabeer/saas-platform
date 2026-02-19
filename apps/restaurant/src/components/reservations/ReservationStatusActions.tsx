'use client';

import Link from 'next/link';
import { Check, Armchair, CircleCheck, X, UserX, Pencil, Trash2 } from 'lucide-react';

export type ReservationRow = {
  id: string;
  status: string;
  tableId: string | null;
  table?: { number: string } | null;
};

export function ReservationStatusActions({
  reservation,
  onConfirm,
  onSeat,
  onComplete,
  onCancel,
  onNoShow,
  onEdit,
  onDelete,
  loading,
}: {
  reservation: ReservationRow;
  onConfirm: () => void;
  onSeat: () => void;
  onComplete: () => void;
  onCancel: () => void;
  onNoShow: () => void;
  onEdit: () => void;
  onDelete: () => void;
  loading?: boolean;
}) {
  const s = reservation.status;

  return (
    <div className="flex flex-wrap items-center gap-1">
      {s === 'PENDING' && (
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className="rounded p-1.5 text-blue-400 hover:bg-blue-500/20"
          title="დადასტურება"
        >
          <Check className="h-4 w-4" />
        </button>
      )}
      {s === 'CONFIRMED' && (
        <button
          type="button"
          onClick={onSeat}
          disabled={loading}
          className="rounded p-1.5 text-emerald-400 hover:bg-emerald-500/20"
          title="დასხედა"
        >
          <Armchair className="h-4 w-4" />
        </button>
      )}
      {s === 'SEATED' && (
        <>
          <Link
            href={reservation.tableId ? `/pos?tableId=${reservation.tableId}` : '/pos'}
            className="rounded p-1.5 text-orange-400 hover:bg-orange-500/20"
            title="POS-ში გადასვლა"
          >
            POS
          </Link>
          <button
            type="button"
            onClick={onComplete}
            disabled={loading}
            className="rounded p-1.5 text-slate-400 hover:bg-slate-500/20"
            title="დასრულება"
          >
            <CircleCheck className="h-4 w-4" />
          </button>
        </>
      )}
      {(s === 'PENDING' || s === 'CONFIRMED') && (
        <>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded p-1.5 text-red-400 hover:bg-red-500/20"
            title="გაუქმება"
          >
            <X className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onNoShow}
            disabled={loading}
            className="rounded p-1.5 text-red-400 hover:bg-red-500/20"
            title="არ მოვიდა"
          >
            <UserX className="h-4 w-4" />
          </button>
        </>
      )}
      <button
        type="button"
        onClick={onEdit}
        className="rounded p-1.5 text-slate-400 hover:bg-white/10"
        title="რედაქტირება"
      >
        <Pencil className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="rounded p-1.5 text-slate-400 hover:bg-red-500/20 hover:text-red-400"
        title="წაშლა"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
