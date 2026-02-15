"use client";

import { useState, useEffect } from "react";
import { usePosStore, getPosSubtotal, getPosTotal } from "@/stores/pos-store";
import { PaymentDialog } from "./PaymentDialog";
import { Button } from "@saas-platform/ui";
import { formatCurrency } from "@/lib/format";
import { Minus, Plus, Trash2, CreditCard } from "lucide-react";

interface PrintConfig {
  store: { name: string; address?: string | null; phone?: string | null; taxId?: string | null } | null;
  receiptConfig: { headerText?: string | null; footerText?: string | null; showTaxId?: boolean; showBarcode?: boolean; paperWidth?: number } | null;
  printerConfig: { connectionType: "USB" | "SERIAL" | "NETWORK"; ip?: string; port?: number } | null;
}

interface CartPanelProps {
  storeId: string;
  customers?: { id: string; firstName: string; lastName?: string | null; phone?: string | null; loyaltyPoints?: number }[];
  loyaltyConfig?: { redemptionRate: number; minRedemptionPoints: number } | null;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  barcodeInputRef: React.RefObject<HTMLInputElement | null>;
  printConfig?: PrintConfig;
}

export function CartPanel({ storeId, customers = [], loyaltyConfig, searchInputRef, barcodeInputRef, printConfig }: CartPanelProps) {
  const [showPayment, setShowPayment] = useState(false);
  const {
    items,
    customer,
    discount,
    discountType,
    updateQuantity,
    removeItem,
    setDiscount,
    setCustomer,
  } = usePosStore();

  const subtotal = getPosSubtotal(items);
  const total = getPosTotal(items, discount, discountType);

  useEffect(() => {
    const onPay = () => {
      if (items.length > 0) setShowPayment(true);
    };
    const onCancel = () => setShowPayment(false);
    document.addEventListener("pos-payment", onPay);
    document.addEventListener("pos-cancel", onCancel);
    return () => {
      document.removeEventListener("pos-payment", onPay);
      document.removeEventListener("pos-cancel", onCancel);
    };
  }, [items.length]);

  return (
    <>
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-border shrink-0 space-y-2">
          <h2 className="text-lg font-semibold text-text-primary">კალათა</h2>
          {customers.length > 0 && (
            <div className="flex items-center gap-2">
              <select
                value={customer?.id ?? ""}
                onChange={(e) => {
                  const id = e.target.value;
                  const c = customers.find((x) => x.id === id);
                  setCustomer(c ? { id: c.id, firstName: c.firstName, lastName: c.lastName, phone: c.phone, loyaltyPoints: c.loyaltyPoints } : null);
                }}
                className="flex-1 rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-sm"
              >
                <option value="">მომხმარებელი (არასავალდებულო)</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.firstName} {c.lastName ?? ""} {c.loyaltyPoints ? `• ${c.loyaltyPoints} ქულა` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
          {items.length === 0 ? (
            <p className="text-text-muted text-center py-8">კალათა ცარიელია</p>
          ) : (
            items.map((item) => (
              <div
                key={item.productId}
                className="flex items-center gap-3 p-3 rounded-lg bg-bg-tertiary"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {item.nameKa || item.productName}
                  </p>
                  <p className="text-xs text-text-muted" suppressHydrationWarning>
                    {formatCurrency(item.unitPrice)} × {item.quantity}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() =>
                      updateQuantity(item.productId, item.quantity - 1)
                    }
                    className="p-1.5 rounded-lg hover:bg-bg-secondary text-text-muted hover:text-text-primary"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-8 text-center font-medium">{item.quantity}</span>
                  <button
                    onClick={() =>
                      updateQuantity(item.productId, item.quantity + 1)
                    }
                    className="p-1.5 rounded-lg hover:bg-bg-secondary text-text-muted hover:text-text-primary"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <button
                  onClick={() => removeItem(item.productId)}
                  className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-border space-y-3 shrink-0">
          <div className="flex gap-2">
            <button
              onClick={() => setDiscount(5, "DISCOUNT_PERCENTAGE")}
              className="flex-1 py-2 rounded-lg border border-border bg-bg-tertiary text-sm hover:bg-bg-tertiary/80"
            >
              5%
            </button>
            <button
              onClick={() => setDiscount(10, "DISCOUNT_PERCENTAGE")}
              className="flex-1 py-2 rounded-lg border border-border bg-bg-tertiary text-sm hover:bg-bg-tertiary/80"
            >
              10%
            </button>
            <button
              onClick={() => setDiscount(0, null)}
              className="flex-1 py-2 rounded-lg border border-border bg-bg-tertiary text-sm hover:bg-bg-tertiary/80"
            >
              უცვლელი
            </button>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-sm" suppressHydrationWarning>
              <span className="text-text-muted">წინასწარი ჯამი:</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-sm text-amber-400" suppressHydrationWarning>
                <span>ფასდაკლება:</span>
                <span>
                  {discountType === "DISCOUNT_PERCENTAGE"
                    ? `${discount}%`
                    : `-${formatCurrency(discount)}`}
                </span>
              </div>
            )}
            <div className="flex justify-between text-lg font-semibold pt-2 border-t border-border" suppressHydrationWarning>
              <span>ჯამი:</span>
              <span className="text-copper-light">
                {formatCurrency(total)}
              </span>
            </div>
          </div>
          <Button
            className="w-full py-4 text-lg"
            onClick={() => items.length > 0 && setShowPayment(true)}
            disabled={items.length === 0}
          >
            <CreditCard className="h-5 w-5 mr-2" />
            გადახდა (F10)
          </Button>
        </div>
      </div>

      {showPayment && (
        <PaymentDialog
          storeId={storeId}
          total={total}
          customer={customer}
          loyaltyConfig={loyaltyConfig}
          onClose={() => setShowPayment(false)}
          onSuccess={() => setShowPayment(false)}
          printConfig={printConfig}
        />
      )}
    </>
  );
}
