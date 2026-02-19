'use client';

/** Food cost %: <25% green, 25-35% yellow, >35% red */
export function FoodCostBadge({ percent }: { percent: number }) {
  const p = Math.round(percent * 10) / 10;
  const style =
    p < 25
      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
      : p <= 35
        ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
        : 'bg-red-500/20 text-red-400 border-red-500/40';
  const emoji = p < 25 ? '🟢' : p <= 35 ? '🟡' : '🔴';
  return (
    <span className={`rounded-lg border px-2 py-0.5 text-xs font-medium ${style}`}>
      {p}% {emoji}
    </span>
  );
}
