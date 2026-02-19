'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { Pencil, Trash2, User, Clock, Receipt } from 'lucide-react';
import { TableStatusBadge } from './TableStatusBadge';
import type { TableRow } from './TableForm';

const STATUS_OPTIONS = [
  { value: 'FREE', label: 'თავისუფალი' },
  { value: 'OCCUPIED', label: 'დაკავებული' },
  { value: 'RESERVED', label: 'რეზერვირებული' },
  { value: 'CLEANING', label: 'გაწმენდა' },
  { value: 'BILLING', label: 'გადახდა' },
];

export type TableWithSession = TableRow & {
  activeSession?: {
    id: string;
    startedAt: string;
    waiterName?: string;
    totalAmount?: number;
  } | null;
};

type TablePopoverProps = {
  table: TableWithSession;
  anchor: { x: number; y: number };
  onClose: () => void;
  onStatusChange: (tableId: string, status: string) => void;
  onStartSession: (table: TableWithSession) => void;
  onCloseSession: (sessionId: string) => void;
  onEdit: (table: TableWithSession) => void;
  onDelete: (table: TableWithSession) => void;
};

function elapsed(startedAt: string): string {
  const start = new Date(startedAt).getTime();
  const now = Date.now();
  const min = Math.floor((now - start) / 60000);
  if (min < 60) return `${min} წთ`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}ს ${m}წთ` : `${h}ს`;
}

export function TablePopover({
  table,
  anchor,
  onClose,
  onStatusChange,
  onStartSession,
  onCloseSession,
  onEdit,
  onDelete,
}: TablePopoverProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const handleEscape = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const session = table.activeSession;
  const isFree = table.status === 'FREE';
  const isOccupied = table.status === 'OCCUPIED';

  return (
    <div
      ref={ref}
      className="fixed z-50 min-w-[280px] rounded-xl border border-white/10 bg-[#1E293B] py-3 px-4 shadow-xl backdrop-blur-xl"
      style={{ left: anchor.x, top: anchor.y }}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="font-semibold text-white">{table.number}</span>
        <TableStatusBadge status={table.status} />
      </div>
      {table.label && (
        <p className="text-sm text-slate-400">{table.label}</p>
      )}
      <p className="text-xs text-slate-500">{table.seats} ადგილი</p>

      {session && (
        <div className="mt-2 space-y-1 border-t border-white/10 pt-2">
          {session.waiterName && (
            <p className="flex items-center gap-2 text-sm text-slate-300">
              <User className="h-4 w-4" /> {session.waiterName}
            </p>
          )}
          <p className="flex items-center gap-2 text-sm text-slate-300">
            <Clock className="h-4 w-4" /> {elapsed(session.startedAt)}
          </p>
          {session.totalAmount != null && session.totalAmount > 0 && (
            <p className="flex items-center gap-2 text-sm text-orange-400">
              <Receipt className="h-4 w-4" /> ₾ {session.totalAmount.toFixed(2)}
            </p>
          )}
        </div>
      )}

      <div className="mt-3 space-y-1 border-t border-white/10 pt-2">
        <label className="block text-xs text-slate-500">სტატუსის შეცვლა</label>
        <select
          value={table.status}
          onChange={(e) => onStatusChange(table.id, e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-orange-500/50 focus:outline-none"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {isFree && (
        <button
          type="button"
          onClick={() => onStartSession(table)}
          className="mt-2 w-full rounded-lg bg-emerald-500/20 py-2 text-sm font-medium text-emerald-400 hover:bg-emerald-500/30"
        >
          სესიის დაწყება
        </button>
      )}
      {isOccupied && session && (
        <div className="mt-2 flex gap-2">
          <Link
            href={`/pos?tableId=${table.id}`}
            className="flex-1 rounded-lg bg-orange-500/20 py-2 text-center text-sm font-medium text-orange-400 hover:bg-orange-500/30"
          >
            შეკვეთა
          </Link>
          <button
            type="button"
            onClick={() => onCloseSession(session.id)}
            className="rounded-lg bg-slate-500/20 py-2 px-3 text-sm text-slate-300 hover:bg-slate-500/30"
          >
            სესიის დახურვა
          </button>
        </div>
      )}

      <div className="mt-2 flex gap-2 border-t border-white/10 pt-2">
        <button
          type="button"
          onClick={() => onEdit(table)}
          className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-white/10 py-2 text-sm text-slate-300 hover:bg-white/10"
        >
          <Pencil className="h-4 w-4" /> რედაქტირება
        </button>
        <button
          type="button"
          onClick={() => onDelete(table)}
          className="rounded-lg border border-red-500/30 py-2 px-3 text-sm text-red-400 hover:bg-red-500/20"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
