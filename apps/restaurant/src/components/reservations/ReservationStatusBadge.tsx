'use client';

const STYLE: Record<string, string> = {
  PENDING: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
  CONFIRMED: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
  SEATED: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
  COMPLETED: 'bg-slate-500/20 text-slate-400 border-slate-500/40',
  CANCELLED: 'bg-red-500/20 text-red-400 border-red-500/40',
  NO_SHOW: 'bg-red-500/20 text-red-400 border-red-500/40 border-dashed',
};

const LABEL: Record<string, string> = {
  PENDING: 'მოლოდინი',
  CONFIRMED: 'დადასტურებული',
  SEATED: 'დასხედა',
  COMPLETED: 'დასრულებული',
  CANCELLED: 'გაუქმებული',
  NO_SHOW: 'არ მოვიდა',
};

export function ReservationStatusBadge({ status }: { status: string }) {
  const style = STYLE[status] || 'bg-slate-500/20 text-slate-400';
  const label = LABEL[status] || status;
  return (
    <span className={`rounded-lg border px-2 py-0.5 text-xs font-medium ${style}`}>
      {label}
    </span>
  );
}
