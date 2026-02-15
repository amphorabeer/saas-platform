"use client";

import { useState } from "react";
import { receivePurchaseOrder } from "@/lib/store-actions";
import { Button } from "@saas-platform/ui";

interface Item {
  id: string;
  productId: string;
  quantity: number;
  receivedQty: number;
  unitCost: number;
  product: { name: string; nameKa?: string | null; sku: string; unit: string };
}

interface ReceiveGoodsFormProps {
  orderId: string;
  orderNumber: string;
  items: Item[];
  canReceive: boolean;
}

export function ReceiveGoodsForm({
  orderId,
  orderNumber,
  items,
  canReceive,
}: ReceiveGoodsFormProps) {
  const [received, setReceived] = useState<Record<string, number>>(
    items.reduce((acc, i) => ({ ...acc, [i.id]: 0 }), {})
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!canReceive) {
    return (
      <p className="text-sm text-text-muted">
        ყველა პროდუქტი უკვე მიღებულია ან შეკვეთა გაუქმებულია.
      </p>
    );
  }

  const handleChange = (itemId: string, value: number) => {
    setReceived((r) => ({ ...r, [itemId]: Math.max(0, value) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const toReceive = Object.entries(received)
      .filter(([, qty]) => qty > 0)
      .map(([itemId, receivedQty]) => ({ itemId, receivedQty }));
    if (toReceive.length === 0) {
      setError("შეიყვანეთ მიღებული რაოდენობა მინიმუმ ერთ პროდუქტზე");
      return;
    }
    setLoading(true);
    const result = await receivePurchaseOrder(orderId, toReceive);
    setLoading(false);
    if (result.success) {
      window.location.reload();
    } else {
      setError(result.error ?? "შეცდომა");
    }
  };

  const hasInput = Object.values(received).some((v) => v > 0);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}
      <p className="text-sm text-text-muted">
        შეიყვანეთ მიღებული რაოდენობა თითოეული პროდუქტისთვის. მარაგი განახლდება ავტომატურად.
      </p>
      <div className="rounded-xl border border-border bg-bg-secondary overflow-hidden">
        <table className="w-full">
          <thead className="bg-bg-tertiary">
            <tr>
              <th className="text-left text-xs font-medium text-text-muted uppercase px-4 py-3">
                პროდუქტი
              </th>
              <th className="text-right text-xs font-medium text-text-muted uppercase px-4 py-3">
                შეკვეთილი
              </th>
              <th className="text-right text-xs font-medium text-text-muted uppercase px-4 py-3">
                უკვე მიღებული
              </th>
              <th className="text-right text-xs font-medium text-text-muted uppercase px-4 py-3 w-40">
                მიღება
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((item) => {
              const pending = item.quantity - item.receivedQty;
              return (
                <tr key={item.id} className="hover:bg-bg-tertiary/30">
                  <td className="px-4 py-3">
                    {item.product.nameKa || item.product.name}
                    <span className="ml-2 text-xs text-text-muted">{item.product.sku}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {item.quantity} {item.product.unit}
                  </td>
                  <td className="px-4 py-3 text-right text-text-muted">
                    {item.receivedQty} {item.product.unit}
                  </td>
                  <td className="px-4 py-3">
                    {pending > 0 ? (
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        max={pending}
                        value={received[item.id] ?? 0}
                        onChange={(e) =>
                          handleChange(item.id, parseFloat(e.target.value) || 0)
                        }
                        placeholder={`მაქს ${pending}`}
                        className="w-full rounded border border-border bg-bg-tertiary px-3 py-2 text-right text-text-primary"
                      />
                    ) : (
                      <span className="text-green-400 text-sm">✓ მიღებული</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Button type="submit" disabled={loading || !hasInput}>
        {loading ? "იტვირთება..." : "მიღების დადასტურება"}
      </Button>
    </form>
  );
}
