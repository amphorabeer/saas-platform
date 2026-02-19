'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { CartItem } from './CartItem';
import { CartSummary } from './CartSummary';
import { usePOSStore } from '@/stores/posStore';

export function CartPanel({
  onSendToKitchen,
  onPayment,
  orderId,
  sending,
}: {
  onSendToKitchen: () => void;
  onPayment: () => void;
  orderId: string | null;
  sending: boolean;
}) {
  const items = usePOSStore((s) => s.items);
  const sentItems = usePOSStore((s) => s.sentItems);
  const updateItemQuantity = usePOSStore((s) => s.updateItemQuantity);
  const removeItem = usePOSStore((s) => s.removeItem);
  const clearCart = usePOSStore((s) => s.clearCart);

  const hasSentItems = sentItems.length > 0;
  const hasNewItems = items.length > 0;

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h2 className="font-semibold text-white">
          შეკვეთა
          {(items.length > 0 || sentItems.length > 0) && (
            <span className="ml-2 text-slate-400 font-normal">
              ({sentItems.length + items.length})
            </span>
          )}
        </h2>
        {items.length > 0 && (
          <button
            type="button"
            onClick={clearCart}
            className="text-sm text-slate-400 hover:text-red-400 transition"
          >
            გასუფთავება
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-3">
        {/* Sent items - already in kitchen */}
        {hasSentItems && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-emerald-400 uppercase tracking-wider">
              სამზარეულოში გაგზავნილი
            </p>
            {sentItems.map((item, i) => {
              const status = (item.status ?? 'CONFIRMED').toUpperCase();
              const statusStyle =
                status === 'SERVED'
                  ? 'border-slate-500/30 bg-slate-500/10'
                  : status === 'READY'
                    ? 'border-emerald-500/50 bg-emerald-500/20'
                    : status === 'PREPARING'
                      ? 'border-amber-500/40 bg-amber-500/10'
                      : 'border-red-500/30 bg-red-500/10';
              const statusLabel =
                status === 'SERVED'
                  ? '✅ გაცემული'
                  : status === 'READY'
                    ? '🟢 მზადაა!'
                    : status === 'PREPARING'
                      ? '🟡 მზადდება'
                      : '🔴 ახალი';
              return (
                <div
                  key={`sent-${i}`}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 ${statusStyle}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{item.menuItemName}</p>
                    <p className="text-xs text-slate-400">
                      {item.quantity} × ₾{item.unitPrice.toFixed(2)}
                      <span className="ml-2 font-medium opacity-90">{statusLabel}</span>
                    </p>
                  </div>
                  <span className="text-sm font-medium text-white shrink-0 ml-2">
                    ₾{item.totalPrice.toFixed(2)}
                  </span>
                </div>
              );
            })}
            {hasNewItems && (
              <div className="border-t border-white/10 my-2" />
            )}
          </div>
        )}

        {/* New items in cart */}
        {hasNewItems && hasSentItems && (
          <p className="text-xs font-medium text-orange-400 uppercase tracking-wider">
            ახალი პოზიციები
          </p>
        )}

        <AnimatePresence mode="popLayout">
          {!hasNewItems && !hasSentItems ? (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-8 text-center text-slate-500"
            >
              აირჩიეთ კერძი მენიუდან
            </motion.p>
          ) : (
            items.map((item, index) => (
              <CartItem
                key={`${item.menuItemId}-${index}-${item.specialInstructions}`}
                item={item}
                index={index}
                onQuantityChange={updateItemQuantity}
                onRemove={removeItem}
              />
            ))
          )}
        </AnimatePresence>
      </div>

      <CartSummary
        onSendToKitchen={onSendToKitchen}
        onPayment={onPayment}
        orderId={orderId}
        sending={sending}
      />
    </div>
  );
}