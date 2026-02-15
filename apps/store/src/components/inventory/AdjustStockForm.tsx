"use client";

import { useState } from "react";
import { adjustStock } from "@/lib/store-actions";
import { Button } from "@saas-platform/ui";

interface Product {
  id: string;
  name: string;
  nameKa?: string | null;
  sku: string;
  currentStock: number;
  unit: string;
}

interface AdjustStockFormProps {
  product: Product;
  onSuccess?: () => void;
}

export function AdjustStockForm({ product, onSuccess }: AdjustStockFormProps) {
  const [type, setType] = useState<"STOCK_IN" | "STOCK_OUT" | "STOCK_ADJUSTMENT">("STOCK_IN");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      setError("შეიყვანეთ სწორი რაოდენობა");
      return;
    }
    if (type === "STOCK_OUT" && qty > product.currentStock) {
      setError("გასასვლელი რაოდენობა აღემატება მარაგს");
      return;
    }
    setLoading(true);
    const result = await adjustStock({
      productId: product.id,
      type,
      quantity: type === "STOCK_ADJUSTMENT" ? qty : qty,
      reason: reason || undefined,
    });
    setLoading(false);
    if (result.success) {
      setQuantity("");
      setReason("");
      onSuccess?.();
      window.location.reload();
    } else {
      setError(result.error ?? "შეცდომა");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">ტიპი</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as "STOCK_IN" | "STOCK_OUT" | "STOCK_ADJUSTMENT")}
          className="w-full rounded-lg border border-border bg-bg-tertiary px-4 py-2 text-text-primary"
        >
          <option value="STOCK_IN">შემოსვლა</option>
          <option value="STOCK_OUT">გასვლა</option>
          <option value="STOCK_ADJUSTMENT">კორექტირება</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">
          {type === "STOCK_ADJUSTMENT" ? "ახალი მარაგი" : "რაოდენობა"}
        </label>
        <input
          type="number"
          step="0.001"
          min="0"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder={type === "STOCK_ADJUSTMENT" ? `მიმდინარე: ${product.currentStock}` : "0"}
          className="w-full rounded-lg border border-border bg-bg-tertiary px-4 py-2 text-text-primary"
        />
        <span className="text-xs text-text-muted ml-2">{product.unit}</span>
      </div>
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">მიზეზი (არჩევითი)</label>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="მაგ. შესყიდვა, დაბრუნება"
          className="w-full rounded-lg border border-border bg-bg-tertiary px-4 py-2 text-text-primary"
        />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "იტვირთება..." : "შესრულება"}
      </Button>
    </form>
  );
}
