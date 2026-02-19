'use client';

import { motion } from 'framer-motion';
import { UtensilsCrossed } from 'lucide-react';

export type FavoriteItemRow = {
  name: string;
  count: number;
  total: number;
};

type FavoriteItemsProps = {
  items: FavoriteItemRow[];
  currency?: string;
};

export function FavoriteItems({ items, currency = '₾' }: FavoriteItemsProps) {
  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-white/10 bg-white/5 p-4 text-center text-sm text-slate-400">
        ფავორიტი კერძების მონაცემები არ არის
      </p>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-xl border border-white/10 bg-[#1E293B]/40"
    >
      <div className="border-b border-white/10 bg-white/5 px-4 py-3">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-white">
          <UtensilsCrossed className="h-4 w-4 text-orange-400" />
          ფავორიტი კერძები (Top 5)
        </h4>
      </div>
      <ul className="divide-y divide-white/5">
        {items.map((item, i) => (
          <li
            key={item.name}
            className="flex items-center justify-between px-4 py-3 text-sm"
          >
            <span className="flex items-center gap-2 text-white">
              <span className="flex h-6 w-6 items-center justify-center rounded bg-orange-500/20 text-xs font-medium text-orange-400">
                {i + 1}
              </span>
              {item.name}
            </span>
            <span className="text-slate-400">
              {item.count} ც. · {item.total.toFixed(2)}
              {currency}
            </span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}
