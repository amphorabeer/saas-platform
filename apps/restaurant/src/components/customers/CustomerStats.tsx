'use client';

import { motion } from 'framer-motion';
import { ShoppingBag, Wallet, Receipt, Star } from 'lucide-react';

type CustomerStatsProps = {
  orderCount: number;
  totalSpent: number;
  avgCheck: number;
  favoriteItem: string | null;
  currency?: string;
};

const cardClass =
  'rounded-xl border border-white/10 bg-white/5 p-4 text-center backdrop-blur-sm';

export function CustomerStats({
  orderCount,
  totalSpent,
  avgCheck,
  favoriteItem,
  currency = '₾',
}: CustomerStatsProps) {
  const cards = [
    { icon: ShoppingBag, label: 'შეკვეთები', value: String(orderCount) },
    { icon: Wallet, label: 'ჯამური დახარჯვა', value: `${totalSpent.toFixed(2)}${currency}` },
    { icon: Receipt, label: 'საშუალო ჩეკი', value: `${avgCheck.toFixed(2)}${currency}` },
    { icon: Star, label: 'ფავორიტი', value: favoriteItem || '—' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map(({ icon: Icon, label, value }, i) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className={cardClass}
        >
          <Icon className="mx-auto mb-2 h-6 w-6 text-orange-400/80" />
          <p className="text-xs text-slate-400">{label}</p>
          <p className="mt-1 truncate text-sm font-medium text-white" title={value}>
            {value}
          </p>
        </motion.div>
      ))}
    </div>
  );
}
