"use client";

import { useState } from "react";
import { usePosStore, getPosSubtotal } from "@/stores/pos-store";
import { createSale } from "@/lib/store-actions";
import { offlineDb } from "@/lib/offline/db";
import { printPosReceipt } from "@/lib/hardware/pos-print";
import { Button } from "@saas-platform/ui";
import { formatCurrency } from "@/lib/format";
import { X } from "lucide-react";

interface PrintConfig {
  store: { name: string; address?: string | null; phone?: string | null; taxId?: string | null } | null;
  receiptConfig: { headerText?: string | null; footerText?: string | null; showTaxId?: boolean; showBarcode?: boolean; paperWidth?: number } | null;
  printerConfig: { connectionType: "USB" | "SERIAL" | "NETWORK"; ip?: string; port?: number } | null;
}

interface PaymentDialogProps {
  storeId: string;
  total: number;
  customer?: { id: string; loyaltyPoints?: number } | null;
  loyaltyConfig?: { redemptionRate: number; minRedemptionPoints: number } | null;
  onClose: () => void;
  onSuccess: () => void;
  printConfig?: PrintConfig;
}

type PayMethod = "CASH" | "CARD" | "SPLIT";

const KEYPAD = ["7", "8", "9", "4", "5", "6", "1", "2", "3", ".", "0", "⌫"];

export function PaymentDialog({ storeId, total, customer: custProp, loyaltyConfig, onClose, onSuccess, printConfig }: PaymentDialogProps) {
  const { items, customer: storeCustomer, discount, discountType, clearCart } = usePosStore();
  const cust = custProp ?? storeCustomer;
  const [activeMethod, setActiveMethod] = useState<PayMethod>("CASH");
  const [cashReceived, setCashReceived] = useState("");
  const [splitCash, setSplitCash] = useState("");
  const [splitCard, setSplitCard] = useState("");
  const [cardReference, setCardReference] = useState("");
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const pointsValue = loyaltyConfig && cust?.loyaltyPoints && pointsToRedeem > 0
    ? Math.min(pointsToRedeem, cust.loyaltyPoints) / loyaltyConfig.redemptionRate
    : 0;
  const totalAfterPoints = Math.max(0, total - pointsValue);
  const cashAmt = parseFloat(cashReceived) || 0;
  const change = Math.max(0, cashAmt - totalAfterPoints);

  const handleKeypad = (key: string) => {
    if (activeMethod === "SPLIT") return;
    if (activeMethod !== "CASH") return;
    if (key === "⌫") {
      setCashReceived((s) => s.slice(0, -1));
      return;
    }
    if (key === ".") {
      if (!cashReceived.includes(".")) setCashReceived((s) => s + ".");
      return;
    }
    setCashReceived((s) => s + key);
  };

  const handleComplete = async () => {
    setError("");
    const payments: { method: "CASH" | "CARD"; amount: number; reference?: string }[] = [];

    if (activeMethod === "CASH") {
      if (cashAmt < totalAfterPoints) {
        setError("შეყვანილი თანხა ნაკლებია ჯამზე.");
        return;
      }
      payments.push({ method: "CASH", amount: totalAfterPoints });
    } else if (activeMethod === "SPLIT") {
      const cash = parseFloat(splitCash) || 0;
      const card = parseFloat(splitCard) || 0;
      const sum = cash + card;
      if (Math.abs(sum - totalAfterPoints) > 0.01) {
        setError("ნაღდი + ბარათის ჯამი უნდა იყოს " + totalAfterPoints.toFixed(2) + " ₾.");
        return;
      }
      if (cash > 0) payments.push({ method: "CASH", amount: cash });
      if (card > 0)
        payments.push({
          method: "CARD",
          amount: card,
          reference: cardReference.trim() || undefined,
        });
    } else {
      payments.push({
        method: "CARD",
        amount: totalAfterPoints,
        reference: cardReference.trim() || undefined,
      });
    }

    const currentEmployee = usePosStore.getState().currentEmployee;
    const subtotal = getPosSubtotal(items);

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      const saleNumber = `OFF-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      await offlineDb.pendingSales.add({
        localId: crypto.randomUUID(),
        storeId,
        saleNumber,
        customerId: cust?.id ?? null,
        employeeId: currentEmployee?.id ?? null,
        items: items.map((i) => ({
          productId: i.productId,
          productName: i.productName,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          costPrice: i.costPrice,
        })),
        subtotal,
        discountAmount: discount,
        discountType,
        total: totalAfterPoints,
        payments: payments.map((p) => ({ method: p.method, amount: p.amount, reference: p.reference })),
        notes: undefined,
        createdAt: Date.now(),
        syncedAt: 0,
      });
      clearCart();
      onSuccess();
      onClose();
      return;
    }

    const pointsRedeemed = loyaltyConfig && cust?.loyaltyPoints && pointsToRedeem > 0
      ? Math.min(pointsToRedeem, cust.loyaltyPoints) : 0;

    setLoading(true);
    const result = await createSale({
      employeeId: currentEmployee?.id ?? undefined,
      items: items.map((i) => ({
        productId: i.productId,
        productName: i.productName,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        costPrice: i.costPrice,
      })),
      customerId: cust?.id ?? null,
      discountAmount: getPosSubtotal(items) - totalAfterPoints,
      discountType,
      payments,
      notes: undefined,
      loyaltyPointsRedeemed: pointsRedeemed > 0 ? pointsRedeemed : undefined,
    });
    setLoading(false);

    if (result.success) {
      if (printConfig?.printerConfig && printConfig.store) {
        printPosReceipt(
          {
            storeName: printConfig.store.name,
            address: printConfig.store.address,
            phone: printConfig.store.phone,
            taxId: printConfig.store.taxId,
            headerText: printConfig.receiptConfig?.headerText ?? null,
            footerText: printConfig.receiptConfig?.footerText ?? null,
            showTaxId: printConfig.receiptConfig?.showTaxId ?? false,
            showBarcode: printConfig.receiptConfig?.showBarcode ?? false,
            paperWidth: printConfig.receiptConfig?.paperWidth ?? 80,
            items: items.map((i) => ({
              productName: i.productName,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
            })),
            subtotal: getPosSubtotal(items),
            discount,
            discountType,
            total: totalAfterPoints,
          },
          printConfig.printerConfig
        ).catch(() => {});
      }
      clearCart();
      onSuccess();
      onClose();
    } else {
      setError(result.error ?? "შეცდომა");
    }
  };

  const canComplete =
    (activeMethod === "CASH" && cashAmt >= totalAfterPoints) ||
    activeMethod === "CARD" ||
    (activeMethod === "SPLIT" &&
      Math.abs((parseFloat(splitCash) || 0) + (parseFloat(splitCard) || 0) - totalAfterPoints) < 0.01);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70"
      data-pos-keypad
    >
      <div className="bg-bg-secondary rounded-2xl border border-border shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-border">
          <h2 className="text-lg font-semibold">გადახდა</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-bg-tertiary text-text-muted hover:text-text-primary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <p className="text-2xl font-bold text-copper-light text-center" suppressHydrationWarning>
            {formatCurrency(totalAfterPoints)}
          </p>
          {loyaltyConfig && cust?.loyaltyPoints && cust.loyaltyPoints >= loyaltyConfig.minRedemptionPoints && (
            <div>
              <label className="block text-sm text-text-muted mb-1">ქულებით გადახდა ({cust.loyaltyPoints} ქულა)</label>
              <input
                type="number"
                min={0}
                max={cust.loyaltyPoints}
                value={pointsToRedeem || ""}
                onChange={(e) => setPointsToRedeem(parseInt(e.target.value, 10) || 0)}
                placeholder="0"
                className="w-full rounded-lg border border-border bg-bg-tertiary px-4 py-2 text-text-primary"
              />
              {pointsToRedeem > 0 && (
                <p className="text-xs text-text-muted mt-1" suppressHydrationWarning>
                  = {formatCurrency(pointsToRedeem / loyaltyConfig.redemptionRate)} ფასდაკლება
                </p>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => setActiveMethod("CASH")}
              className={`flex-1 py-2 rounded-lg font-medium text-sm ${
                activeMethod === "CASH"
                  ? "bg-copper/30 text-copper-light border border-copper/50"
                  : "bg-bg-tertiary text-text-secondary border border-transparent"
              }`}
            >
              ნაღდი
            </button>
            <button
              onClick={() => setActiveMethod("CARD")}
              className={`flex-1 py-2 rounded-lg font-medium text-sm ${
                activeMethod === "CARD"
                  ? "bg-copper/30 text-copper-light border border-copper/50"
                  : "bg-bg-tertiary text-text-secondary border border-transparent"
              }`}
            >
              ბარათი
            </button>
            <button
              onClick={() => setActiveMethod("SPLIT")}
              className={`flex-1 py-2 rounded-lg font-medium text-sm ${
                activeMethod === "SPLIT"
                  ? "bg-copper/30 text-copper-light border border-copper/50"
                  : "bg-bg-tertiary text-text-secondary border border-transparent"
              }`}
            >
              გაყოფა
            </button>
          </div>

          {activeMethod === "CASH" && (
            <>
              <div>
                <label className="block text-sm text-text-muted mb-1">
                  მიღებული თანხა
                </label>
                <div className="text-2xl font-mono font-semibold px-4 py-3 rounded-lg bg-bg-tertiary border border-border">
                  {cashReceived || "0"} ₾
                </div>
              </div>
              {change > 0 && (
                <div className="text-center text-green-400 font-semibold" suppressHydrationWarning>
                  ხურდა: {formatCurrency(change)}
                </div>
              )}
            </>
          )}

          {activeMethod === "SPLIT" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-text-muted mb-1">ნაღდი</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={splitCash}
                    onChange={(e) => setSplitCash(e.target.value)}
                    placeholder="0"
                    className="w-full rounded-lg border border-border bg-bg-tertiary px-4 py-2.5 text-text-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm text-text-muted mb-1">ბარათი</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={splitCard}
                    onChange={(e) => setSplitCard(e.target.value)}
                    placeholder={(totalAfterPoints - (parseFloat(splitCash) || 0)).toFixed(2)}
                    className="w-full rounded-lg border border-border bg-bg-tertiary px-4 py-2.5 text-text-primary"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-text-muted mb-1">ბარათის ref (არასავალდებულო)</label>
                <input
                  type="text"
                  value={cardReference}
                  onChange={(e) => setCardReference(e.target.value)}
                  placeholder="Ref #"
                  className="w-full rounded-lg border border-border bg-bg-tertiary px-4 py-2.5 text-text-primary"
                />
              </div>
            </>
          )}

          {activeMethod === "CARD" && (
            <>
              <div>
                <label className="block text-sm text-text-muted mb-1">
                  თანხა
                </label>
                <div className="text-2xl font-mono font-semibold px-4 py-3 rounded-lg bg-bg-tertiary border border-border" suppressHydrationWarning>
                  {formatCurrency(totalAfterPoints)}
                </div>
              </div>
              <div>
                <label className="block text-sm text-text-muted mb-1">
                  ტრანზაქციის ნომერი (არასავალდებულო)
                </label>
                <input
                  type="text"
                  value={cardReference}
                  onChange={(e) => setCardReference(e.target.value)}
                  placeholder="Ref #"
                  className="w-full rounded-lg border border-border bg-bg-tertiary px-4 py-2.5 text-text-primary"
                />
              </div>
            </>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          {activeMethod === "CASH" && (
            <div className="grid grid-cols-3 gap-2" data-pos-keypad>
              {KEYPAD.map((k) => (
                <button
                  key={k}
                  onClick={() => handleKeypad(k)}
                  className="py-3 rounded-lg bg-bg-tertiary border border-border hover:bg-bg-tertiary/80 font-mono text-lg"
                >
                  {k}
                </button>
              ))}
            </div>
          )}

          <Button
            className="w-full py-4"
            onClick={handleComplete}
            disabled={loading || !canComplete}
          >
            {loading ? "იტვირთება..." : "დასრულება"}
          </Button>
        </div>
      </div>
    </div>
  );
}
