"use client";

import { useState } from "react";
import { getStoreSettings, updateStoreSettings } from "@/lib/store-actions";
import { Button } from "@saas-platform/ui";

interface StoreSettingsFormProps {
  store: NonNullable<Awaited<ReturnType<typeof getStoreSettings>>>;
}

const CURRENCIES = ["GEL", "USD", "EUR"];

export function StoreSettingsForm({ store }: StoreSettingsFormProps) {
  const [form, setForm] = useState({
    name: store.name,
    currency: store.currency,
    address: store.address ?? "",
    phone: store.phone ?? "",
    email: store.email ?? "",
    taxId: store.taxId ?? "",
    timezone: store.timezone,
    logoUrl: store.logoUrl ?? "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);
    const result = await updateStoreSettings(store.id, {
      name: form.name,
      currency: form.currency,
      address: form.address || undefined,
      phone: form.phone || undefined,
      email: form.email || undefined,
      taxId: form.taxId || undefined,
      timezone: form.timezone,
      logoUrl: form.logoUrl || null,
    });
    setLoading(false);
    if (result.success) {
      setSuccess(true);
    } else {
      setError(result.error ?? "შეცდომა");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-sm">
          შენახულია
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">სახელი *</label>
        <input
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className="w-full rounded-lg border border-border bg-bg-tertiary px-4 py-2.5 text-text-primary"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">ვალუტა</label>
        <select
          value={form.currency}
          onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
          className="w-full rounded-lg border border-border bg-bg-tertiary px-4 py-2.5 text-text-primary"
        >
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">ლოგოს URL</label>
        <input
          type="url"
          value={form.logoUrl}
          onChange={(e) => setForm((f) => ({ ...f, logoUrl: e.target.value }))}
          placeholder="https://..."
          className="w-full rounded-lg border border-border bg-bg-tertiary px-4 py-2.5 text-text-primary"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">მისამართი</label>
        <input
          value={form.address}
          onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
          className="w-full rounded-lg border border-border bg-bg-tertiary px-4 py-2.5 text-text-primary"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">ტელეფონი</label>
          <input
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            className="w-full rounded-lg border border-border bg-bg-tertiary px-4 py-2.5 text-text-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className="w-full rounded-lg border border-border bg-bg-tertiary px-4 py-2.5 text-text-primary"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">საგადასახადო ID</label>
        <input
          value={form.taxId}
          onChange={(e) => setForm((f) => ({ ...f, taxId: e.target.value }))}
          className="w-full rounded-lg border border-border bg-bg-tertiary px-4 py-2.5 text-text-primary"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">დროის ზონა</label>
        <input
          value={form.timezone}
          onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
          className="w-full rounded-lg border border-border bg-bg-tertiary px-4 py-2.5 text-text-primary"
        />
      </div>
      <Button type="submit" disabled={loading}>{loading ? "იტვირთება..." : "შენახვა"}</Button>
    </form>
  );
}
