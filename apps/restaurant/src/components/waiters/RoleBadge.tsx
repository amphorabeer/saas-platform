'use client';

const ROLE_STYLE: Record<string, string> = {
  RESTAURANT_OWNER: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
  MANAGER: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
  WAITER: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
  BARTENDER: 'bg-violet-500/20 text-violet-400 border-violet-500/40',
  CHEF: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
  HOST: 'bg-pink-500/20 text-pink-400 border-pink-500/40',
  CASHIER: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40',
};

const ROLE_LABEL: Record<string, string> = {
  RESTAURANT_OWNER: 'მეპატრონე',
  MANAGER: 'მენეჯერი',
  WAITER: 'ოფიციანტი',
  BARTENDER: 'ბარმენი',
  CHEF: 'მზარეული',
  HOST: 'ჰოსტი',
  CASHIER: 'კასირი',
};

export function RoleBadge({ role }: { role: string }) {
  const style = ROLE_STYLE[role] ?? 'bg-slate-500/20 text-slate-400 border-slate-500/40';
  const label = ROLE_LABEL[role] ?? role;
  return (
    <span className={`inline-flex rounded-lg border px-2 py-0.5 text-xs font-medium ${style}`}>
      {label}
    </span>
  );
}
