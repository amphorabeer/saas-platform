'use client';

import { LucideIcon } from 'lucide-react';

type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-[#1E293B]/60 py-12 px-6 text-center">
      {Icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/5 text-slate-500">
          <Icon className="h-7 w-7" />
        </div>
      )}
      <h3 className="text-base font-medium text-white">{title}</h3>
      {description && <p className="mt-1 text-sm text-slate-400">{description}</p>}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
