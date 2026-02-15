"use client";

import { useState } from "react";
import { sendTransferOrder, receiveTransferOrder, createTransferOrder } from "@/lib/store-actions";
import { Button } from "@saas-platform/ui";
import { Plus, Send, Package } from "lucide-react";

interface Transfer {
  id: string;
  transferNumber: string;
  status: string;
  fromStore: { name: string };
  toStore: { name: string };
  items: { product: { name: string; nameKa: string | null; sku: string }; quantity: unknown }[];
  createdAt: Date;
}

interface Store { id: string; name: string }
interface Product { id: string; name: string; sku: string; currentStock: number }

export function TransfersList({
  currentStoreId,
  transfers: initialTransfers,
  stores,
  products,
}: {
  currentStoreId: string;
  transfers: Transfer[];
  stores: Store[];
  products: Product[];
}) {
  const [transfers, setTransfers] = useState(initialTransfers);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [showNew, setShowNew] = useState(false);
  const otherStores = stores.filter((s) => s.id !== currentStoreId);
  const [newTransfer, setNewTransfer] = useState({
    fromStoreId: currentStoreId,
    toStoreId: otherStores[0]?.id ?? "",
    items: [] as { productId: string; quantity: number }[],
    notes: "",
  });

  const refresh = () => window.location.reload();

  const handleSend = async (id: string) => {
    setLoading(id);
    setError("");
    const res = await sendTransferOrder(id);
    setLoading(null);
    if (res.success) refresh();
    else setError(res.error ?? "შეცდომა");
  };

  const handleReceive = async (id: string) => {
    setLoading(id);
    setError("");
    const res = await receiveTransferOrder(id);
    setLoading(null);
    if (res.success) refresh();
    else setError(res.error ?? "შეცდომა");
  };

  const handleCreate = async () => {
    if (newTransfer.items.length === 0) {
      setError("დაამატეთ მინიმუმ ერთი პროდუქტი");
      return;
    }
    setLoading("create");
    setError("");
    const res = await createTransferOrder({
      fromStoreId: newTransfer.fromStoreId,
      toStoreId: newTransfer.toStoreId,
      items: newTransfer.items,
      notes: newTransfer.notes || undefined,
    });
    setLoading(null);
    if (res.success) {
      setShowNew(false);
      setNewTransfer({ fromStoreId: "", toStoreId: "", items: [], notes: "" });
      refresh();
    } else {
      setError(res.error ?? "შეცდომა");
    }
  };

  const addItem = () => {
    const first = products[0];
    if (first) {
      setNewTransfer((t) => ({
        ...t,
        items: [...t.items, { productId: first.id, quantity: 1 }],
      }));
    }
  };

  const updateItem = (idx: number, field: "productId" | "quantity", value: string | number) => {
    const v = field === "quantity" ? (typeof value === "number" ? value : parseInt(String(value), 10) || 1) : value;
    setNewTransfer((t) => ({
      ...t,
      items: t.items.map((it, i) => (i === idx ? { ...it, [field]: v } : it)),
    }));
  };

  const removeItem = (idx: number) => {
    setNewTransfer((t) => ({ ...t, items: t.items.filter((_, i) => i !== idx) }));
  };

  const statusLabel: Record<string, string> = {
    DRAFT: "შავი",
    SENT: "გაგზავნილი",
    RECEIVED: "მიღებული",
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-text-muted text-sm">ფილიალებს შორის მარაგის გადაცემა</p>
        <Button variant="secondary" size="sm" onClick={() => setShowNew(true)}>
          <Plus className="h-4 w-4 mr-2" />
          ახალი გადაცემა
        </Button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      {showNew && (
        <div className="rounded-xl border border-border bg-bg-secondary p-6 space-y-4">
          <h3 className="font-medium">ახალი გადაცემა</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm text-text-muted mb-1">გამომგზავნი ფილიალი</label>
              <select
                value={newTransfer.fromStoreId}
                onChange={(e) => setNewTransfer((t) => ({ ...t, fromStoreId: e.target.value }))}
                className="w-full rounded-lg border border-border bg-bg-tertiary px-4 py-2.5"
              >
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-text-muted mb-1">მიმღები ფილიალი</label>
              <select
                value={newTransfer.toStoreId}
                onChange={(e) => setNewTransfer((t) => ({ ...t, toStoreId: e.target.value }))}
                className="w-full rounded-lg border border-border bg-bg-tertiary px-4 py-2.5"
              >
                {stores.filter((s) => s.id !== newTransfer.fromStoreId).map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm text-text-muted">პროდუქტები</label>
              <Button variant="outline" size="sm" onClick={addItem}>+ დამატება</Button>
            </div>
            {newTransfer.items.map((it, idx) => (
              <div key={idx} className="flex gap-2 items-center mb-2">
                <select
                  value={it.productId}
                  onChange={(e) => updateItem(idx, "productId", e.target.value)}
                  className="flex-1 rounded border border-border bg-bg-tertiary px-2 py-1 text-sm"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.nameKa || p.name} ({p.sku})</option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  value={it.quantity}
                  onChange={(e) => updateItem(idx, "quantity", parseInt(e.target.value, 10) || 1)}
                  className="w-20 rounded border border-border bg-bg-tertiary px-2 py-1 text-sm"
                />
                <button onClick={() => removeItem(idx)} className="text-red-400 text-sm">წაშლა</button>
              </div>
            ))}
          </div>
          <div>
            <label className="block text-sm text-text-muted mb-1">შენიშვნა</label>
            <input
              type="text"
              value={newTransfer.notes}
              onChange={(e) => setNewTransfer((t) => ({ ...t, notes: e.target.value }))}
              placeholder="არასავალდებულო"
              className="w-full rounded-lg border border-border bg-bg-tertiary px-4 py-2.5"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleCreate} disabled={loading === "create" || newTransfer.items.length === 0}>
              შექმნა
            </Button>
            <Button variant="outline" onClick={() => { setShowNew(false); setError(""); }}>გაუქმება</Button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full">
          <thead className="bg-bg-tertiary">
            <tr>
              <th className="text-left text-xs font-medium text-text-muted uppercase px-4 py-3">ნომერი</th>
              <th className="text-left text-xs font-medium text-text-muted uppercase px-4 py-3">საიდან</th>
              <th className="text-left text-xs font-medium text-text-muted uppercase px-4 py-3">სად</th>
              <th className="text-left text-xs font-medium text-text-muted uppercase px-4 py-3">სტატუსი</th>
              <th className="text-left text-xs font-medium text-text-muted uppercase px-4 py-3">პროდუქტები</th>
              <th className="w-32 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {transfers.map((t) => (
              <tr key={t.id} className="hover:bg-bg-tertiary/50">
                <td className="px-4 py-3 font-mono text-sm">{t.transferNumber}</td>
                <td className="px-4 py-3">{t.fromStore.name}</td>
                <td className="px-4 py-3">{t.toStore.name}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    t.status === "DRAFT" ? "bg-amber-500/20 text-amber-400" :
                    t.status === "SENT" ? "bg-blue-500/20 text-blue-400" :
                    "bg-emerald-500/20 text-emerald-400"
                  }`}>
                    {statusLabel[t.status] ?? t.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-text-secondary">
                  {t.items.map((i, idx) => (
                    <span key={idx}>
                      {i.product.nameKa || i.product.name} × {Number(i.quantity)}
                      {idx < t.items.length - 1 ? ", " : ""}
                    </span>
                  ))}
                </td>
                <td className="px-4 py-3">
                  {t.status === "DRAFT" && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleSend(t.id)}
                      disabled={loading === t.id}
                    >
                      <Send className="h-3 w-3 mr-1" />გაგზავნა
                    </Button>
                  )}
                  {t.status === "SENT" && (
                    <Button
                      size="sm"
                      onClick={() => handleReceive(t.id)}
                      disabled={loading === t.id}
                    >
                      <Package className="h-3 w-3 mr-1" />მიღება
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {transfers.length === 0 && !showNew && (
          <div className="p-12 text-center text-text-muted flex flex-col items-center gap-2">
            <Package className="h-12 w-12 text-text-muted/50" />
            <p>გადაცემები არ მოიძებნა</p>
            <Button variant="outline" size="sm" onClick={() => setShowNew(true)}>ახალი გადაცემა</Button>
          </div>
        )}
      </div>
    </div>
  );
}
