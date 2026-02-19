'use client';

export type Period = 'today' | 'week' | 'month' | 'custom';

export function TipsDateFilter({
  period,
  onPeriodChange,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
}: {
  period: Period;
  onPeriodChange: (p: Period) => void;
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (d: string) => void;
  onDateToChange: (d: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-sm text-slate-400">პერიოდი:</span>
      {(['today', 'week', 'month', 'custom'] as const).map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onPeriodChange(p)}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            period === p ? 'bg-orange-500/30 text-orange-300' : 'bg-white/5 text-slate-400 hover:bg-white/10'
          }`}
        >
          {p === 'today' ? 'დღეს' : p === 'week' ? 'ეს კვირა' : p === 'month' ? 'ეს თვე' : 'პერიოდი'}
        </button>
      ))}
      {period === 'custom' && (
        <>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
          />
          <span className="text-slate-500">—</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
          />
        </>
      )}
    </div>
  );
}
