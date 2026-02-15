"use client";

import { useState } from "react";
import { bulkStockTake } from "@/lib/store-actions";
import { Button } from "@saas-platform/ui";

interface Product {
  id: string;
  name: string;
  nameKa?: string | null;
  sku: string;
  currentStock: number;
  unit: string;
}

interface StockTakeFormProps {
  products: Product[];
}

export function StockTakeForm({ products }: StockTakeFormProps) {
  const [rows, setRows] = useState(
    products.map((p) => ({
      productId: p.id,
      productName: p.nameKa || p.name,
      sku: p.sku,
      unit: p.unit,
      currentStock: p.currentStock,
      newStock: p.currentStock,
    }))
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleChange = (productId: string, value: string) => {
    const num = parseFloat(value);
    const v = isNaN(num) ? 0 : Math.max(0, num);
    setRows((r) =>
      r.map((row) =>
        row.productId === productId ? { ...row, newStock: v } : row
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);
    const items = rows
      .filter((r) => r.newStock !== r.currentStock)
      .map((r) => ({ productId: r.productId, newStock: r.newStock }));
    if (items.length === 0) {
      setError("ცვლილებები არ არის. შეცვალეთ მარაგის მნიშვნელობები.");
      setLoading(false);
      return;
    }
    const result = await bulkStockTake(items);
    setLoading(false);
    if (result.success) {
      setSuccess(true);
      window.location.reload();
    } else {
      setError(result.error ?? "შეცდომა");
    }
  };

  const hasChanges = rows.some((r) => r.newStock !== r.currentStock);
  const changeCount = rows.filter((r) => r.newStock !== r.currentStock).length;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-sm">
          ინვენტარიზაცია შენახულია
        </div>
      )}

      <p className="text-sm text-text-muted">
        შეიყვანეთ ფიზიკური აღრიცხვის შედეგები. შეცვლილი მნიშვნელობები ავტომატურად შეიქმნება
        კორექტირების ჩანაწერად.
      </p>

      <div className="rounded-xl border border-border bg-bg-secondary overflow-hidden">
        <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
          <table className="w-full">
            <thead className="bg-bg-tertiary sticky top-0">
              <tr>
                <th className="text-left text-xs font-medium text-text-muted uppercase px-4 py-3">
                  პროდუქტი
                </th>
                <th className="text-left text-xs font-medium text-text-muted uppercase px-4 py-3">
                  SKU
                </th>
                <th className="text-right text-xs font-medium text-text-muted uppercase px-4 py-3">
                  მიმდინარე
                </th>
                <th className="text-right text-xs font-medium text-text-muted uppercase px-4 py-3 w-32">
                  ახალი მარაგი
                </th>
                <th className="text-right text-xs font-medium text-text-muted uppercase px-4 py-3">
                  სხვაობა
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => {
                const diff = r.newStock - r.currentStock;
                return (
                  <tr key={r.productId} className="hover:bg-bg-tertiary/30">
                    <td className="px-4 py-2 font-medium">{r.productName}</td>
                    <td className="px-4 py-2 text-sm text-text-muted">{r.sku}</td>
                    <td className="px-4 py-2 text-right text-text-secondary">
                      {r.currentStock} {r.unit}
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        value={r.newStock}
                        onChange={(e) => handleChange(r.productId, e.target.value)}
                        className="w-full rounded border border-border bg-bg-tertiary px-3 py-2 text-right text-text-primary focus:outline-none focus:ring-2 focus:ring-copper/50"
                      />
                    </td>
                    <td
                      className={`px-4 py-2 text-right text-sm ${
                        diff > 0 ? "text-green-400" : diff < 0 ? "text-red-400" : "text-text-muted"
                      }`}
                    >
                      {diff > 0 ? "+" : ""}
                      {diff} {r.unit}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={loading || !hasChanges}>
          {loading ? "იტვირთება..." : `შენახვა (${changeCount} ცვლილება)`}
        </Button>
        {hasChanges && (
          <button
            type="button"
            onClick={() =>
              setRows((r) => r.map((row) => ({ ...row, newStock: row.currentStock })))
            }
            className="text-sm text-text-muted hover:text-text-primary"
          >
            გაუქმება
          </button>
        )}
      </div>
    </form>
  );
}
