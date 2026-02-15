"use client";

import { useState, useEffect } from "react";
import { upsertLoyaltyConfig } from "@/lib/store-actions";
import { Button } from "@saas-platform/ui";

interface LoyaltyConfig {
  id: string;
  pointsPerGel: number;
  redemptionRate: number;
  minRedemptionPoints: number;
  expirationDays: number | null;
  goldDiscountPercent: unknown;
  platinumDiscountPercent: unknown;
}

interface LoyaltyConfigFormProps {
  config: LoyaltyConfig | null;
}

export function LoyaltyConfigForm({ config }: LoyaltyConfigFormProps) {
  const [form, setForm] = useState({
    pointsPerGel: 1,
    redemptionRate: 100,
    minRedemptionPoints: 100,
    expirationDays: "" as string | number,
    goldDiscountPercent: "" as string | number,
    platinumDiscountPercent: "" as string | number,
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (config) {
      setForm({
        pointsPerGel: config.pointsPerGel ?? 1,
        redemptionRate: config.redemptionRate ?? 100,
        minRedemptionPoints: config.minRedemptionPoints ?? 100,
        expirationDays: config.expirationDays ?? "",
        goldDiscountPercent: config.goldDiscountPercent ?? "",
        platinumDiscountPercent: config.platinumDiscountPercent ?? "",
      });
    }
  }, [config]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    const res = await upsertLoyaltyConfig({
      pointsPerGel: Number(form.pointsPerGel) || 1,
      redemptionRate: Number(form.redemptionRate) || 100,
      minRedemptionPoints: Number(form.minRedemptionPoints) || 100,
      expirationDays: form.expirationDays ? Number(form.expirationDays) : undefined,
      goldDiscountPercent: form.goldDiscountPercent ? Number(form.goldDiscountPercent) : undefined,
      platinumDiscountPercent: form.platinumDiscountPercent ? Number(form.platinumDiscountPercent) : undefined,
    });
    setLoading(false);
    if (res.success) setSuccess(true);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <div className="rounded-xl border border-border bg-bg-secondary p-6 space-y-6">
        <h3 className="font-medium">ქულების პარამეტრები</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm text-text-muted mb-1">ქულა ყოველ ლარზე</label>
            <input
              type="number"
              min={1}
              value={form.pointsPerGel}
              onChange={(e) => setForm((f) => ({ ...f, pointsPerGel: e.target.value }))}
              className="w-full rounded-lg border border-border bg-bg-tertiary px-4 py-2.5"
            />
            <p className="text-xs text-text-muted mt-1">1 ლარი = X ქულა</p>
          </div>
          <div>
            <label className="block text-sm text-text-muted mb-1">ქულა → 1 ლარი</label>
            <input
              type="number"
              min={1}
              value={form.redemptionRate}
              onChange={(e) => setForm((f) => ({ ...f, redemptionRate: e.target.value }))}
              className="w-full rounded-lg border border-border bg-bg-tertiary px-4 py-2.5"
            />
            <p className="text-xs text-text-muted mt-1">X ქულა = 1 ლარი ფასდაკლება</p>
          </div>
          <div>
            <label className="block text-sm text-text-muted mb-1">მინ. ქულა გამოსაყენებლად</label>
            <input
              type="number"
              min={0}
              value={form.minRedemptionPoints}
              onChange={(e) => setForm((f) => ({ ...f, minRedemptionPoints: e.target.value }))}
              className="w-full rounded-lg border border-border bg-bg-tertiary px-4 py-2.5"
            />
          </div>
          <div>
            <label className="block text-sm text-text-muted mb-1">ქულის ვადა (დღეები)</label>
            <input
              type="number"
              min={0}
              placeholder="შეზღუდვის გარეშე"
              value={form.expirationDays}
              onChange={(e) => setForm((f) => ({ ...f, expirationDays: e.target.value }))}
              className="w-full rounded-lg border border-border bg-bg-tertiary px-4 py-2.5"
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-bg-secondary p-6 space-y-6">
        <h3 className="font-medium">ტიერის ფასდაკლებები</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm text-text-muted mb-1">GOLD ფასდაკლება (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              step={0.5}
              placeholder="5"
              value={form.goldDiscountPercent}
              onChange={(e) => setForm((f) => ({ ...f, goldDiscountPercent: e.target.value }))}
              className="w-full rounded-lg border border-border bg-bg-tertiary px-4 py-2.5"
            />
          </div>
          <div>
            <label className="block text-sm text-text-muted mb-1">PLATINUM ფასდაკლება (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              step={0.5}
              placeholder="10"
              value={form.platinumDiscountPercent}
              onChange={(e) => setForm((f) => ({ ...f, platinumDiscountPercent: e.target.value }))}
              className="w-full rounded-lg border border-border bg-bg-tertiary px-4 py-2.5"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <Button type="submit" disabled={loading}>
          {loading ? "იგზავნება..." : "შენახვა"}
        </Button>
        {success && (
          <span className="text-emerald-400 text-sm py-2">შენახულია</span>
        )}
      </div>
    </form>
  );
}
