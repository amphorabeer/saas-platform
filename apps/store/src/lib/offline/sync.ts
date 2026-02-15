"use client";

import { offlineDb, type PendingSale } from "./db";

const BATCH_SIZE = 10;

export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: string[];
}

async function createSaleFromPending(pending: PendingSale): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch("/api/pos/sync-sale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        saleNumber: pending.saleNumber,
        storeId: pending.storeId,
        customerId: pending.customerId ?? null,
        employeeId: pending.employeeId ?? null,
        items: pending.items,
        subtotal: pending.subtotal,
        discountAmount: pending.discountAmount,
        discountType: pending.discountType,
        total: pending.total,
        payments: pending.payments,
        notes: pending.notes,
        loyaltyPointsEarned: pending.loyaltyPointsEarned,
        loyaltyPointsRedeemed: pending.loyaltyPointsRedeemed,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error ?? "სერვერის შეცდომა" };
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "ქსელის შეცდომა" };
  }
}

export async function syncPendingSales(): Promise<SyncResult> {
  const result: SyncResult = { success: true, synced: 0, failed: 0, errors: [] };

  const pending = await offlineDb.pendingSales
    .where("syncedAt")
    .equals(0)
    .limit(BATCH_SIZE)
    .toArray();

  if (pending.length === 0) {
    return result;
  }

  for (const p of pending) {
    const out = await createSaleFromPending(p);
    if (out.success) {
      await offlineDb.pendingSales.update(p.id!, { syncedAt: Date.now() });
      result.synced++;
    } else {
      await offlineDb.pendingSales.update(p.id!, {
        syncError: out.error,
      });
      result.failed++;
      result.errors.push(`გაყიდვა ${p.saleNumber}: ${out.error}`);
    }
  }
  result.success = result.failed === 0;
  return result;
}

export async function getPendingSalesCount(): Promise<number> {
  return offlineDb.pendingSales.where("syncedAt").equals(0).count();
}

export function setupOnlineListener(onOnline: () => void, onPendingChange?: (count: number) => void) {
  const handler = async () => {
    onOnline();
    const count = await getPendingSalesCount();
    if (count > 0) {
      const res = await syncPendingSales();
      if (onPendingChange) {
        const newCount = await getPendingSalesCount();
        onPendingChange(newCount);
      }
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("online", handler);
    return () => window.removeEventListener("online", handler);
  }
  return () => {};
}
