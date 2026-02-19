'use client';

import {
  UtensilsCrossed,
  Grid3X3,
  ShoppingCart,
  ChefHat,
  Users,
  Warehouse,
  Package,
  Receipt,
  UserCircle,
  BarChart3,
  CalendarClock,
  MessageSquareText,
  Settings,
  LucideIcon,
} from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  UtensilsCrossed,
  Grid3X3,
  ShoppingCart,
  ChefHat,
  Users,
  Warehouse,
  Package,
  Receipt,
  UserCircle,
  BarChart3,
  CalendarClock,
  MessageSquareText,
  Settings,
};

export function PlaceholderPage({
  iconName,
  title,
  phase,
}: {
  iconName: keyof typeof iconMap;
  title: string;
  phase: string;
}) {
  const Icon = iconMap[iconName] ?? UtensilsCrossed;
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="glass rounded-2xl border border-white/10 p-12 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-500 text-white">
          <Icon className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-semibold text-white">{title}</h2>
        {phase && <p className="mt-2 text-sm text-slate-400">{phase}</p>}
      </div>
    </div>
  );
}
