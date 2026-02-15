"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPurchaseOrder } from "@/lib/store-actions";
import { purchaseOrderSchema, type PurchaseOrderFormData } from "@/lib/validators";
import { Button } from "@saas-platform/ui";
import { formatCurrency } from "@/lib/format";
import { Plus, Trash2 } from "lucide-react";

interface Product {
  id: string;
  name: string;
  nameKa?: string | null;
  sku: string;
  unit: string;
}

interface PurchaseOrderFormProps {
  suppliers: { id: string; name: string }[];
  products: Product[];
}

export function PurchaseOrderForm({ suppliers, products }: PurchaseOrderFormProps) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState<Partial<PurchaseOrderFormData>>({
    supplierId: "",
    notes: "",
    expectedDate: "",
    items: [{ productId: "", quantity: 1, unitCost: 0 }],
  });

  const addItem = () => {
    setForm((f) => ({
      ...f,
      items: [...(f.items ?? []), { productId: "", quantity: 1, unitCost: 0 }],
    }));
  };

  const removeItem = (idx: number) => {
    setForm((f) => ({
      ...f,
      items: f.items?.filter((_, i) => i !== idx) ?? [],
    }));
  };

  const updateItem = (idx: number, field: string, value: string | number) => {
    setForm((f) => {
      const items = [...(f.items ?? [])];
      items[idx] = { ...items[idx], [field]: value };
      if (field === "productId" && typeof value === "string") {
        const p = products.find((x) => x.id === value);
        if (p) items[idx].unitCost = 0; // reset cost when changing product
      }
      return { ...f, items };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const data: PurchaseOrderFormData = {
      supplierId: form.supplierId ?? "",
      notes: form.notes ?? undefined,
      expectedDate: form.expectedDate || undefined,
      items: (form.items ?? []).filter((i) => i.productId && i.quantity > 0),
    };
    const parsed = purchaseOrderSchema.safeParse(data);
    if (!parsed.success) {
      const err: Record<string, string> = {};
      parsed.error.errors.forEach((z) => {
        const p = z.path.join(".");
        err[p] = z.message;
      });
      setErrors(err);
      return;
    }
    setLoading(true);
    const result = await createPurchaseOrder(parsed.data);
    setLoading(false);
    if (result.success && result.id) {
      router.push(`/purchases/${result.id}`);
    } else {
      setErrors({ form: result.error ?? "შეცდომა" });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
      {errors.form && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {errors.form}
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">
          მომწოდებელი *
        </label>
        <select
          value={form.supplierId ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, supplierId: e.target.value }))}
          className="w-full rounded-lg border border-border bg-bg-tertiary px-4 py-2.5 text-text-primary"
        >
          <option value="">-- არჩევა --</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            მოსალოდნელი თარიღი
          </label>
          <input
            type="date"
            value={form.expectedDate ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, expectedDate: e.target.value }))}
            className="w-full rounded-lg border border-border bg-bg-tertiary px-4 py-2.5 text-text-primary"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">შენიშვნა</label>
        <textarea
          value={form.notes ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          rows={2}
          className="w-full rounded-lg border border-border bg-bg-tertiary px-4 py-2.5 text-text-primary"
        />
      </div>
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm font-medium text-text-secondary">პროდუქტები *</label>
          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            <Plus className="h-4 w-4 mr-1" />
            დამატება
          </Button>
        </div>
        <div className="space-y-2">
          {(form.items ?? []).map((item, idx) => (
            <div
              key={idx}
              className="flex gap-4 items-end p-3 rounded-lg bg-bg-tertiary/50"
            >
              <div className="flex-1">
                <select
                  value={item.productId}
                  onChange={(e) => updateItem(idx, "productId", e.target.value)}
                  className="w-full rounded border border-border bg-bg-tertiary px-3 py-2 text-text-primary"
                >
                  <option value="">-- პროდუქტი --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nameKa || p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-24">
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={item.quantity}
                  onChange={(e) =>
                    updateItem(idx, "quantity", parseFloat(e.target.value) || 0)
                  }
                  className="w-full rounded border border-border bg-bg-tertiary px-3 py-2 text-text-primary"
                />
              </div>
              <div className="w-28">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={item.unitCost}
                  onChange={(e) =>
                    updateItem(idx, "unitCost", parseFloat(e.target.value) || 0)
                  }
                  className="w-full rounded border border-border bg-bg-tertiary px-3 py-2 text-text-primary"
                  placeholder="ღირებულება"
                />
              </div>
              <div className="w-24 text-right text-sm text-text-muted" suppressHydrationWarning>
                {formatCurrency(item.quantity * item.unitCost)}
              </div>
              <button
                type="button"
                onClick={() => removeItem(idx)}
                className="p-2 text-red-400 hover:bg-red-500/10 rounded"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-4">
        <Button type="submit" disabled={loading}>
          {loading ? "იტვირთება..." : "შეკვეთის შექმნა"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          გაუქმება
        </Button>
      </div>
    </form>
  );
}
