'use client';

import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import type { CartItem as CartItemType } from '@/stores/posStore';

export const CartItem = forwardRef<HTMLDivElement, {
  item: CartItemType;
  index: number;
  onQuantityChange: (index: number, quantity: number) => void;
  onRemove: (index: number) => void;
}>(function CartItem(
  { item, index, onQuantityChange, onRemove },
  ref
) {
  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8 }}
      className="rounded-xl border border-white/10 bg-white/5 p-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-white">{item.menuItemName}</p>
          {item.modifiers.length > 0 && (
            <p className="text-xs text-slate-400 mt-0.5">
              {item.modifiers.map((m) => m.name).join(', ')}
              {item.modifiers.some((m) => m.price !== 0) && (
                <span className="ml-1">
                  (+₾{item.modifiers.reduce((s, m) => s + m.price, 0).toFixed(2)})
                </span>
              )}
            </p>
          )}
          {item.specialInstructions && (
            <p className="text-xs italic text-slate-500 mt-0.5">{item.specialInstructions}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="shrink-0 rounded p-2 text-slate-400 hover:bg-red-500/20 hover:text-red-400 touch-manipulation"
          aria-label="წაშლა"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onQuantityChange(index, item.quantity - 1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white touch-manipulation"
          >
            −
          </button>
          <span className="min-w-[2rem] text-center font-medium text-white">{item.quantity}</span>
          <button
            type="button"
            onClick={() => onQuantityChange(index, item.quantity + 1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white touch-manipulation"
          >
            +
          </button>
        </div>
        <div className="text-right">
          <span className="text-sm text-slate-400">₾{item.unitPrice.toFixed(2)}</span>
          <span className="ml-2 font-semibold text-white">₾{item.totalPrice.toFixed(2)}</span>
        </div>
      </div>
    </motion.div>
  );
});
