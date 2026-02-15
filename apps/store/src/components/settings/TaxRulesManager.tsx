"use client";

import { useState } from "react";
import {
  getTaxRules,
  createTaxRule,
  updateTaxRule,
  deleteTaxRule,
} from "@/lib/store-actions";
import { Button } from "@saas-platform/ui";

interface TaxRulesManagerProps {
  initialRules: Awaited<ReturnType<typeof getTaxRules>>;
}

export function TaxRulesManager({ initialRules }: TaxRulesManagerProps) {
  const [rules, setRules] = useState(initialRules);
  const [editing, setEditing] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newRate, setNewRate] = useState("");
  const [newDefault, setNewDefault] = useState(false);
  const [newActive, setNewActive] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newRate) return;
    setLoading(true);
    const result = await createTaxRule({
      name: newName.trim(),
      rate: parseFloat(newRate) || 0,
      isDefault: newDefault,
      isActive: newActive,
    });
    setLoading(false);
    if (result.success) {
      const updated = await getTaxRules();
      setRules(updated);
      setNewName("");
      setNewRate("");
      setNewDefault(false);
      setNewActive(true);
    }
  };

  const handleUpdate = async (
    id: string,
    data: { name?: string; rate?: number; isDefault?: boolean; isActive?: boolean }
  ) => {
    setLoading(true);
    const result = await updateTaxRule(id, data);
    setLoading(false);
    if (result.success) {
      const updated = await getTaxRules();
      setRules(updated);
      setEditing(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("ნამდვილად გსურთ წაშლა?")) return;
    setLoading(true);
    await deleteTaxRule(id);
    const updated = await getTaxRules();
    setRules(updated);
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
            placeholder="მაგ. დღგ 18%"
            className="rounded-lg border border-border bg-bg-secondary px-4 py-2 text-text-primary w-40"
          />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">განაკვეთი (%)</label>
          <input
            type="number"
            step="0.01"
            value={newRate}
            onChange={(e) => setNewRate(e.target.value)}
            placeholder="18"
            className="rounded-lg border border-border bg-bg-secondary px-4 py-2 text-text-primary w-24"
          />
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={newDefault}
            onChange={(e) => setNewDefault(e.target.checked)}
            className="rounded border-border"
          />
          <span className="text-sm">ნაგულისხმევი</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={newActive}
            onChange={(e) => setNewActive(e.target.checked)}
            className="rounded border-border"
          />
          <span className="text-sm">აქტიური</span>
        </label>
        <Button type="submit" size="sm" disabled={loading}>დამატება</Button>
      </form>
      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full">
          <thead className="bg-bg-tertiary">
            <tr>
              <th className="text-left text-xs font-medium text-text-muted uppercase px-4 py-3">სახელი</th>
              <th className="text-left text-xs font-medium text-text-muted uppercase px-4 py-3">განაკვეთი</th>
              <th className="text-left text-xs font-medium text-text-muted uppercase px-4 py-3">ნაგულისხმევი</th>
              <th className="text-left text-xs font-medium text-text-muted uppercase px-4 py-3">აქტიური</th>
              <th className="w-24" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rules.map((r: { id: string; name: string; rate: number; isDefault: boolean; isActive?: boolean }) => (
              <tr key={r.id}>
                {editing === r.id ? (
                  <>
                    <td className="px-4 py-3">
                      <input
                        defaultValue={r.name}
                        id={`name-${r.id}`}
                        className="rounded border border-border bg-bg-tertiary px-2 py-1 text-text-primary w-full"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        step="0.01"
                        defaultValue={r.rate}
                        id={`rate-${r.id}`}
                        className="rounded border border-border bg-bg-tertiary px-2 py-1 text-text-primary w-20"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        defaultChecked={r.isDefault}
                        id={`def-${r.id}`}
                        className="rounded"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        defaultChecked={r.isActive !== false}
                        id={`active-${r.id}`}
                        className="rounded"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => {
                          const name = (document.getElementById(`name-${r.id}`) as HTMLInputElement)?.value;
                          const rate = parseFloat((document.getElementById(`rate-${r.id}`) as HTMLInputElement)?.value || "0");
                          const isDefault = (document.getElementById(`def-${r.id}`) as HTMLInputElement)?.checked;
                          const isActive = (document.getElementById(`active-${r.id}`) as HTMLInputElement)?.checked;
                          handleUpdate(r.id, { name, rate, isDefault, isActive });
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
                    <td className="px-4 py-3 font-medium">{r.name}</td>
                    <td className="px-4 py-3">{r.rate}%</td>
                    <td className="px-4 py-3">{r.isDefault ? "✓" : ""}</td>
                    <td className="px-4 py-3">{r.isActive !== false ? "✓" : ""}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setEditing(r.id)}
                        className="text-sm text-copper-light mr-2"
                      >
                        რედაქტირება
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(r.id)}
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
