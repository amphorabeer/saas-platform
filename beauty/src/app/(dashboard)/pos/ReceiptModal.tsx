'use client';

import { X, Check, Receipt, Printer } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface SaleRecord {
  id: string;
  total: number;
  subtotal: number;
  discount: number;
  paymentMethod: string;
  receiptNumber: string | null;
  createdAt: string;
  clientName: string | null;
  staffName: string | null;
  items: { name: string; quantity: number; unitPrice: number; total: number }[];
}

const paymentLabels: Record<string, string> = {
  CASH: 'ნაღდი',
  CARD: 'ბარათი',
  TRANSFER: 'გადარიცხვა',
  SPLIT: 'გაყოფილი',
  GIFT_CARD: 'სასაჩუქრე',
};

export function ReceiptModal({
  sale,
  onClose,
}: {
  sale: SaleRecord;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-dark-800 border border-dark-700 rounded-2xl w-full max-w-sm mx-4 overflow-hidden">
        {/* Success Header */}
        <div className="bg-emerald-500/10 px-6 py-6 text-center">
          <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <Check size={32} className="text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-white">გადახდა წარმატებულია!</h2>
          <p className="text-emerald-400 text-2xl font-bold mt-2">
            {formatCurrency(sale.total)}
          </p>
        </div>

        {/* Receipt Details */}
        <div className="px-6 py-4 space-y-3">
          {sale.receiptNumber && (
            <div className="text-center text-sm text-dark-400">
              ქვითარი #{sale.receiptNumber}
            </div>
          )}

          <div className="space-y-2">
            {sale.items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-dark-300">
                  {item.name} × {item.quantity}
                </span>
                <span className="text-dark-200">{formatCurrency(item.total)}</span>
              </div>
            ))}
          </div>

          {sale.discount > 0 && (
            <div className="flex justify-between text-sm text-amber-400 pt-2 border-t border-dark-700">
              <span>ფასდაკლება</span>
              <span>-{formatCurrency(sale.discount)}</span>
            </div>
          )}

          <div className="flex justify-between font-medium pt-2 border-t border-dark-700">
            <span className="text-white">სულ</span>
            <span className="text-emerald-400">{formatCurrency(sale.total)}</span>
          </div>

          <div className="text-xs text-dark-400 space-y-1 pt-2">
            <div className="flex justify-between">
              <span>გადახდა</span>
              <span>{paymentLabels[sale.paymentMethod] || sale.paymentMethod}</span>
            </div>
            {sale.clientName && (
              <div className="flex justify-between">
                <span>კლიენტი</span>
                <span>{sale.clientName}</span>
              </div>
            )}
            {sale.staffName && (
              <div className="flex justify-between">
                <span>სპეციალისტი</span>
                <span>{sale.staffName}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>თარიღი</span>
              <span>
                {new Date(sale.createdAt).toLocaleString('ka-GE', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onClose}
            className="btn-primary flex-1 py-2.5 flex items-center justify-center gap-2"
          >
            <Receipt size={16} />
            ახალი გაყიდვა
          </button>
        </div>
      </div>
    </div>
  );
}
