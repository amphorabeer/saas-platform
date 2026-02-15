"use client";

import { useState } from "react";
import { getReceiptConfig, upsertReceiptConfig } from "@/lib/store-actions";
import { Button } from "@saas-platform/ui";

interface ReceiptConfigFormProps {
  config: Awaited<ReturnType<typeof getReceiptConfig>>;
}

export function ReceiptConfigForm({ config }: ReceiptConfigFormProps) {
  const [form, setForm] = useState({
    headerText: config?.headerText ?? "",
    footerText: config?.footerText ?? "",
    showLogo: config?.showLogo ?? true,
    showTaxId: config?.showTaxId ?? true,
    showBarcode: config?.showBarcode ?? false,
    paperWidth: config?.paperWidth ?? 80,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);
    const result = await upsertReceiptConfig({
      headerText: form.headerText || null,
      footerText: form.footerText || null,
      showLogo: form.showLogo,
      showTaxId: form.showTaxId,
      showBarcode: form.showBarcode,
      paperWidth: form.paperWidth,
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
        <label className="block text-sm font-medium text-text-secondary mb-1">ჰედერის ტექსტი</label>
        <textarea
          value={form.headerText}
          onChange={(e) => setForm((f) => ({ ...f, headerText: e.target.value }))}
          rows={3}
          placeholder="მაგ. მადლობა შესაძენად!"
          className="w-full rounded-lg border border-border bg-bg-tertiary px-4 py-2.5 text-text-primary"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">ფუტერის ტექსტი</label>
        <textarea
          value={form.footerText}
          onChange={(e) => setForm((f) => ({ ...f, footerText: e.target.value }))}
          rows={3}
          placeholder="მაგ. იხილეთ ხელახლა!"
          className="w-full rounded-lg border border-border bg-bg-tertiary px-4 py-2.5 text-text-primary"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">ქაღალდის სიგანე (მმ)</label>
        <select
          value={form.paperWidth}
          onChange={(e) => setForm((f) => ({ ...f, paperWidth: parseInt(e.target.value, 10) }))}
          className="w-full rounded-lg border border-border bg-bg-tertiary px-4 py-2.5 text-text-primary"
        >
          <option value={58}>58 მმ</option>
          <option value={80}>80 მმ</option>
        </select>
      </div>
      <div className="space-y-3">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.showLogo}
            onChange={(e) => setForm((f) => ({ ...f, showLogo: e.target.checked }))}
            className="rounded border-border"
          />
          <span className="text-sm">ლოგოს ჩვენება</span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.showTaxId}
            onChange={(e) => setForm((f) => ({ ...f, showTaxId: e.target.checked }))}
            className="rounded border-border"
          />
          <span className="text-sm">საგადასახადო ID-ის ჩვენება</span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.showBarcode}
            onChange={(e) => setForm((f) => ({ ...f, showBarcode: e.target.checked }))}
            className="rounded border-border"
          />
          <span className="text-sm">ბარკოდის ჩვენება</span>
        </label>
      </div>
      <Button type="submit" disabled={loading}>{loading ? "იტვირთება..." : "შენახვა"}</Button>
    </form>
  );
}
