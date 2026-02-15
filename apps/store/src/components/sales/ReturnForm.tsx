"use client";

import { useState } from "react";
import { createReturn } from "@/lib/store-actions";
import { Button } from "@saas-platform/ui";
import { formatCurrency } from "@/lib/format";

const PAYMENT_OPTIONS = [
  { value: "CASH", label: "ნაღდი" },
  { value: "CARD", label: "ბარათი" },
  { value: "BANK_TRANSFER", label: "ბანკის გადარიცხვა" },
  { value: "CHECK", label: "ჩეკი" },
] as const;

interface SaleItemForReturn {
  id: string;
  productId: string;
  productName: string;
  nameKa?: string | null;
  quantity: number;
  remaining: number;
  unitPrice: number;
  total: number;
}

interface ReturnFormProps {
  saleId: string;
  saleNumber: string;
  items: SaleItemForReturn[];
  canReturn: boolean;
}

export function ReturnForm({
  saleId,
  saleNumber,
  items,
  canReturn,
}: ReturnFormProps) {
  const [reason, setReason] = useState("");
  const [refundMethod, setRefundMethod] = useState<"CASH" | "CARD" | "BANK_TRANSFER" | "CHECK">("CASH");
  const [quantities, setQuantities] = useState<Record<string, number>>(
    items.reduce((acc, i) => ({ ...acc, [i.productId]: 0 }), {})
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!canReturn) {
    return (
      <p className="text-sm text-text-muted">
        დაბრუნება შეუძლებელია (გაყიდვა გაუქმებულია ან სრულად დაბრუნებულია).
      </p>
    );
  }

  const handleQtyChange = (productId: string, qty: number) => {
    setQuantities((q) => ({ ...q, [productId]: Math.max(0, qty) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const returnItems = items
      .filter((i) => (quantities[i.productId] ?? 0) > 0)
      .map((i) => {
        const qty = quantities[i.productId] ?? 0;
        const refundPerUnit = i.quantity > 0 ? i.total / i.quantity : 0;
        return {
          productId: i.productId,
          quantity: qty,
          refundAmount: Math.round(refundPerUnit * qty * 100) / 100,
        };
      });

    if (returnItems.length === 0) {
      setError("აირჩიეთ მინიმუმ ერთი პროდუქტი დასაბრუნებლად.");
      return;
    }
    if (!reason.trim()) {
      setError("მიზეზი სავალდებულოა.");
      return;
    }

    setLoading(true);
    const result = await createReturn({
      saleId,
      reason: reason.trim(),
      refundMethod,
      items: returnItems,
    });
    setLoading(false);

    if (result.success) {
      window.location.reload();
    } else {
      setError(result.error ?? "შეცდომა");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}
      <h3 className="text-sm font-medium text-text-secondary">
        ახალი დაბრუნება — {saleNumber}
      </h3>
      <div>
        <label className="block text-sm text-text-muted mb-1">მიზეზი *</label>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="მაგ. დეფექტი, მომხმარებლის მოთხოვნა..."
          className="w-full rounded-lg border border-border bg-bg-tertiary px-4 py-2.5 text-text-primary"
        />
      </div>
      <div>
        <label className="block text-sm text-text-muted mb-1">დაბრუნების მეთოდი</label>
        <select
          value={refundMethod}
          onChange={(e) =>
            setRefundMethod(e.target.value as "CASH" | "CARD" | "BANK_TRANSFER" | "CHECK")
          }
          className="w-full rounded-lg border border-border bg-bg-tertiary px-4 py-2.5 text-text-primary"
        >
          {PAYMENT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full">
          <thead className="bg-bg-tertiary">
            <tr>
              <th className="text-left text-xs font-medium text-text-muted uppercase px-4 py-3">
                პროდუქტი
              </th>
              <th className="text-right text-xs font-medium text-text-muted uppercase px-4 py-3">
                გაყიდული
              </th>
              <th className="text-right text-xs font-medium text-text-muted uppercase px-4 py-3 w-28">
                დასაბრუნებელი
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3">
                  {item.nameKa || item.productName}
                </td>
                <td className="px-4 py-3 text-right" suppressHydrationWarning>
                  {item.remaining} / {item.quantity} — {formatCurrency(item.total)}
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    min="0"
                    max={item.remaining}
                    step="1"
                    value={quantities[item.productId] ?? 0}
                    onChange={(e) =>
                      handleQtyChange(item.productId, parseInt(e.target.value, 10) || 0)
                    }
                    className="w-full rounded border border-border bg-bg-tertiary px-3 py-2 text-right text-text-primary"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "იტვირთება..." : "დაბრუნების დადასტურება"}
      </Button>
    </form>
  );
}
