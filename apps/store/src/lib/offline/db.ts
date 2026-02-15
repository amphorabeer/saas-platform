import Dexie, { type EntityTable } from "dexie";

export interface OfflineProduct {
  id: string;
  name: string;
  nameKa?: string | null;
  sku: string;
  barcode?: string | null;
  sellingPrice: number;
  costPrice: number;
  imageUrl?: string | null;
  categoryId?: string | null;
  currentStock?: number;
  syncedAt: number;
}

export interface OfflineCategory {
  id: string;
  name: string;
  nameKa?: string | null;
  slug: string;
  syncedAt: number;
}

export interface OfflineCustomer {
  id: string;
  firstName: string;
  lastName?: string | null;
  phone?: string | null;
  email?: string | null;
  loyaltyPoints?: number;
  loyaltyTier?: string;
  syncedAt: number;
}

export interface PendingSale {
  id?: number;
  localId: string;
  storeId: string;
  saleNumber: string;
  customerId?: string | null;
  employeeId?: string | null;
  items: { productId: string; productName: string; quantity: number; unitPrice: number; costPrice: number }[];
  subtotal: number;
  discountAmount: number;
  discountType: string | null;
  total: number;
  payments: { method: string; amount: number; reference?: string }[];
  notes?: string | null;
  loyaltyPointsEarned?: number;
  loyaltyPointsRedeemed?: number;
  createdAt: number;
  syncedAt?: number;
  syncError?: string;
}

export interface PendingReturn {
  id?: number;
  localId: string;
  saleId: string;
  items: { productId: string; quantity: number; refundAmount: number }[];
  reason: string;
  refundAmount: number;
  refundMethod: string;
  createdAt: number;
  syncedAt?: number;
  syncError?: string;
}

export interface SyncLog {
  id?: number;
  type: "sync_start" | "sync_success" | "sync_error";
  message?: string;
  pendingCount?: number;
  syncedCount?: number;
  createdAt: number;
}

export class StoreOfflineDB extends Dexie {
  products!: EntityTable<OfflineProduct, "id">;
  categories!: EntityTable<OfflineCategory, "id">;
  customers!: EntityTable<OfflineCustomer, "id">;
  pendingSales!: EntityTable<PendingSale, "id">;
  pendingReturns!: EntityTable<PendingReturn, "id">;
  syncLogs!: EntityTable<SyncLog, "id">;

  constructor() {
    super("StoreOfflineDB");
    this.version(1).stores({
      products: "id, sku, barcode, categoryId, syncedAt",
      categories: "id, slug, syncedAt",
      customers: "id, phone, syncedAt",
      pendingSales: "++id, localId, storeId, createdAt, syncedAt",
      pendingReturns: "++id, localId, saleId, createdAt, syncedAt",
      syncLogs: "++id, type, createdAt",
    });
  }
}

export const offlineDb = new StoreOfflineDB();
