'use client';

type BadgeProps = {
  children: React.ReactNode;
  variant?: 'default' | 'orange' | 'green' | 'red' | 'yellow' | 'purple' | 'blue';
  className?: string;
};

const variantClass = {
  default: 'bg-slate-600/80 text-slate-200',
  orange: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
  green: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  red: 'bg-red-500/20 text-red-400 border border-red-500/30',
  yellow: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  purple: 'bg-violet-500/20 text-violet-400 border border-violet-500/30',
  blue: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
};

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${variantClass[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
