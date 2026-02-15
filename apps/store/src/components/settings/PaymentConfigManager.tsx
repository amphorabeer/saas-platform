"use client";

import { useState } from "react";
import {
  getPaymentConfigs,
  createPaymentConfig,
  updatePaymentConfig,
  deletePaymentConfig,
} from "@/lib/store-actions";
import { Button } from "@saas-platform/ui";

type PaymentType = "CASH" | "CARD" | "BANK_TRANSFER" | "CHECK";

interface PaymentConfigManagerProps {
  initialConfigs: Awaited<ReturnType<typeof getPaymentConfigs>>;
}

const TYPE_LABELS: Record<PaymentType, string> = {
  CASH: "ნაღდი",
  CARD: "ბარათი",
  BANK_TRANSFER: "ბანკის გადარიცხვა",
  CHECK: "ჩეკი",
};

export function PaymentConfigManager({ initialConfigs }: PaymentConfigManagerProps) {
  const [configs, setConfigs] = useState(initialConfigs);
  const [editing, setEditing] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<PaymentType>("CASH");
  const [newSort, setNewSort] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setLoading(true);
    const result = await createPaymentConfig({
      name: newName.trim(),
      type: newType,
      sortOrder: newSort,
    });
    setLoading(false);
    if (result.success) {
      const updated = await getPaymentConfigs();
      setConfigs(updated);
      setNewName("");
      setNewType("CASH");
      setNewSort(configs.length);
    }
  };

  const handleUpdate = async (
    id: string,
    data: { name?: string; type?: PaymentType; sortOrder?: number; isActive?: boolean }
  ) => {
    setLoading(true);
    const result = await updatePaymentConfig(id, data);
    setLoading(false);
    if (result.success) {
      const updated = await getPaymentConfigs();
      setConfigs(updated);
      setEditing(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("ნამდვილად გსურთ წაშლა?")) return;
    setLoading(true);
    await deletePaymentConfig(id);
    const updated = await getPaymentConfigs();
    setConfigs(updated);
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleCreate} className="flex flex-wrap gap-4 items-end p-4 rounded-lg bg-bg-tertiary">
        <div>
          <label className="block text-xs text-text-muted mb-1">სახელი</label>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="მაგ. ნაღდი ფული"
            className="rounded-lg border border-border bg-bg-secondary px-4 py-2 text-text-primary w-40"
          />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">ტიპი</label>
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value as PaymentType)}
            className="rounded-lg border border-border bg-bg-secondary px-4 py-2 text-text-primary"
          >
            {(Object.keys(TYPE_LABELS) as PaymentType[]).map((t) => (
              <option key={t} value={t}>{TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">სორტირება</label>
          <input
            type="number"
            value={newSort}
            onChange={(e) => setNewSort(parseInt(e.target.value, 10) || 0)}
            className="rounded-lg border border-border bg-bg-secondary px-4 py-2 text-text-primary w-20"
          />
        </div>
        <Button type="submit" size="sm" disabled={loading}>დამატება</Button>
      </form>
      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full">
          <thead className="bg-bg-tertiary">
            <tr>
              <th className="text-left text-xs font-medium text-text-muted uppercase px-4 py-3">სახელი</th>
              <th className="text-left text-xs font-medium text-text-muted uppercase px-4 py-3">ტიპი</th>
              <th className="text-left text-xs font-medium text-text-muted uppercase px-4 py-3">აქტიური</th>
              <th className="text-left text-xs font-medium text-text-muted uppercase px-4 py-3">სორტირება</th>
              <th className="w-24" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {configs.map((c: { id: string; name: string; type: string; sortOrder: number; isActive?: boolean }) => (
              <tr key={c.id}>
                {editing === c.id ? (
                  <>
                    <td className="px-4 py-3">
                      <input
                        defaultValue={c.name}
                        id={`name-${c.id}`}
                        className="rounded border border-border bg-bg-tertiary px-2 py-1 text-text-primary w-full"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <select
                        defaultValue={c.type}
                        id={`type-${c.id}`}
                        className="rounded border border-border bg-bg-tertiary px-2 py-1 text-text-primary"
                      >
                        {(Object.keys(TYPE_LABELS) as PaymentType[]).map((t) => (
                          <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        defaultChecked={c.isActive !== false}
                        id={`active-${c.id}`}
                        className="rounded"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        defaultValue={c.sortOrder}
                        id={`sort-${c.id}`}
                        className="rounded border border-border bg-bg-tertiary px-2 py-1 text-text-primary w-20"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => {
                          const name = (document.getElementById(`name-${c.id}`) as HTMLInputElement)?.value;
                          const type = (document.getElementById(`type-${c.id}`) as HTMLSelectElement)?.value as PaymentType;
                          const sortOrder = parseInt((document.getElementById(`sort-${c.id}`) as HTMLInputElement)?.value || "0", 10);
                          const isActive = (document.getElementById(`active-${c.id}`) as HTMLInputElement)?.checked;
                          handleUpdate(c.id, { name, type, sortOrder, isActive });
                        }}
                        className="text-sm text-copper-light"
                      >
                        შენახვა
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditing(null)}
                        className="ml-2 text-sm text-text-muted"
                      >
                        გაუქმება
                      </button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3">{TYPE_LABELS[c.type as PaymentType] ?? c.type}</td>
                    <td className="px-4 py-3">{c.isActive !== false ? "✓" : ""}</td>
                    <td className="px-4 py-3">{c.sortOrder}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setEditing(c.id)}
                        className="text-sm text-copper-light mr-2"
                      >
                        რედაქტირება
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(c.id)}
                        className="text-sm text-red-400"
                      >
                        წაშლა
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
