'use client';

export type DateRangePreset = 'today' | 'yesterday' | 'week' | 'month' | 'custom';

export function DateRangePicker({
  preset,
  onPresetChange,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
}: {
  preset: DateRangePreset;
  onPresetChange: (p: DateRangePreset) => void;
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (d: string) => void;
  onDateToChange: (d: string) => void;
}) {
  const presets: { id: DateRangePreset; label: string }[] = [
    { id: 'today', label: 'დღეს' },
    { id: 'yesterday', label: 'გუშინ' },
    { id: 'week', label: 'ეს კვირა' },
    { id: 'month', label: 'ეს თვე' },
    { id: 'custom', label: 'პერიოდი' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-3">
      {presets.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onPresetChange(p.id)}
          className={`rounded-lg px-3 py-2 text-sm font-medium ${
            preset === p.id ? 'bg-orange-500/30 text-orange-300' : 'bg-white/5 text-slate-400 hover:bg-white/10'
          }`}
        >
          {p.label}
        </button>
      ))}
      {preset === 'custom' && (
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
