'use client';

import { motion } from 'framer-motion';
import { LucideIcon, Settings } from 'lucide-react';

type Status = 'coming_soon' | 'active';

type Props = {
  icon: LucideIcon;
  name: string;
  description: string;
  status: Status;
};

const statusConfig: Record<Status, { label: string; className: string }> = {
  coming_soon: { label: 'მალე', className: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
  active: { label: 'აქტიური', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
};

export function IntegrationCard({ icon: Icon, name, description, status }: Props) {
  const { label, className } = statusConfig[status];
  const isDisabled = status === 'coming_soon';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-4 rounded-2xl border border-white/10 bg-[#1E293B]/60 p-5 backdrop-blur-sm"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/5 border border-white/10 text-orange-400">
        <Icon className="h-6 w-6" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="font-semibold text-white">{name}</h4>
          <span
            className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${className}`}
          >
            {label}
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-400">{description}</p>
        <button
          type="button"
          disabled={isDisabled}
          className="mt-3 flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-400 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Settings className="h-4 w-4" />
          კონფიგურაცია
        </button>
      </div>
    </motion.div>
  );
}
