"use client";

/**
 * POS receipt printing after sale
 */

import { printReceipt, printViaSerial, type ReceiptData, type PrinterSettings } from "./printer";

export interface PosReceiptInput {
  storeName: string;
  address?: string | null;
  phone?: string | null;
  taxId?: string | null;
  headerText?: string | null;
  footerText?: string | null;
  showTaxId?: boolean;
  showBarcode?: boolean;
  paperWidth?: number;
  items: { productName: string; quantity: number; unitPrice: number }[];
  subtotal: number;
  discount: number;
  discountType: "DISCOUNT_PERCENTAGE" | "DISCOUNT_FIXED" | null;
  total: number;
}

export interface PrinterConfig {
  connectionType: "USB" | "SERIAL" | "NETWORK";
  ip?: string;
  port?: number;
}

export async function printPosReceipt(
  input: PosReceiptInput,
  printerConfig: PrinterConfig | null
): Promise<{ success: boolean; error?: string }> {
  if (!printerConfig) return { success: false, error: "პრინტერი არ არის კონფიგურირებული" };

  const discountAmount =
    input.discountType === "DISCOUNT_PERCENTAGE"
      ? (input.subtotal * input.discount) / 100
      : input.discount;

  const data: ReceiptData = {
    storeName: input.storeName,
    address: input.address ?? undefined,
    phone: input.phone ?? undefined,
    headerText: input.headerText ?? undefined,
    footerText: input.footerText ?? "მადლობა შესაძენად!",
    items: input.items.map((i) => ({
      name: i.productName,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      total: i.quantity * i.unitPrice,
    })),
    subtotal: input.subtotal,
    discountAmount: discountAmount > 0 ? discountAmount : undefined,
    discountType: input.discountType ?? undefined,
    total: input.total,
    showTaxId: input.showTaxId ?? false,
    taxId: input.taxId ?? undefined,
    showBarcode: input.showBarcode ?? false,
    paperWidth: input.paperWidth ?? 80,
  };

  const settings: PrinterSettings = {
    connectionType: printerConfig.connectionType,
    ip: printerConfig.ip,
    port: printerConfig.port,
  };

  if (printerConfig.connectionType === "USB" || printerConfig.connectionType === "SERIAL") {
    return printViaSerial(data);
  }
  return printReceipt(data, settings);
}
