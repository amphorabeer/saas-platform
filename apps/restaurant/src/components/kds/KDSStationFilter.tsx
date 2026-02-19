'use client';

import { motion } from 'framer-motion';

export type KDSStationType = 'ALL' | 'HOT' | 'COLD' | 'BAR' | 'PIZZA' | 'GRILL' | 'PASTRY';

const STATIONS: { value: KDSStationType; label: string; icon: string }[] = [
  { value: 'ALL', label: 'ყველა', icon: '📋' },
  { value: 'HOT', label: 'HOT', icon: '🔥' },
  { value: 'COLD', label: 'COLD', icon: '❄️' },
  { value: 'BAR', label: 'BAR', icon: '🍸' },
  { value: 'PIZZA', label: 'PIZZA', icon: '🍕' },
  { value: 'GRILL', label: 'GRILL', icon: '🥩' },
  { value: 'PASTRY', label: 'PASTRY', icon: '🧁' },
];

export function KDSStationFilter({
  value,
  onChange,
}: {
  value: KDSStationType;
  onChange: (v: KDSStationType) => void;
}) {
  return (
    <div className="flex gap-1 overflow-x-auto rounded-xl bg-white/5 p-1">
      {STATIONS.map((s) => {
        const isActive = value === s.value;
        return (
          <button
            key={s.value}
            type="button"
            onClick={() => onChange(s.value)}
            className={`relative shrink-0 rounded-lg px-4 py-2.5 text-sm font-medium transition touch-manipulation min-h-[48px] ${
              isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {isActive && (
              <motion.span
                layoutId="kds-station-bg"
                className="absolute inset-0 rounded-lg bg-orange-500/30 border border-orange-500/40"
                transition={{ type: 'spring', duration: 0.3 }}
              />
            )}
            <span className="relative flex items-center gap-2">
              <span>{s.icon}</span>
              <span>{s.label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
