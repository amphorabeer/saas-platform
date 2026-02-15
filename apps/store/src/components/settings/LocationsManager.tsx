"use client";

import { useState } from "react";
import { createStore, updateStore, getStores } from "@/lib/store-actions";
import { Button } from "@saas-platform/ui";
import { Plus, Pencil, MapPin } from "lucide-react";

interface StoreRow {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  slug: string;
}

interface LocationsManagerProps {
  stores: StoreRow[];
}

export function LocationsManager({ stores: initialStores }: LocationsManagerProps) {
  const [stores, setStores] = useState(initialStores);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: "", address: "", phone: "", email: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refresh = async () => {
    const list = await getStores();
    setStores(list);
  };

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    setLoading(true);
    setError("");
    const res = await createStore({
      name: form.name.trim(),
      address: form.address.trim() || undefined,
      phone: form.phone.trim() || undefined,
      email: form.email.trim() || undefined,
    });
    setLoading(false);
    if (res.success) {
      setShowNew(false);
      setForm({ name: "", address: "", phone: "", email: "" });
      refresh();
    } else {
      setError(res.error ?? "შეცდომა");
    }
  };

  const handleUpdate = async (id: string, data: { name?: string; address?: string; phone?: string }) => {
    setLoading(true);
    setError("");
    const res = await updateStore(id, data);
    setLoading(false);
    if (res.success) {
      setEditingId(null);
      refresh();
    } else {
      setError(res.error ?? "შეცდომა");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-text-muted text-sm">
          ფილიალების მართვა — თქვენი ტენანტის ყველა მაღაზია
        </p>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowNew(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          ახალი ფილიალი
        </Button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      {showNew && (
        <div className="rounded-xl border border-border bg-bg-secondary p-6 space-y-4">
          <h3 className="font-medium">ახალი ფილიალი</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm text-text-muted mb-1">სახელი *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="მაღაზია ცენტრალური"
                className="w-full rounded-lg border border-border bg-bg-tertiary px-4 py-2.5 text-text-primary"
              />
            </div>
            <div>
              <label className="block text-sm text-text-muted mb-1">მისამართი</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="რუსთაველი 1"
                className="w-full rounded-lg border border-border bg-bg-tertiary px-4 py-2.5 text-text-primary"
              />
            </div>
            <div>
              <label className="block text-sm text-text-muted mb-1">ტელეფონი</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+995 555 123 456"
                className="w-full rounded-lg border border-border bg-bg-tertiary px-4 py-2.5 text-text-primary"
              />
            </div>
            <div>
              <label className="block text-sm text-text-muted mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="info@example.com"
                className="w-full rounded-lg border border-border bg-bg-tertiary px-4 py-2.5 text-text-primary"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleCreate} disabled={loading || !form.name.trim()}>
              შექმნა
            </Button>
            <Button variant="outline" onClick={() => { setShowNew(false); setError(""); }}>
              გაუქმება
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full">
          <thead className="bg-bg-tertiary">
            <tr>
              <th className="text-left text-xs font-medium text-text-muted uppercase px-4 py-3">სახელი</th>
              <th className="text-left text-xs font-medium text-text-muted uppercase px-4 py-3">მისამართი</th>
              <th className="text-left text-xs font-medium text-text-muted uppercase px-4 py-3">ტელეფონი</th>
              <th className="w-24 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {stores.map((s) => (
              <tr key={s.id} className="hover:bg-bg-tertiary/50">
                <td className="px-4 py-3">
                  {editingId === s.id ? (
                    <input
                      type="text"
                      defaultValue={s.name}
                      id={`edit-name-${s.id}`}
                      className="w-full rounded border border-border bg-bg-tertiary px-2 py-1 text-sm"
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-text-muted shrink-0" />
                      {s.name}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-text-secondary">
                  {editingId === s.id ? (
                    <input
                      type="text"
                      defaultValue={s.address ?? ""}
                      id={`edit-addr-${s.id}`}
                      className="w-full rounded border border-border bg-bg-tertiary px-2 py-1 text-sm"
                    />
                  ) : (
                    s.address ?? "—"
                  )}
                </td>
                <td className="px-4 py-3 text-text-secondary">
                  {editingId === s.id ? (
                    <input
                      type="text"
                      defaultValue={s.phone ?? ""}
                      id={`edit-phone-${s.id}`}
                      className="w-full rounded border border-border bg-bg-tertiary px-2 py-1 text-sm"
                    />
                  ) : (
                    s.phone ?? "—"
                  )}
                </td>
                <td className="px-4 py-3">
                  {editingId === s.id ? (
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          const name = (document.getElementById(`edit-name-${s.id}`) as HTMLInputElement)?.value;
                          const address = (document.getElementById(`edit-addr-${s.id}`) as HTMLInputElement)?.value;
                          const phone = (document.getElementById(`edit-phone-${s.id}`) as HTMLInputElement)?.value;
                          handleUpdate(s.id, { name, address, phone });
                        }}
                        className="text-sm text-copper-light hover:underline"
                      >
                        შენახვა
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-sm text-text-muted hover:underline"
                      >
                        გაუქმება
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setEditingId(s.id)}
                      className="p-2 rounded-lg hover:bg-bg-tertiary text-text-muted hover:text-text-primary"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {stores.length === 0 && !showNew && (
          <div className="p-12 text-center text-text-muted">
            ფილიალი არ მოიძებნა. დაამატეთ პირველი ფილიალი.
          </div>
        )}
      </div>
    </div>
  );
}
