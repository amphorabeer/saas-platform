'use client';

import { LucideIcon } from 'lucide-react';

export function KPICard({
  label,
  value,
  subValue,
  icon: Icon,
  gradient,
}: {
  label: string;
  value: string | number;
  subValue?: string;
  icon: LucideIcon;
  gradient: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#1E293B]/80 p-4 backdrop-blur-sm">
      <div className={`mb-2 inline-flex rounded-lg bg-gradient-to-br ${gradient} p-2 text-white`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-bold text-white">{value}</p>
      {subValue && <p className="mt-0.5 text-xs text-slate-500">{subValue}</p>}
    </div>
  );
}
