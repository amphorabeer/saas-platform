"use client";

/**
 * ESC/POS Receipt Printer Service
 * WebUSB + WebSerial + Network fallback
 * Supported: Epson, Bixolon, Star, SPRT, Rongta, Xprinter, GPrinter
 */

import { ESCPOS, centerText, line } from "./escpos";

export interface ReceiptData {
  storeName: string;
  address?: string;
  phone?: string;
  headerText?: string;
  items: { name: string; quantity: number; unitPrice: number; total: number }[];
  subtotal: number;
  discountAmount?: number;
  discountType?: "DISCOUNT_PERCENTAGE" | "DISCOUNT_FIXED" | null;
  taxAmount?: number;
  total: number;
  footerText?: string;
  showTaxId?: boolean;
  taxId?: string;
  showBarcode?: boolean;
  barcode?: string;
  paperWidth?: number; // 58 or 80
}

export interface PrinterSettings {
  connectionType: "USB" | "SERIAL" | "NETWORK";
  ip?: string;
  port?: number;
}

const CHARS_58 = 32;
const CHARS_80 = 48;

function getChars(paperWidth: number): number {
  return paperWidth <= 58 ? CHARS_58 : CHARS_80;
}

function buildReceiptBuffer(data: ReceiptData): Uint8Array {
  const chars = getChars(data.paperWidth ?? 80);
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];

  const push = (s: string) => parts.push(enc.encode(s));

  push(ESCPOS.INIT);
  push(ESCPOS.ALIGN_CENTER);
  if (data.storeName) push(ESCPOS.DOUBLE_HEIGHT_ON + data.storeName + "\n" + ESCPOS.DOUBLE_HEIGHT_OFF);
  if (data.address) push(data.address + "\n");
  if (data.phone) push(data.phone + "\n");
  if (data.headerText) push(data.headerText + "\n");
  push(ESCPOS.ALIGN_LEFT);
  push(line("-", chars) + "\n");

  for (const item of data.items) {
    const name = item.name.slice(0, chars - 12);
    const right = `${item.quantity}×${item.unitPrice.toFixed(2)}=${item.total.toFixed(2)}`;
    const spaces = chars - name.length - right.length;
    push(name + (spaces > 0 ? " ".repeat(spaces) : " ") + right + "\n");
  }

  push(line("-", chars) + "\n");
  const subLine = "წინასწარი ჯამი:" + " ".repeat(chars - 16) + data.subtotal.toFixed(2);
  push(subLine + "\n");

  if ((data.discountAmount ?? 0) > 0) {
    const disc = data.discountType === "DISCOUNT_PERCENTAGE"
      ? `-${data.discountAmount}%`
      : `-${data.discountAmount!.toFixed(2)}`;
    push("ფასდაკლება:" + " ".repeat(chars - 12 - disc.length) + disc + "\n");
  }
  if ((data.taxAmount ?? 0) > 0) {
    push("დღგ:" + " ".repeat(chars - 8) + data.taxAmount!.toFixed(2) + "\n");
  }
  push(ESCPOS.BOLD_ON);
  push("ჯამი:" + " ".repeat(chars - 8) + data.total.toFixed(2) + "\n");
  push(ESCPOS.BOLD_OFF);

  if (data.showTaxId && data.taxId) push("\nსაგადასახადო ID: " + data.taxId + "\n");
  if (data.showBarcode && data.barcode) push("\n" + centerText(data.barcode, chars) + "\n");

  push("\n");
  if (data.footerText) push(centerText(data.footerText, chars) + "\n");
  push(centerText(new Date().toLocaleString("ka-GE"), chars) + "\n");
  push(ESCPOS.FEED(3));
  push(ESCPOS.CUT);

  const totalLen = parts.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(totalLen);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

/** Network printing via raw socket (browser cannot do raw TCP; use server-side or local agent) */
export async function printViaNetwork(
  data: ReceiptData,
  settings: { ip: string; port?: number }
): Promise<{ success: boolean; error?: string }> {
  try {
    const buffer = buildReceiptBuffer(data);
    const port = settings.port ?? 9100;
    const res = await fetch(`/api/hardware/print`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "network",
        ip: settings.ip,
        port,
        data: Array.from(buffer),
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: (err as { error?: string }).error ?? res.statusText };
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "ბეჭდვის შეცდომა" };
  }
}

/** Web Serial API - for USB/Serial connected printers */
export async function printViaSerial(
  data: ReceiptData
): Promise<{ success: boolean; error?: string }> {
  if (!("serial" in navigator)) {
    return { success: false, error: "Web Serial API არ არის მხარდაჭერილი" };
  }
  try {
    type SerialNav = { serial?: { requestPort: () => Promise<SerialPortLike> } };
    type SerialPortLike = { open: (o: object) => Promise<void>; writable?: { getWriter: () => { write: (d: Uint8Array) => Promise<void>; releaseLock: () => void } }; close: () => Promise<void> };
    const serial = (navigator as SerialNav).serial;
    if (!serial) return { success: false, error: "Web Serial API არ არის მხარდაჭერილი" };
    const port = await serial.requestPort();
    await port.open({ baudRate: 9600 });
    const buffer = buildReceiptBuffer(data);
    const writer = port.writable?.getWriter();
    if (!writer) {
      await port.close();
      return { success: false, error: "ჩაწერა ვერ მოხერხდა" };
    }
    await writer.write(buffer);
    writer.releaseLock();
    await port.close();
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "სერიალის შეცდომა" };
  }
}

/** Main print function - uses settings to choose connection type */
export async function printReceipt(
  data: ReceiptData,
  settings: PrinterSettings
): Promise<{ success: boolean; error?: string }> {
  if (settings.connectionType === "NETWORK" && settings.ip) {
    return printViaNetwork(data, { ip: settings.ip, port: settings.port });
  }
  if (settings.connectionType === "USB" || settings.connectionType === "SERIAL") {
    return printViaSerial(data);
  }
  return { success: false, error: "პრინტერის კონფიგურაცია არასრულია" };
}
