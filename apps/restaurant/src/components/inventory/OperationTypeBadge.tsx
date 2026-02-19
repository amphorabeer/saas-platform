'use client';

const TYPE_STYLE: Record<string, string> = {
  INCOMING: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
  WRITE_OFF: 'bg-red-500/20 text-red-400 border-red-500/40',
  ADJUSTMENT: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
  TRANSFER: 'bg-slate-500/20 text-slate-400 border-slate-500/40',
  AUTO_DEDUCTION: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
};

const TYPE_LABEL: Record<string, string> = {
  INCOMING: 'შემოსვლა',
  WRITE_OFF: 'ჩამოწერა',
  ADJUSTMENT: 'კორექტირება',
  TRANSFER: 'გადაცემა',
  AUTO_DEDUCTION: 'ავტო-ჩამოჭრა',
};

export function OperationTypeBadge({ type }: { type: string }) {
  const style = TYPE_STYLE[type] || 'bg-slate-500/20 text-slate-400';
  const label = TYPE_LABEL[type] || type;
  return (
    <span className={`rounded-lg border px-2 py-0.5 text-xs font-medium ${style}`}>
      {label}
    </span>
  );
}
