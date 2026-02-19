'use client';

import { usePOSStore, OrderType } from '@/stores/posStore';
import { motion } from 'framer-motion';

const types: { value: OrderType; label: string; icon: string }[] = [
  { value: 'DINE_IN', label: 'Dine In', icon: '🍽️' },
  { value: 'TAKEAWAY', label: 'Take Away', icon: '🥡' },
  { value: 'DELIVERY', label: 'Delivery', icon: '🛵' },
];

export function OrderTypeSelector() {
  const orderType = usePOSStore((s) => s.orderType);
  const setOrderType = usePOSStore((s) => s.setOrderType);
  const setTable = usePOSStore((s) => s.setTable);

  const handleSelect = (t: OrderType) => {
    setOrderType(t);
    if (t !== 'DINE_IN') {
      setTable(null, null, null);
    }
  };

  return (
    <div className="flex rounded-xl bg-white/5 p-1">
      {types.map((t) => {
        const isActive = orderType === t.value;
        return (
          <button
            key={t.value}
            type="button"
            onClick={() => handleSelect(t.value)}
            className={`relative rounded-lg px-4 py-2 text-sm font-medium transition touch-manipulation min-w-[100px] ${
              isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {isActive && (
              <motion.span
                layoutId="order-type-bg"
                className="absolute inset-0 rounded-lg bg-orange-500/30 border border-orange-500/40"
                transition={{ type: 'spring', duration: 0.3 }}
              />
            )}
            <span className="relative flex items-center justify-center gap-2">
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
