"use client";

/**
 * Fiscal Device Interface
 * Kasa.ge API / Daisy Expert HTTP
 */

export type FiscalType = "KASA_GE" | "DAISY";

export interface FiscalSettings {
  type: FiscalType;
  apiUrl?: string;
  credentials?: Record<string, string>;
}

export interface FiscalReceiptItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
  taxRate?: number;
}

export interface FiscalReceiptRequest {
  items: FiscalReceiptItem[];
  total: number;
  paymentType?: "CASH" | "CARD";
}

export interface FiscalResult {
  success: boolean;
  fiscalNumber?: string;
  error?: string;
}

/**
 * Send receipt to fiscal device (server-side proxy required for CORS)
 */
export async function sendFiscalReceipt(
  request: FiscalReceiptRequest,
  settings: FiscalSettings
): Promise<FiscalResult> {
  if (!settings.apiUrl) {
    return { success: false, error: "API URL არ არის მითითებული" };
  }
  try {
    const res = await fetch("/api/hardware/fiscal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: settings.type,
        apiUrl: settings.apiUrl,
        credentials: settings.credentials,
        receipt: request,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: (data as { error?: string }).error ?? "ფისკალური შეცდომა" };
    }
    return { success: true, fiscalNumber: (data as { fiscalNumber?: string }).fiscalNumber };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "ფისკალური შეცდომა" };
  }
}

/**
 * Z-Report (daily closure)
 */
export async function sendFiscalZReport(settings: FiscalSettings): Promise<FiscalResult> {
  if (!settings.apiUrl) {
    return { success: false, error: "API URL არ არის მითითებული" };
  }
  try {
    const res = await fetch("/api/hardware/fiscal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: settings.type,
        apiUrl: settings.apiUrl,
        credentials: settings.credentials,
        action: "zReport",
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: (data as { error?: string }).error ?? "ფისკალური შეცდომა" };
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "ფისკალური შეცდომა" };
  }
}
