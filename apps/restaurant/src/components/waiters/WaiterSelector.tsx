'use client';

const WAITER_COLORS = [
  'bg-blue-500/30 border-blue-500/50',
  'bg-violet-500/30 border-violet-500/50',
  'bg-emerald-500/30 border-emerald-500/50',
  'bg-amber-500/30 border-amber-500/50',
  'bg-cyan-500/30 border-cyan-500/50',
  'bg-pink-500/30 border-pink-500/50',
];

export type WaiterOption = {
  id: string;
  name: string;
  role: string;
  assignmentsCount: number;
};

export function WaiterSelector({
  waiters,
  selectedId,
  onSelect,
}: {
  waiters: WaiterOption[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-slate-400">აირჩიე ოფიციანტი</p>
      <div className="flex flex-col gap-2">
        {waiters.map((w, i) => {
          const isSelected = selectedId === w.id;
          const color = WAITER_COLORS[i % WAITER_COLORS.length];
          return (
            <button
              key={w.id}
              type="button"
              onClick={() => onSelect(isSelected ? null : w.id)}
              className={`flex items-center justify-between rounded-xl border p-3 text-left transition min-h-[48px] ${
                isSelected ? `${color} border-current` : 'border-white/10 bg-white/5 hover:bg-white/10'
              }`}
            >
              <span className="font-medium text-white">{w.name}</span>
              <span className="text-xs text-slate-400">მაგიდა: {w.assignmentsCount}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
