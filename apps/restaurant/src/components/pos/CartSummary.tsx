'use client';

import { useState, useCallback } from 'react';
import { usePOSStore } from '@/stores/posStore';
import { ReceiptPrint, type ReceiptPrintData } from './ReceiptPrint';

export function CartSummary({
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
  const getSubtotal = usePOSStore((s) => s.getSubtotal);
  const getTotal = usePOSStore((s) => s.getTotal);
  const getSessionGrandTotal = usePOSStore((s) => s.getSessionGrandTotal);
  const discountAmount = usePOSStore((s) => s.discountAmount);
  const discountType = usePOSStore((s) => s.discountType);
  const setDiscount = usePOSStore((s) => s.setDiscount);
  const items = usePOSStore((s) => s.items);
  const sentItems = usePOSStore((s) => s.sentItems);
  const sessionTotal = usePOSStore((s) => s.sessionTotal);
  const orderNumber = usePOSStore((s) => s.orderNumber);
  const tableLabel = usePOSStore((s) => s.tableLabel);
  const waiterName = usePOSStore((s) => s.waiterName);

  const [preCheckData, setPreCheckData] = useState<ReceiptPrintData | null>(null);

  const handlePreCheck = useCallback(async () => {
    const subtotal = getSubtotal();
    const total = getSessionGrandTotal();
    const discountValue =
      discountType === 'percent' ? (subtotal * discountAmount) / 100 : discountAmount;
    const allItems = [
      ...sentItems.map((s) => ({
        name: s.menuItemName,
        quantity: s.quantity,
        unitPrice: s.unitPrice,
        totalPrice: s.totalPrice,
      })),
      ...items.map((i) => ({
        name: i.menuItemName,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        totalPrice: i.totalPrice,
      })),
    ];
    let restaurantName = '';
    try {
      const res = await fetch('/api/settings/restaurant', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        restaurantName = data.name ?? '';
      }
    } catch {
      /* ignore */
    }
    const data: ReceiptPrintData = {
      restaurantName,
      orderNumber: orderNumber ?? '',
      date: new Date().toLocaleString('ka-GE'),
      tableLabel: tableLabel ?? 'Take Away',
      waiterName: waiterName ?? '',
      items: allItems,
      subtotal,
      discountAmount: discountValue,
      total,
    };
    setPreCheckData(data);
    setTimeout(() => window.print(), 200);
  }, [
    getSubtotal,
    getSessionGrandTotal,
    discountAmount,
    discountType,
    sentItems,
    items,
    orderNumber,
    tableLabel,
    waiterName,
  ]);

  const subtotal = getSubtotal();
  const discount = discountType === 'percent' ? (subtotal * discountAmount) / 100 : discountAmount;
  const grandTotal = getSessionGrandTotal();

  const hasSentItems = sentItems.length > 0;
  const hasNewItems = items.length > 0;

  return (
    <div className="shrink-0 border-t border-white/10 bg-[#0F172A]/60 p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-slate-400">ფასდაკლება</span>
        <input
          type="number"
          min={0}
          step={discountType === 'percent' ? 1 : 0.01}
          value={discountAmount || ''}
          onChange={(e) => setDiscount(Number(e.target.value) || 0, discountType)}
          placeholder={discountType === 'percent' ? '0%' : '0'}
          className="w-20 rounded border border-white/10 bg-white/5 px-2 py-1 text-white text-right"
        />
        <select
          value={discountType}
          onChange={(e) => setDiscount(discountAmount, e.target.value as 'fixed' | 'percent')}
          className="rounded border border-white/10 bg-white/5 px-2 py-1 text-white text-sm"
        >
          <option value="fixed">₾</option>
          <option value="percent">%</option>
        </select>
      </div>

      <div className="space-y-1 text-sm">
        {hasSentItems && (
          <div className="flex justify-between text-emerald-400/80">
            <span>გაგზავნილი</span>
            <span>₾{sessionTotal.toFixed(2)}</span>
          </div>
        )}
        {hasNewItems && (
          <div className="flex justify-between text-slate-400">
            <span>ახალი</span>
            <span>₾{subtotal.toFixed(2)}</span>
          </div>
        )}
        {discount > 0 && (
          <div className="flex justify-between text-slate-400">
            <span>ფასდაკლება</span>
            <span>-₾{discount.toFixed(2)}</span>
          </div>
        )}
      </div>

      <div className="flex justify-between items-baseline text-lg font-bold text-white">
        <span>სულ</span>
        <span>₾{grandTotal.toFixed(2)}</span>
      </div>

      {preCheckData && (
        <div className="sr-only print:not-sr-only" aria-hidden>
          <ReceiptPrint data={preCheckData} showPaymentMethod={false} />
        </div>
      )}

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={onSendToKitchen}
          disabled={items.length === 0 || sending}
          className="w-full rounded-xl bg-emerald-500 py-3 font-semibold text-white hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition touch-manipulation"
        >
          {sending ? 'იგზავნება...' : 'გაგზავნა სამზარეულოში'}
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handlePreCheck}
            disabled={items.length === 0 && sentItems.length === 0}
            className="flex-1 rounded-xl border border-white/20 bg-white/5 py-3 font-semibold text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition touch-manipulation"
          >
            🖨️ პრე-ჩეკი
          </button>
          <button
            type="button"
            onClick={onPayment}
            disabled={!orderId}
            className="flex-1 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 py-3 font-semibold text-white hover:from-orange-600 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition touch-manipulation"
          >
            გადახდა
          </button>
        </div>
      </div>
    </div>
  );
}