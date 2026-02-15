"use client";

/**
 * Barcode Scanner Service
 * Keyboard Emulation mode (default) - global keypress listener, Enter = barcode complete
 * WebHID mode (optional)
 */

export type ScannerMode = "KEYBOARD" | "WEBHID";

export interface BarcodeScannerCallbacks {
  onBarcode: (barcode: string) => void;
  onError?: (error: string) => void;
}

const SCAN_TIMEOUT_MS = 100;
const MIN_BARCODE_LENGTH = 4;

let buffer = "";
let lastKeyTime = 0;
let listener: ((e: KeyboardEvent) => void) | null = null;

/**
 * Start global keyboard listener for barcode scanner (Keyboard Emulation mode).
 * Scanners that emulate keyboard input characters quickly; Enter ends the sequence.
 * When activeElement has data-pos-barcode-input, the form handles it — we skip.
 */
export function startBarcodeListener(callbacks: BarcodeScannerCallbacks): () => void {
  buffer = "";
  lastKeyTime = 0;

  const handleKeyDown = (e: KeyboardEvent) => {
    const active = document.activeElement;
    if (active instanceof HTMLInputElement && active.dataset.posBarcodeInput === "true") {
      return;
    }
    if (active instanceof HTMLTextAreaElement) return;

    if (e.key === "Enter") {
      const b = buffer.trim();
      buffer = "";
      if (b.length >= MIN_BARCODE_LENGTH) {
        e.preventDefault();
        callbacks.onBarcode(b);
      }
      return;
    }

    const now = Date.now();
    if (now - lastKeyTime > SCAN_TIMEOUT_MS) {
      buffer = "";
    }
    lastKeyTime = now;

    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      buffer += e.key;
    }
  };

  listener = handleKeyDown;
  window.addEventListener("keydown", handleKeyDown, { capture: true });

  return () => {
    window.removeEventListener("keydown", handleKeyDown, { capture: true });
    listener = null;
    buffer = "";
  };
}

/**
 * WebHID mode - request HID device for barcode scanner
 */
export async function connectWebHIDScanner(
  callbacks: BarcodeScannerCallbacks
): Promise<{ success: boolean; disconnect?: () => void; error?: string }> {
  if (!("hid" in navigator)) {
    return { success: false, error: "WebHID არ არის მხარდაჭერილი" };
  }
  try {
    const hid = (navigator as { hid?: { requestDevice: (opts: { filters: { usagePage: number }[] }) => Promise<HidDeviceLike[]> } }).hid;

    interface HidDeviceLike {
      open(): Promise<void>;
      addEventListener(type: string, cb: (e: { data: DataView }) => void): void;
      close(): Promise<void>;
    }
    if (!hid) return { success: false, error: "WebHID არ არის მხარდაჭერილი" };
    const deviceList = await hid.requestDevice({ filters: [{ usagePage: 0x8c }] });
    if (deviceList.length === 0) return { success: false, error: "მოწყობილობა არ აირჩევა" };
    const device = deviceList[0] as HidDeviceLike;
    await device.open();
    const decoder = new TextDecoder();

    device.addEventListener("inputreport", (e: { data: DataView }) => {
      const data = new Uint8Array(e.data.buffer);
      const str = decoder.decode(data);
      const trimmed = str.replace(/\r?\n/g, "").trim();
      if (trimmed.length >= MIN_BARCODE_LENGTH) {
        callbacks.onBarcode(trimmed);
      }
    });

    return {
      success: true,
      disconnect: () => device.close(),
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "WebHID შეცდომა",
    };
  }
}
